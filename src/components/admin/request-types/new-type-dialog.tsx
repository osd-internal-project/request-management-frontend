"use client";

import { useState } from "react";
import { Alert, Input, Modal, Space } from "antd";
import Text from "antd/es/typography/Text";
import { createRequestType } from "@/lib/api/client-requests";
import type { RequestType } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/**
 * A new type starts **inactive** — the API's default — so it is not offered on
 * the submit screen before its form and documents are settled. The caller
 * remounts this dialog per opening, which is what clears a cancelled entry.
 */
export function NewTypeDialog({
  open,
  companyId,
  onClose,
  onCreated,
}: {
  readonly open: boolean;
  /** The company tab on screen, which need not be the session's company. */
  readonly companyId: string;
  readonly onClose: () => void;
  readonly onCreated: (type: RequestType) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);

    const result = await createRequestType({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      company_ids: [companyId],
      // One placeholder field so the schema is usable from the start; the
      // API rejects a schema with no properties at all.
      form_schema: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: {
            type: "string",
            title: messages.requestTypes.starterFieldTitle,
          },
        },
      },
    });

    setBusy(false);

    if (result.ok) onCreated(result.data);
    else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={messages.requestTypes.newTypeTitle}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={busy}
      okButtonProps={{ disabled: !code.trim() || !name.trim() }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}

      <Space orientation="vertical" className="flex">
        <label className="block">
          <Text strong>{messages.requestTypes.code}</Text>
          <Input
            className="mt-1"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={messages.requestTypes.codePlaceholder}
          />
          <Text type="secondary" className="text-xs">
            {messages.requestTypes.codeHint}
          </Text>
        </label>

        <label className="block">
          <Text strong>{messages.requestTypes.name}</Text>
          <Input
            className="mt-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={messages.requestTypes.namePlaceholder}
          />
        </label>
      </Space>
    </Modal>
  );
}
