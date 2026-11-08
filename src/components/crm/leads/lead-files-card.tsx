"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Empty, Popconfirm, Select, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  DeleteOutlined,
  DownloadOutlined,
  PaperClipOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { appApi } from "@/lib/api/client";
import type { LeadFile } from "@/lib/api/sales";
import { messages } from "@/lib/messages";

const mf = messages.sales.leads.detail.files;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * ไฟล์บน Lead (6 พ.ย. 2569) — chiefly the proposal Vuvagent puts here, which the
 * thank-you email attaches when the Lead reaches Negotiation. The newest
 * proposal is marked as the one that goes out.
 */
export function LeadFilesCard({
  leadId,
  files,
  canManage,
}: {
  readonly leadId: string;
  readonly files: LeadFile[];
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"proposal" | "other">("proposal");
  const [busy, setBusy] = useState(false);
  const latestProposal = files.find((file) => file.kind === "proposal")?.id;

  async function upload(list: FileList | null) {
    const file = list?.[0];
    if (input.current) input.current.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) return void message.error(mf.tooLarge);
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    setBusy(true);
    const result = await appApi(`leads/${leadId}/files`, {
      method: "POST",
      body: form,
    });
    setBusy(false);
    if (!result.ok) return void message.error(mf.uploadFailed(result.message));
    void message.success(mf.uploaded);
    router.refresh();
  }

  async function remove(fileId: string) {
    const result = await appApi(`leads/${leadId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (!result.ok) return void message.error(result.message);
    void message.success(mf.removed);
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={`${mf.title} · ${files.length}`}
      extra={
        canManage ? (
          <div className="flex items-center gap-1">
            <Select
              size="small"
              value={kind}
              onChange={setKind}
              aria-label={mf.kindLabel}
              options={(["proposal", "other"] as const).map((value) => ({
                value,
                label: mf.kinds[value],
              }))}
              popupMatchSelectWidth={false}
            />
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(event) => void upload(event.target.files)}
            />
            <Button
              type="link"
              size="small"
              icon={<PaperClipOutlined />}
              loading={busy}
              onClick={() => input.current?.click()}
            >
              {mf.upload}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-2">
        {files.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={mf.empty} />
        ) : (
          files.map((file) => (
            <div key={file.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/app/leads/${leadId}/files/${file.id}`}
                  className="block truncate text-sm"
                  title={file.file_name}
                >
                  <DownloadOutlined className="mr-1" />
                  {file.file_name}
                </a>
                <div className="flex flex-wrap items-center gap-1">
                  <Tag
                    color={file.kind === "proposal" ? "blue" : undefined}
                    className="m-0!"
                  >
                    {mf.kinds[file.kind] ?? file.kind}
                  </Tag>
                  {file.id === latestProposal && (
                    <Tag color="green" className="m-0!">
                      {mf.latestProposal}
                    </Tag>
                  )}
                  {file.source === "agent" && (
                    <Tag icon={<RobotOutlined />} className="m-0!">
                      {mf.byAgent}
                    </Tag>
                  )}
                  <Text type="secondary" className="text-xs">
                    {fileSize(file.size_bytes)} · {when(file.uploaded_at)}
                  </Text>
                </div>
              </div>
              {canManage && (
                <Popconfirm
                  title={mf.removeConfirm}
                  onConfirm={() => void remove(file.id)}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={mf.remove}
                  />
                </Popconfirm>
              )}
            </div>
          ))
        )}
        {canManage && (
          <Text type="secondary" className="text-xs">
            {mf.hint}
          </Text>
        )}
      </div>
    </Card>
  );
}
