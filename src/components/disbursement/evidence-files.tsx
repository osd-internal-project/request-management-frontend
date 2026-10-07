"use client";

import { useState } from "react";
import { Alert, Button, List, Upload } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import type {
  DisbursementDetail,
  DisbursementFile,
  DisbursementFileKind,
} from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";
import { disbursementFileUrl } from "./format";

const m = messages.disbursement.files;

/** Evidence of one kind: what is attached, and (when allowed) attach / remove. */
export function EvidenceFiles({
  docNo,
  files,
  kind,
  editable,
  onChanged,
}: {
  readonly docNo: string;
  readonly files: readonly DisbursementFile[];
  readonly kind: DisbursementFileKind;
  readonly editable: boolean;
  readonly onChanged: (view: DisbursementDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = files.filter((file) => file.kind === kind);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    const result = await appApi<DisbursementDetail>(
      `disbursements/${encodeURIComponent(docNo)}/files`,
      { method: "POST", body },
    );
    setBusy(false);
    if (result.ok) onChanged(result.data);
    else setError(result.message);
  }

  async function remove(id: string) {
    setBusy(true);
    const result = await appApi<DisbursementDetail>(
      `disbursements/${encodeURIComponent(docNo)}/files/${id}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (result.ok) onChanged(result.data);
    else setError(result.message);
  }

  return (
    <div>
      <div className="mb-1 font-medium">{m.kinds[kind]}</div>
      {error && <Alert type="error" showIcon title={error} className="mb-2" />}
      {mine.length > 0 && (
        <List
          size="small"
          bordered
          dataSource={mine}
          renderItem={(file) => (
            <List.Item
              actions={
                editable
                  ? [
                      <Button
                        key="remove"
                        type="text"
                        danger
                        aria-label={m.remove}
                        icon={<DeleteOutlined />}
                        disabled={busy}
                        onClick={() => void remove(file.id)}
                      />,
                    ]
                  : []
              }
            >
              <a
                href={disbursementFileUrl(docNo, file.id)}
                target="_blank"
                rel="noreferrer"
              >
                {file.fileName}
              </a>
              <span className="text-xs text-gray-500">
                {(file.sizeBytes / 1024).toFixed(0)} KB
              </span>
            </List.Item>
          )}
        />
      )}
      {editable && (
        <Upload.Dragger
          className="mt-2"
          accept=".pdf,.jpg,.jpeg,.png"
          showUploadList={false}
          disabled={busy}
          beforeUpload={(file) => {
            void upload(file);
            return false;
          }}
        >
          <p>
            <UploadOutlined /> {m.upload}
          </p>
          <p className="text-xs text-gray-500">{m.types}</p>
        </Upload.Dragger>
      )}
    </div>
  );
}
