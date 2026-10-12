"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Tag, Upload } from "antd";
import { uploadAttachment } from "@/lib/api/client-requests";
import type { RequiredDoc } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/**
 * Attach the documents a draft still needs, from the request's own page.
 *
 * A draft raised by another screen (PRA, SOLA, …) never passes through the
 * new-request form, so for a type with a required document — DSC asks for
 * ใบเสนอราคาฉบับร่าง — submit answered "เอกสารบังคับยังไม่ครบ" with nowhere on
 * the page to attach one. Each missing required document gets its own button,
 * so the file lands under the code the server checks.
 */
export function DraftAttachments({
  requestId,
  requiredDocs,
  attachedCodes,
}: {
  readonly requestId: string;
  readonly requiredDocs: readonly RequiredDoc[];
  readonly attachedCodes: readonly string[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const m = messages.requestForm;

  async function attach(file: File, docCode?: string) {
    setError(null);
    setUploading(docCode ?? "");
    const added = await uploadAttachment(requestId, file, docCode);
    setUploading(null);

    if (added.ok) router.refresh();
    else setError(added.message ?? messages.common.loadError);
  }

  const picker = (docCode: string | undefined, label: string) => (
    <Upload
      showUploadList={false}
      beforeUpload={(file) => {
        void attach(file, docCode);
        return false;
      }}
    >
      <Button size="small" loading={uploading === (docCode ?? "")}>
        {label}
      </Button>
    </Upload>
  );

  return (
    <div className="mt-2 space-y-2">
      {error && <Alert type="error" showIcon title={error} />}
      {requiredDocs.map((doc) => {
        const done = attachedCodes.includes(doc.code);
        return (
          <div key={doc.code} className="flex items-center gap-2 text-sm">
            <span>{doc.name}</span>
            {doc.required !== false && !done && (
              <Tag color="red">{m.missingDoc}</Tag>
            )}
            {!done && picker(doc.code, m.attachFile)}
          </div>
        );
      })}
      {picker(undefined, messages.requestDetail.attachOther)}
    </div>
  );
}
