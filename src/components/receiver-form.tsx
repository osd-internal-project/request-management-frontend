"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, message } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import { completeRequest } from "@/lib/api/client-requests";
import { SchemaField } from "@/components/request-form";
import { fieldOrder, type FormSchema } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/**
 * H2.2 ข้อ 3 — the form the receiver fills in before declaring the work done.
 *
 * The second half of a request type. The requester says what they want; this
 * says what was done about it — what was checked, what was issued, what it
 * cost. Until now there was nowhere to put any of that, so it went into the
 * requester's fields or into nothing.
 *
 * It carries the `ทำเสร็จแล้ว` button rather than sitting beside it: finishing
 * *is* submitting this form, and two controls for one action is how a request
 * gets completed with the form still blank. A type with no second form keeps
 * the plain button in `RequestActions` and never renders this.
 *
 * The backend re-checks every required field (`assertReceiverFormComplete`)
 * against the schema **snapshotted at submit**, so a type edited while this was
 * being worked on cannot change what finishing it requires.
 */
export function ReceiverForm({
  requestId,
  schema,
  initial,
}: {
  readonly requestId: string;
  readonly schema: FormSchema;
  /** Whatever was already saved — a completion can be attempted twice. */
  readonly initial: Record<string, unknown>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const required = new Set(schema.required ?? []);

  // Explicit, because `jsonb` returns the properties sorted by key length —
  // see `fieldOrder`. Sorting a copy keeps the schema object untouched.
  const fields = Object.entries(schema.properties ?? {}).sort(
    ([, a], [, b]) => fieldOrder(a) - fieldOrder(b),
  );

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await completeRequest(requestId, values);

    setBusy(false);

    if (!result.ok) {
      // The backend names every missing field at once; its message is more
      // useful than a count computed here.
      setError(result.message);
      return;
    }

    void message.success(messages.requestDetail.actionDone);
    router.refresh();
  }

  return (
    <Card title={messages.requestDetail.receiverFormTitle} size="small">
      <div className="space-y-4">
        {error && <Alert type="error" showIcon title={error} />}

        <Paragraph type="secondary" className="mb-0! text-xs">
          {messages.requestDetail.receiverFormHint}
        </Paragraph>

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {fields.map(([name, property]) => (
            <SchemaField
              key={name}
              name={name}
              property={property}
              required={required.has(name)}
              value={values[name]}
              onChange={(next) =>
                setValues((current) => ({ ...current, [name]: next }))
              }
            />
          ))}
        </div>

        <Button type="primary" loading={busy} onClick={() => void submit()}>
          {messages.requestDetail.complete}
        </Button>
      </div>
    </Card>
  );
}
