"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, DatePicker, Modal, Select, Tag } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ContractDetail } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts.signed;

const fileUrl = (contractId: string, documentId: string) =>
  `/api/app/contracts/${contractId}/documents/${documentId}`;

/**
 * CD-175 — has every party signed, and has a project been opened from it?
 * E-sign records the day itself; a paper contract is recorded here by Legal
 * with its signed copy. A project opens only once it is signed.
 */
export function ContractSignedCard({
  contract,
  canOpenProject,
}: {
  readonly contract: ContractDetail;
  readonly canOpenProject: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [recording, setRecording] = useState(false);
  const [day, setDay] = useState<Dayjs | null>(null);
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedFile = contract.documents.find(
    (doc) => doc.id === contract.signedDocumentId,
  );
  const projectKind = contract.kind === "standard" || contract.kind === "other";
  const mayOpen =
    canOpenProject &&
    projectKind &&
    contract.status === "active" &&
    Boolean(contract.signedOn) &&
    !contract.project;

  async function record() {
    if (!day || !documentId) {
      setError(m.required);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi(`contracts/${contract.id}/signed`, {
      method: "POST",
      body: JSON.stringify({
        signed_on: day.format("YYYY-MM-DD"),
        document_id: documentId,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.recorded);
    setRecording(false);
    router.refresh();
  }

  return (
    <Card size="small" title={m.title}>
      <div className="space-y-2">
        {contract.signedOn ? (
          <div className="flex flex-wrap items-center gap-2">
            <Tag color="green" icon={<CheckCircleOutlined />}>
              {m.signedOn(dayjs(contract.signedOn).format("D MMM YYYY"))}
            </Tag>
            <Text type="secondary" className="text-sm">
              {m.via[contract.signedVia ?? ""] ?? ""}
            </Text>
            {signedFile && (
              <a
                href={fileUrl(contract.id, signedFile.id)}
                target="_blank"
                rel="noreferrer"
                className="text-sm"
              >
                {m.signedFile}: {signedFile.fileName}
              </a>
            )}
          </div>
        ) : (
          <div>
            <Text>{m.notSigned}</Text>
            <Text type="secondary" className="block text-xs">
              {m.notSignedHint}
            </Text>
          </div>
        )}
        {contract.canManage && contract.signedVia !== "esign" && (
          <Button
            size="small"
            onClick={() => {
              setDay(contract.signedOn ? dayjs(contract.signedOn) : null);
              setDocumentId(contract.signedDocumentId ?? undefined);
              setError(null);
              setRecording(true);
            }}
          >
            {m.record}
          </Button>
        )}

        {projectKind && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-2">
            <Text type="secondary" className="text-sm">
              {m.project}:
            </Text>
            {contract.project ? (
              <Link href={ROUTES.projectDetail(contract.project.id)}>
                {contract.project.projectNo} · {contract.project.name}
              </Link>
            ) : (
              <Text type="secondary" className="text-sm">
                {m.noProject}
              </Text>
            )}
            {mayOpen && (
              <Link href={ROUTES.projectOpen(contract.id)}>
                <Button size="small" type="primary">
                  {m.openProject}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      <Modal
        open={recording}
        title={m.recordTitle}
        onCancel={() => setRecording(false)}
        okText={m.save}
        cancelText={m.cancel}
        confirmLoading={busy}
        onOk={() => void record()}
        destroyOnHidden
      >
        <div className="space-y-3">
          {error && <Alert type="error" showIcon title={error} />}
          <label className="block text-xs">
            {m.signedOnLabel}
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={day}
              disabledDate={(value) => value.isAfter(dayjs(), "day")}
              onChange={(value) => setDay(value)}
            />
          </label>
          <label className="block text-xs">
            {m.fileLabel}
            <Select
              className="w-full"
              value={documentId}
              onChange={(id: string) => setDocumentId(id)}
              notFoundContent={m.noFiles}
              options={contract.documents.map((doc) => ({
                value: doc.id,
                label: doc.fileName,
              }))}
            />
          </label>
        </div>
      </Modal>
    </Card>
  );
}
