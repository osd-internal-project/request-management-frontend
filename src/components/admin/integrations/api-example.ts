import type { ApiExample } from "@/lib/api/api-keys";
import type { WebhookExample } from "@/lib/api/webhooks";
import { endpointUrl } from "@/lib/api/outbound-connections";
import { messages } from "@/lib/messages";

const UNSET_BASE = "<EXTERNAL_API_PUBLIC_URL>/api/v1";

/** The id the round-trip examples share, so step ① and step ② visibly name the same task. */
export const SAMPLE_AGENT_RECORD_ID = "6f6bd3a7-7308-4d2e-a4de-75e1f89b6871";

/** Single-quotes a value for a POSIX shell; `'` becomes `'\''`. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function curl(
  method: string,
  url: string,
  headers: readonly string[],
  body: unknown,
): string {
  const lines = [`curl -X ${method} ${shellQuote(url)}`];
  for (const header of headers) lines.push(`-H "${header}"`);
  if (body !== null && body !== undefined) {
    lines.push(`-H "Content-Type: application/json"`);
    lines.push(`-d ${shellQuote(JSON.stringify(body, null, 2))}`);
  }
  return lines.join(" \\\n  ");
}

/** A copy-paste curl for one route; the key is shown only as its prefix. */
export function curlFor(
  example: ApiExample,
  {
    externalApiBase,
    keyPrefix,
  }: { readonly externalApiBase: string | null; readonly keyPrefix: string },
): string {
  const path = example.path.replace(/\{(\w+)\}/g, "<$1>");
  const query = new URLSearchParams(
    Object.entries(example.query).map(([name, value]) => [name, String(value)]),
  ).toString();
  const headers = [`Authorization: Bearer ${keyPrefix}…`];
  if (example.actingUser) {
    headers.push(`X-Acting-User: ${messages.apiKeys.exampleActingUser}`);
  }
  return curl(
    example.method,
    `${externalApiBase ?? UNSET_BASE}${path}${query ? `?${query}` : ""}`,
    headers,
    example.body,
  );
}

/** The HTTP request a subscriber receives for one event, headers as the sender writes them. */
export function webhookRequestFor(example: WebhookExample, url: string): string {
  const body = example.body;
  const id =
    typeof body === "object" && body !== null && "id" in body
      ? String(body.id)
      : "<event id>";
  return [
    `POST ${url}`,
    "Content-Type: application/json",
    `webhook-id: ${id}`,
    "webhook-timestamp: <unix seconds>",
    "webhook-signature: v1,<signature>",
    `X-Webhook-Id: ${id}`,
    `X-Webhook-Event: ${example.event}`,
    "X-Webhook-Timestamp: <unix seconds>",
    "X-Webhook-Signature: sha256=<hex>",
    "",
    JSON.stringify(body, null, 2),
  ].join("\n");
}

/** Port of `verify` in the backend's `scripts/webhook-receiver-example.ts`. */
export const WEBHOOK_VERIFY_SNIPPET = `const { createHmac, timingSafeEqual } = require("node:crypto");

// rawBody = the request body exactly as received, before JSON.parse
function verify(secret, timestamp, signature, rawBody, nowSec = Math.floor(Date.now() / 1000)) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) return false;
  const expected = Buffer.from(
    "sha256=" + createHmac("sha256", secret).update(\`\${timestamp}.\${rawBody}\`).digest("hex"),
  );
  const given = Buffer.from(String(signature));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// verify(process.env.WEBHOOK_SECRET, req.headers["x-webhook-timestamp"], req.headers["x-webhook-signature"], rawBody)`;

/** What CTD sends to a Vuvagent endpoint; the agent's key stays a placeholder. */
export function agentTaskCurl(
  baseUrl: string,
  endpointId: string,
  payloadFields: readonly string[],
): string {
  const m = messages.outboundConnections;
  const sample: Record<string, string> = {
    agent_record_id: SAMPLE_AGENT_RECORD_ID,
    topic: m.sampleTopic,
  };
  return curl(
    "POST",
    endpointUrl(baseUrl, endpointId),
    [`x-api-key: ${m.vuvagentKeyPlaceholder}`],
    Object.fromEntries(
      payloadFields.map((field) => [field, sample[field] ?? `<${field}>`]),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Lead intake as the agent sends it: tied back to the task through `intake_data.agent_record_id`. */
export function intakeForAgent(example: ApiExample): ApiExample {
  const body = isRecord(example.body) ? example.body : {};
  const intake = isRecord(body.intake_data) ? body.intake_data : {};
  return {
    ...example,
    body: {
      ...body,
      intake_data: { ...intake, agent_record_id: SAMPLE_AGENT_RECORD_ID },
    },
  };
}
