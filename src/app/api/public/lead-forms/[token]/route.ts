import { NextRequest, NextResponse } from "next/server";
import { leadIntakeFetch } from "@/lib/public/intake-client";
import { allow, clientAddress } from "@/lib/public/rate-limit";
import { messages } from "@/lib/messages";

/** CD-269 — at most this many registrations per address per window. */
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * CD-269 — a campaign's public lead form posts here; this forwards with the
 * server-side lead intake key, so the key never reaches the page. Same guards
 * as the CD-66 form: a rate limit per address, and the hidden `website`
 * field — a bot that fills it is answered as if it worked, and nothing is made.
 * Only the Lead's own fields are passed on; the campaign comes from the token.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const m = messages.leadForm;
  const { token } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { code: "VALIDATION_FAILED", message: m.required },
      { status: 400 },
    );
  }
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ received: true }, { status: 202 });
  }
  if (!allow(`lead:${clientAddress(request.headers)}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { code: "TOO_MANY_REQUESTS", message: m.tooMany },
      { status: 429 },
    );
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { code: "VALIDATION_FAILED", message: m.consentRequired },
      { status: 400 },
    );
  }
  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim()
      ? value.trim().slice(0, max)
      : undefined;
  const need = text(body.need, 1500);
  const result = await leadIntakeFetch<{
    received: boolean;
    status?: string;
    online_url?: string | null;
  }>(`forms/${encodeURIComponent(token)}`, {
    method: "POST",
    body: {
      name: text(body.company, 255) ?? text(body.contact_name, 255) ?? "",
      contact_name: text(body.contact_name, 255),
      contact_position: text(body.position, 255),
      phone: text(body.phone, 50),
      email: text(body.email, 255),
      note: [need, m.consentNote(new Date().toISOString())]
        .filter(Boolean)
        .join("\n\n"),
    },
  });
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.status },
    );
  }
  // CD-270 — an event says whether they got a seat (and the online link if so)
  return NextResponse.json({
    received: true,
    status: result.data.status ?? null,
    online_url: result.data.online_url ?? null,
  });
}
