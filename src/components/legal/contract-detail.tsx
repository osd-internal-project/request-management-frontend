"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Popconfirm,
  Space,
  Switch,
  Tag,
} from "antd";
import {
  DeleteOutlined,
  FileTextOutlined,
  LockOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { ContractForm } from "@/components/legal/contract-form";
import { ContractTermsCard } from "@/components/legal/contract-terms-card";
import { ContractObligationsCard } from "@/components/legal/contract-obligations-card";
import { ContractInstallmentsCard } from "@/components/legal/contract-installments-card";
import { ContractRiskCard } from "@/components/legal/contract-risk-card";
import { ContractDraftCard } from "@/components/legal/contract-draft-card";
import { ContractEsignCard } from "@/components/esign/contract-esign-card";
import { ContractSignedCard } from "@/components/legal/contract-signed-card";
import type { EsignEnvelope, EsignLayout } from "@/lib/api/esign";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type {
  ContractDetail,
  ContractInstallmentsView,
  ContractObligation,
  ContractRiskView,
  ContractTermsView,
  DraftForRequest,
} from "@/lib/api/contracts";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.contracts;
const md = m.detail;

const fileUrl = (contractId: string, documentId: string) =>
  `/api/app/contracts/${contractId}/documents/${documentId}`;

const sizeOf = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * CD-161 — one contract: what it is and with whom, its files (a PDF's text
 * is what the repository searches), and — for Legal — whether it is
 * confidential and who else may open it.
 */
export function ContractDetailView({
  contract,
  terms,
  obligations,
  installments,
  risk,
  draft,
  esign,
  currentUserId,
  people,
  canOpenProject,
}: {
  readonly contract: ContractDetail;
  /** CD-153..156 — null = could not load. */
  readonly terms: ContractTermsView | null;
  /** CD-163 — null = could not load. */
  readonly obligations: ContractObligation[] | null;
  /** CD-164 — null = could not load. */
  readonly installments: ContractInstallmentsView | null;
  /** CD-158 — null = could not load. */
  readonly risk: ContractRiskView | null;
  /** CD-146 — the draft it was written from; null = none. */
  readonly draft: DraftForRequest | null;
  /** CD-14 — its signings, and the layouts for who may send. */
  readonly esign: {
    envelopes: EsignEnvelope[];
    layouts: EsignLayout[];
    canSend: boolean;
  };
  readonly currentUserId: string | null;
  /** The company's users, for the access list (Legal only). */
  readonly people: { id: string; name: string }[];
  /** CD-175 — may open a project from it (`pm.project.manage`). */
  readonly canOpenProject: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidential, setConfidential] = useState(contract.confidential);
  const [accessIds, setAccessIds] = useState(
    contract.access.map((row) => row.userId),
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const canManage = contract.canManage;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const result = await appApi(`contracts/${contract.id}/documents`, {
        method: "POST",
        body: form,
      });
      if (!result.ok) {
        setError(`${file.name}: ${result.message}`);
        break;
      }
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
    message.success(md.uploaded);
    router.refresh();
  }

  async function remove(documentId: string) {
    const result = await appApi(
      `contracts/${contract.id}/documents/${documentId}`,
      { method: "DELETE" },
    );
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.removed);
    router.refresh();
  }

  async function saveAccess() {
    setBusy(true);
    setError(null);
    const result = await appApi(`contracts/${contract.id}/access`, {
      method: "PUT",
      body: JSON.stringify({ confidential, user_ids: accessIds }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.accessSaved);
    router.refresh();
  }

  const party = contract.customer ? (
    <Link href={ROUTES.customerDetail(contract.customer.id)}>
      {contract.customer.customerCode} · {contract.customer.nameTh}
    </Link>
  ) : (
    contract.counterpartyName
  );

  return (
    <div className="space-y-4">
      <Link href={ROUTES.contracts} className="text-sm">
        ← {md.back}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={4} className="mb-1!">
            {contract.contractNo} · {contract.title}
          </Title>
          <Space size={6} wrap>
            <Tag color={m.kindColor[contract.kind]}>
              {m.kind[contract.kind]}
            </Tag>
            <Tag color={m.statusColor[contract.status]}>
              {m.status[contract.status]}
            </Tag>
            {contract.confidential && (
              <Tag color="red" icon={<LockOutlined />}>
                {m.confidential}
              </Tag>
            )}
          </Space>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(true)}>{md.edit}</Button>
        )}
      </div>

      {error && <Alert type="error" showIcon title={error} />}

      <Card size="small">
        <Descriptions
          size="small"
          column={{ xs: 1, md: 2 }}
          items={[
            { key: "party", label: md.party, children: party },
            ...(contract.counterpartyTaxId
              ? [
                  {
                    key: "tax",
                    label: md.taxId,
                    children: contract.counterpartyTaxId,
                  },
                ]
              : []),
            {
              key: "period",
              label: md.period,
              children: `${
                contract.startOn
                  ? `${dayjs(contract.startOn).format("D MMM YYYY")} – `
                  : ""
              }${dayjs(contract.endOn).format("D MMM YYYY")}`,
            },
            {
              key: "value",
              label: md.value,
              children:
                contract.value === null ? "—" : formatAmount(contract.value),
            },
            {
              key: "owner",
              label: md.owner,
              children: contract.ownerName ?? "—",
            },
            ...(contract.master
              ? [
                  {
                    key: "master",
                    label: md.master,
                    children: (
                      <Link href={ROUTES.contractDetail(contract.master.id)}>
                        {contract.master.contractNo} · {contract.master.title}
                      </Link>
                    ),
                  },
                ]
              : []),
            ...(contract.kind === "nda"
              ? [
                  {
                    key: "ndaDirection",
                    label: md.ndaDirection,
                    children: contract.ndaDirection
                      ? m.ndaDirection[contract.ndaDirection]
                      : "—",
                  },
                  {
                    key: "ndaScope",
                    label: md.ndaScope,
                    children: (
                      <span className="whitespace-pre-line">
                        {contract.ndaScope ?? "—"}
                      </span>
                    ),
                  },
                ]
              : []),
            ...(contract.renewalOpportunityId
              ? [
                  {
                    key: "renewal",
                    label: md.renewalDeal,
                    children: (
                      <Link
                        href={ROUTES.opportunityDetail(
                          contract.renewalOpportunityId,
                        )}
                      >
                        {md.renewalDeal}
                      </Link>
                    ),
                  },
                ]
              : []),
            ...(contract.note
              ? [
                  {
                    key: "note",
                    label: md.note,
                    children: (
                      <span className="whitespace-pre-line">
                        {contract.note}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {contract.kind === "msa" && (
        <Card
          size="small"
          title={`${md.subContractsTitle} · ${contract.subContracts.length}`}
        >
          <Text type="secondary" className="mb-2 block text-xs">
            {md.subContractsHint}
          </Text>
          {contract.subContracts.length ? (
            <div className="divide-y">
              {contract.subContracts.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                >
                  <Link href={ROUTES.contractDetail(sub.id)}>
                    {sub.contractNo} · {sub.title}
                  </Link>
                  <span>
                    <Tag color={m.statusColor[sub.status]}>
                      {m.status[sub.status]}
                    </Tag>
                    <Text type="secondary" className="text-xs">
                      {dayjs(sub.endOn).format("D MMM YYYY")}
                    </Text>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Text type="secondary">{md.noSubContracts}</Text>
          )}
        </Card>
      )}

      {draft && contract.requestId && (
        <ContractDraftCard
          requestId={contract.requestId}
          view={draft}
          canManage={false}
        />
      )}

      <ContractSignedCard contract={contract} canOpenProject={canOpenProject} />

      <ContractEsignCard
        contractId={contract.id}
        envelopes={esign.envelopes}
        documents={contract.documents}
        layouts={esign.layouts}
        people={people}
        canSend={esign.canSend}
      />

      {risk && (
        <ContractRiskCard
          basePath={`contracts/${contract.id}`}
          view={risk}
          canManage={canManage}
        />
      )}

      {terms && (
        <ContractTermsCard
          contractId={contract.id}
          view={terms}
          canManage={canManage}
        />
      )}

      {installments && (
        <ContractInstallmentsCard
          contractId={contract.id}
          view={installments}
          canManage={canManage}
        />
      )}

      {obligations && (
        <ContractObligationsCard
          contractId={contract.id}
          rows={obligations}
          people={people}
          canManage={canManage}
          currentUserId={currentUserId}
        />
      )}

      <Card
        size="small"
        title={`${md.filesTitle} · ${contract.documents.length}`}
        extra={
          canManage ? (
            <>
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                accept=".pdf,.doc,.docx,image/jpeg,image/png"
                onChange={(event) => void upload(event.target.files)}
              />
              <Button
                size="small"
                icon={<UploadOutlined />}
                loading={busy}
                onClick={() => fileInput.current?.click()}
              >
                {md.upload}
              </Button>
            </>
          ) : null
        }
      >
        {canManage && (
          <Text type="secondary" className="mb-2 block text-xs">
            {md.uploadHint}
          </Text>
        )}
        {contract.documents.length ? (
          <div className="divide-y">
            {contract.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div>
                  <a
                    href={fileUrl(contract.id, doc.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileTextOutlined /> {doc.fileName}
                  </a>
                  <Text type="secondary" className="ml-2 text-xs">
                    {sizeOf(doc.sizeBytes)} · {doc.uploadedByName} ·{" "}
                    {dayjs(doc.uploadedAt).format("D MMM YY HH:mm")}
                  </Text>
                </div>
                <Space size={4}>
                  <Tag color={md.textStatusColor[doc.textStatus]}>
                    {md.textStatus[doc.textStatus]}
                  </Tag>
                  {canManage && (
                    <Popconfirm
                      title={md.removeConfirm}
                      onConfirm={() => void remove(doc.id)}
                    >
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  )}
                </Space>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={md.noFiles}
          />
        )}
      </Card>

      {canManage && (
        <Card size="small" title={md.accessTitle}>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                size="small"
                checked={confidential}
                onChange={setConfidential}
              />
              {md.confidentialSwitch}
            </label>
            <Text type="secondary" className="block text-xs">
              {confidential ? md.confidentialHint : md.notConfidential}
            </Text>
            {confidential && (
              <div>
                <span className="mb-1 block text-sm">{md.accessUsers}</span>
                <SearchSelect
                  className="w-full"
                  mode="multiple"
                  value={accessIds}
                  onChange={(value) => setAccessIds((value as string[]) ?? [])}
                  options={people.map((person) => ({
                    value: person.id,
                    label: person.name,
                  }))}
                />
              </div>
            )}
            <Button
              type="primary"
              loading={busy}
              onClick={() => void saveAccess()}
            >
              {md.accessSave}
            </Button>
          </div>
        </Card>
      )}

      {editing && (
        <ContractForm
          open
          contract={contract}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
