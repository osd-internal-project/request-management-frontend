import { NextRequest, NextResponse } from "next/server";
import { intakeFetch } from "@/lib/public/intake-client";
import type { IntakeReceipt } from "@/lib/public/intake-types";
import { allow, clientAddress } from "@/lib/public/rate-limit";
import { messages } from "@/lib/messages";

/** CD-66 — at most this many submissions per address per window. */
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * CD-66 — the public form's submit. No session: the browser posts here and
 * this handler forwards with the server-side intake key, so the key never
 * reaches the page. It adds what the key cannot know — the caller's address,
 * for the rate limit — and drops anything filled into the hidden field that
 * people never see (`website`): a bot filling every input is answered as if
 * it succeeded, and nothing is created.
 *
 * Only the fields the backend's `IntakeSubmissionDto` takes are passed on; the
 * backend validates them again (type offered by this form, contact present).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json().catch(() => null)) as {
    type_code?: unknown;
    form_data?: unknown;
    contact?: Record<string, unknown>;
    website?: unknown;
  } | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { code: "VALIDATION_FAILED", message: messages.publicForm.required },
      { status: 400 },
    );
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ignored: true }, { status: 202 });
  }

  if (!allow(`form:${clientAddress(request.headers)}`, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { code: "TOO_MANY_REQUESTS", message: messages.publicForm.tooMany },
      { status: 429 },
    );
  }

  const contact = body.contact ?? {};
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const result = await intakeFetch<IntakeReceipt>(
    `web-forms/${encodeURIComponent(slug)}`,
    {
      method: "POST",
      body: {
        type_code: body.type_code,
        form_data:
          body.form_data && typeof body.form_data === "object"
            ? body.form_data
            : {},
        contact: {
          name: text(contact.name) ?? "",
          email: text(contact.email),
          phone: text(contact.phone),
          company: text(contact.company),
          tax_id: text(contact.tax_id),
        },
      },
    },
  );
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: result.status },
    );
  }
  // The receipt only — the status token is what the customer keeps.
  return NextResponse.json({
    request_no: result.data.request_no,
    status_token: result.data.status_token,
  });
}
