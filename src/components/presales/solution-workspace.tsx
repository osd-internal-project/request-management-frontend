"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import {
  DeleteOutlined,
  LockOutlined,
  PlusOutlined,
  PrinterOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  BoqLine,
  AssumptionCategory,
  SolutionAssumption,
  SolutionDetail,
} from "@/lib/api/presales";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { RequirementsCard } from "./requirements-card";
import { ScopeOfWorkCard, type ScopeOfWork } from "./scope-of-work-card";
import { FeasibilityCard } from "./feasibility-card";
import { BoqCard } from "./boq-card";
import { CostCard } from "./cost-card";
import { ClarificationsCard } from "./clarifications-card";
import { RisksCard } from "./risks-card";
import { DemosCard } from "./demos-card";
import { TorCard } from "./tor-card";

const mp = messages.presales;

const STATUS_COLOR: Record<string, string> = {
  draft: "gold",
  locked: "green",
  superseded: "default",
};

/** CD-143 — the approval tag on a version. */
export const APPROVAL_COLOR: Record<string, string> = {
  none: "default",
  pending: "gold",
  approved: "green",
  rejected: "red",
  cancelled: "default",
};

/** CD-133 — what the work depends on someone else for: who and by when. */
const DEPENDENCY_CATEGORIES: readonly AssumptionCategory[] = [
  "customer",
  "third_party",
];

const CATEGORIES = Object.keys(mp.categories) as AssumptionCategory[];

function fileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

/**
 * CD-132 — one Solution: the brief Sales wrote beside the design Pre-Sales
 * builds from it. A draft is edited here; a locked version is read-only and a
 * change opens the next version.
 */
export function SolutionWorkspace({ solution }: { solution: SolutionDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const version = solution.version;
  const editable = solution.can_manage && version.status === "draft";
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(solution.title);
  const [summary, setSummary] = useState(version.summary);
  const [design, setDesign] = useState(version.design);
  const [assumptions, setAssumptions] = useState<SolutionAssumption[]>(
    version.assumptions,
  );
  const [sow, setSow] = useState<ScopeOfWork>({
    inScope: version.inScope,
    outOfScope: version.outOfScope,
    deliverables: version.deliverables,
  });
  const [boq, setBoq] = useState<BoqLine[]>(version.boq);
  const [feasibility, setFeasibility] = useState({
    verdict: version.feasibility,
    note: version.feasibilityNote,
  });
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  const dirty = useMemo(
    () =>
      title !== solution.title ||
      summary !== version.summary ||
      design !== version.design ||
      JSON.stringify(assumptions) !== JSON.stringify(version.assumptions) ||
      feasibility.verdict !== version.feasibility ||
      feasibility.note !== version.feasibilityNote ||
      JSON.stringify(boq) !== JSON.stringify(version.boq) ||
      JSON.stringify(sow) !==
        JSON.stringify({
          inScope: version.inScope,
          outOfScope: version.outOfScope,
          deliverables: version.deliverables,
        }),
    [
      title,
      summary,
      design,
      assumptions,
      sow,
      boq,
      feasibility,
      solution.title,
      version,
    ],
  );

  const base = `presales/solutions/${solution.id}`;
  const versionPath = `${base}/versions/${version.versionNo}`;

  async function run(
    work: () => Promise<{ ok: boolean; message?: string }>,
    done?: string,
  ): Promise<boolean> {
    setBusy(true);
    const result = await work();
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return false;
    }
    if (done) void message.success(done);
    router.refresh();
    return true;
  }

  const save = () =>
    run(
      () =>
        appApi(versionPath, {
          method: "PATCH",
          body: JSON.stringify({
            title,
            summary,
            design,
            assumptions: assumptions.map(({ neededBy, ...item }) => ({
              ...item,
              ...(neededBy ? { needed_by: neededBy } : {}),
            })),
            ...(feasibility.verdict !== "unassessed"
              ? { feasibility: feasibility.verdict }
              : {}),
            feasibility_note: feasibility.note,
            in_scope: sow.inScope,
            out_of_scope: sow.outOfScope,
            deliverables: sow.deliverables,
            boq: boq.map((line) => ({
              kind: line.kind,
              product_code: line.productCode,
              name: line.name,
              description: line.description,
              model: line.model,
              quantity: line.quantity,
              unit: line.unit,
              ref_unit_cost: line.refUnitCost,
            })),
          }),
        }),
      mp.saved,
    );

  const lock = () =>
    run(() => appApi(`${versionPath}/lock`, { method: "POST" }), mp.locked);

  async function openVersion() {
    setBusy(true);
    const result = await appApi<SolutionDetail>(`${base}/versions`, {
      method: "POST",
      body: JSON.stringify({ change_note: changeNote }),
    });
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    setOpening(false);
    setChangeNote("");
    router.push(ROUTES.solutionDetail(solution.id));
    router.refresh();
  }

  async function requestApproval() {
    setBusy(true);
    const result = await appApi<{ request_id: string }>(
      `${versionPath}/approval`,
      { method: "POST" },
    );
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    // The draft opens for documents and submit — the request page's own flow.
    router.push(ROUTES.requestDetail(result.data.request_id));
  }

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await run(() =>
      appApi(`${versionPath}/files`, { method: "POST", body: form }),
    );
    if (fileInput.current) fileInput.current.value = "";
  }

  const removeFile = (fileId: string) =>
    run(() => appApi(`${versionPath}/files/${fileId}`, { method: "DELETE" }));

  const setAssumption = (index: number, patch: Partial<SolutionAssumption>) =>
    setAssumptions((rows) =>
      rows.map((row, at) => (at === index ? { ...row, ...patch } : row)),
    );

  const briefEntries = Object.entries(solution.brief);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={4} className="mb-0!">
            {mp.title} · {solution.title}{" "}
            {/* CD-135 — handoff 3: an approved version, its BOQ fully coded. */}
            {solution.pricing_ready && (
              <Tag color="green">
                {mp.boq.pricingReady(solution.pricing_ready.versionNo)}
              </Tag>
            )}
          </Title>
          <Space size="small" wrap className="text-xs">
            {solution.deal && (
              <Text type="secondary">
                {mp.deal}{" "}
                <Link href={ROUTES.opportunityDetail(solution.deal.id)}>
                  {solution.deal.opportunityCode}
                </Link>{" "}
                {solution.deal.partyName ?? ""}
              </Text>
            )}
            {solution.request && (
              <Text type="secondary">
                · {mp.request}{" "}
                <Link href={ROUTES.requestDetail(solution.request.id)}>
                  {solution.request.requestNo ?? solution.request.id}
                </Link>
              </Text>
            )}
          </Space>
        </div>
        <Space wrap>
          <Select
            value={version.versionNo}
            style={{ minWidth: 200 }}
            onChange={(no: number) =>
              router.push(`${ROUTES.solutionDetail(solution.id)}?v=${no}`)
            }
            options={solution.versions.map((row) => ({
              value: row.versionNo,
              label: `${mp.version(row.versionNo)} · ${
                mp.versionStatus[row.status] ?? row.status
              }`,
            }))}
          />
          {editable && (
            <>
              <Button
                loading={busy}
                disabled={!dirty}
                onClick={() => void save()}
              >
                {mp.save}
              </Button>
              <Popconfirm
                title={mp.lockConfirm}
                disabled={dirty}
                onConfirm={() => void lock()}
              >
                <Button
                  type="primary"
                  icon={<LockOutlined />}
                  loading={busy}
                  disabled={dirty}
                  title={dirty ? mp.unsaved : undefined}
                >
                  {mp.lock}
                </Button>
              </Popconfirm>
            </>
          )}
          {/* CD-137 — the customer's copy, from an approved version only. */}
          {version.approvalStatus === "approved" && (
            <Link
              href={ROUTES.solutionProposalPrint(solution.id, version.versionNo)}
              target="_blank"
            >
              <Button icon={<PrinterOutlined />}>
                {messages.solutionProposal.open}
              </Button>
            </Link>
          )}
          {solution.approval.request && (
            <Link href={ROUTES.requestDetail(solution.approval.request.id)}>
              <Button>
                {mp.approval.openRequest(
                  solution.approval.request.requestNo ??
                    mp.approval.draftRequest,
                )}
              </Button>
            </Link>
          )}
          {solution.can_manage &&
            solution.approval.configured &&
            !solution.approval.blocker && (
              <Popconfirm
                title={mp.approval.request}
                description={
                  <div style={{ maxWidth: 320 }}>{mp.approval.requestHint}</div>
                }
                okText={mp.approval.requestOk}
                onConfirm={() => void requestApproval()}
              >
                <Button type="primary" loading={busy}>
                  {mp.approval.request}
                </Button>
              </Popconfirm>
            )}
          {solution.can_manage &&
            version.status !== "draft" &&
            version.versionNo === solution.currentVersionNo && (
              <Button type="primary" onClick={() => setOpening(true)}>
                {mp.newVersion}
              </Button>
            )}
        </Space>
      </div>

      {/* Why the approval button is not there — e.g. an open scope change (CD-140). */}
      {solution.can_manage &&
        solution.approval.configured &&
        solution.approval.blocker &&
        version.status === "locked" &&
        version.versionNo === solution.currentVersionNo &&
        !["pending", "approved"].includes(version.approvalStatus) && (
          <Alert type="warning" showIcon title={solution.approval.blocker} />
        )}
      {version.approvalStatus === "approved" && (
        <Alert type="success" showIcon title={mp.approval.approvedHint} />
      )}
      {solution.can_manage &&
        version.status === "locked" &&
        !solution.approval.configured && (
          <Alert type="info" showIcon title={mp.approval.notConfigured} />
        )}
      {!solution.can_manage && (
        <Alert type="info" showIcon title={mp.readOnly} />
      )}
      {solution.can_manage && version.status !== "draft" && (
        <Alert type="warning" showIcon title={mp.lockedHint} />
      )}
      {editable && dirty && (
        <Alert type="warning" showIcon title={mp.unsaved} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="small" title={mp.brief} className="lg:col-span-1">
          {briefEntries.length ? (
            <Descriptions
              size="small"
              column={1}
              items={briefEntries.map(([key, value]) => ({
                key,
                label: mp.briefFields[key] ?? key,
                children: <span className="whitespace-pre-wrap">{value}</span>,
              }))}
            />
          ) : (
            <Text type="secondary">{mp.briefEmpty}</Text>
          )}
        </Card>

        <Card
          size="small"
          className="lg:col-span-2"
          title={
            <Space>
              {mp.version(version.versionNo)}
              <Tag color={STATUS_COLOR[version.status]}>
                {mp.versionStatus[version.status] ?? version.status}
              </Tag>
              {version.status !== "draft" && (
                <Tag color={APPROVAL_COLOR[version.approvalStatus]}>
                  {mp.approval.statuses[version.approvalStatus] ??
                    version.approvalStatus}
                </Tag>
              )}
            </Space>
          }
        >
          <Space orientation="vertical" className="w-full" size="middle">
            {version.changeNote && (
              <Text type="secondary">
                {mp.changeNote}: {version.changeNote}
              </Text>
            )}
            {editable && (
              <div>
                <Text strong>{mp.solutionTitle}</Text>
                <Input
                  value={title}
                  maxLength={300}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
            )}
            <div>
              <Text strong>{mp.summary}</Text>
              {editable ? (
                <Input.TextArea
                  value={summary}
                  maxLength={4000}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  placeholder={mp.summaryPlaceholder}
                  onChange={(event) => setSummary(event.target.value)}
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {version.summary || "—"}
                </div>
              )}
            </div>
            <div>
              <Text strong>{mp.design}</Text>
              {editable ? (
                <Input.TextArea
                  value={design}
                  maxLength={50000}
                  autoSize={{ minRows: 6, maxRows: 24 }}
                  placeholder={mp.designPlaceholder}
                  onChange={(event) => setDesign(event.target.value)}
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {version.design || "—"}
                </div>
              )}
            </div>
          </Space>
        </Card>
      </div>

      <FeasibilityCard
        verdict={editable ? feasibility.verdict : version.feasibility}
        note={editable ? feasibility.note : version.feasibilityNote}
        editable={editable}
        onChange={(verdict, note) => setFeasibility({ verdict, note })}
      />

      <BoqCard
        lines={editable ? boq : version.boq}
        editable={editable}
        onChange={setBoq}
      />

      <CostCard
        // Reset the labour form to what was stored after every change.
        key={JSON.stringify(solution.cost?.labor ?? [])}
        solution={solution}
      />

      <ScopeOfWorkCard
        value={
          editable
            ? sow
            : {
                inScope: version.inScope,
                outOfScope: version.outOfScope,
                deliverables: version.deliverables,
              }
        }
        editable={editable}
        onChange={setSow}
      />

      <RequirementsCard solution={solution} />

      <ClarificationsCard solution={solution} />

      <RisksCard solution={solution} />

      <DemosCard solution={solution} />

      <TorCard
        // Reset the facts form to what was stored after every change.
        key={JSON.stringify(solution.tor.facts)}
        solution={solution}
      />

      <Card
        size="small"
        title={`${mp.assumptions} · ${(editable ? assumptions : version.assumptions).length}`}
        extra={
          editable ? (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                setAssumptions((rows) => [
                  ...rows,
                  { category: "technical", text: "" },
                ])
              }
            >
              {mp.addAssumption}
            </Button>
          ) : null
        }
      >
        <Text type="secondary" className="mb-2 block text-xs">
          {mp.assumptionsHint}
        </Text>
        <Table<SolutionAssumption & { index: number }>
          size="small"
          rowKey="index"
          pagination={false}
          locale={{ emptyText: mp.assumptionsEmpty }}
          dataSource={(editable ? assumptions : version.assumptions).map(
            (row, index) => ({ ...row, index }),
          )}
          columns={[
            { title: "#", width: 48, render: (_, row) => row.index + 1 },
            {
              title: mp.assumptionCategory,
              dataIndex: "category",
              width: 240,
              render: (category: AssumptionCategory, row) =>
                editable ? (
                  <Select
                    value={category}
                    style={{ width: "100%" }}
                    onChange={(value: AssumptionCategory) =>
                      setAssumption(row.index, { category: value })
                    }
                    options={CATEGORIES.map((value) => ({
                      value,
                      label: mp.categories[value],
                    }))}
                  />
                ) : (
                  (mp.categories[category] ?? category)
                ),
            },
            {
              title: mp.assumptionText,
              dataIndex: "text",
              render: (text: string, row) =>
                editable ? (
                  <Input.TextArea
                    value={text}
                    maxLength={1000}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    onChange={(event) =>
                      setAssumption(row.index, { text: event.target.value })
                    }
                  />
                ) : (
                  <span className="whitespace-pre-wrap">{text}</span>
                ),
            },
            {
              // CD-133 — a dependency says who and by when.
              title: `${mp.assumptionOwner} / ${mp.assumptionNeededBy}`,
              key: "dependency",
              width: 260,
              render: (_: unknown, row) =>
                !DEPENDENCY_CATEGORIES.includes(row.category) ? (
                  "—"
                ) : editable ? (
                  <Space orientation="vertical" size={4} className="w-full">
                    <Input
                      value={row.owner ?? ""}
                      maxLength={200}
                      placeholder={mp.assumptionOwnerPlaceholder}
                      onChange={(event) =>
                        setAssumption(row.index, { owner: event.target.value })
                      }
                    />
                    <Input
                      type="date"
                      value={row.neededBy ?? ""}
                      onChange={(event) =>
                        setAssumption(row.index, {
                          neededBy: event.target.value || undefined,
                        })
                      }
                    />
                  </Space>
                ) : (
                  <span>
                    {row.owner ?? "—"}
                    {row.neededBy && (
                      <Text type="secondary" className="block text-xs">
                        {mp.assumptionNeededBy} {row.neededBy}
                      </Text>
                    )}
                  </span>
                ),
            },
            ...(editable
              ? [
                  {
                    key: "remove",
                    width: 48,
                    render: (_: unknown, row: { index: number }) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        aria-label={mp.removeFile}
                        onClick={() =>
                          setAssumptions((rows) =>
                            rows.filter((_, at) => at !== row.index),
                          )
                        }
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Card
        size="small"
        title={`${mp.files} · ${version.files.length}`}
        extra={
          editable ? (
            <>
              <input
                ref={fileInput}
                type="file"
                hidden
                onChange={(event) => void upload(event.target.files)}
              />
              <Button
                size="small"
                icon={<UploadOutlined />}
                loading={busy}
                onClick={() => fileInput.current?.click()}
              >
                {mp.upload}
              </Button>
            </>
          ) : null
        }
      >
        {version.files.length ? (
          <ul className="m-0 list-none space-y-1 p-0">
            {version.files.map((file) => (
              <li key={file.id} className="flex items-center gap-2">
                <a
                  href={`/api/app/${base}/files/${file.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.fileName}
                </a>
                <Text type="secondary" className="text-xs">
                  {fileSize(file.sizeBytes)} ·{" "}
                  {dayjs(file.uploadedAt).format("DD/MM/YY HH:mm")}
                </Text>
                {editable && (
                  <Popconfirm
                    title={mp.removeFile}
                    onConfirm={() => void removeFile(file.id)}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      aria-label={mp.removeFile}
                    />
                  </Popconfirm>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={mp.filesEmpty}
          />
        )}
      </Card>

      <Card size="small" title={mp.history}>
        <Table
          size="small"
          rowKey="versionNo"
          pagination={false}
          dataSource={solution.versions}
          columns={[
            {
              title: "#",
              dataIndex: "versionNo",
              render: (no: number) => (
                <Link href={`${ROUTES.solutionDetail(solution.id)}?v=${no}`}>
                  {mp.version(no)}
                </Link>
              ),
            },
            {
              title: "",
              dataIndex: "status",
              render: (status: string) => (
                <Tag color={STATUS_COLOR[status]}>
                  {mp.versionStatus[status] ?? status}
                </Tag>
              ),
            },
            {
              title: mp.changeNote,
              dataIndex: "changeNote",
              render: (note: string | null) => note ?? "—",
            },
            {
              title: mp.approval.label,
              dataIndex: "approvalStatus",
              render: (status: string, row) =>
                row.status === "draft" ? (
                  "—"
                ) : (
                  <Tag color={APPROVAL_COLOR[status]}>
                    {mp.approval.statuses[status] ?? status}
                  </Tag>
                ),
            },
            {
              title: mp.lockedAt,
              dataIndex: "lockedAt",
              render: (at: string | null) =>
                at ? dayjs(at).format("DD/MM/YY HH:mm") : "—",
            },
          ]}
        />
      </Card>

      <Modal
        open={opening}
        title={mp.newVersion}
        okText={mp.newVersionOk}
        okButtonProps={{ disabled: !changeNote.trim(), loading: busy }}
        onOk={() => void openVersion()}
        onCancel={() => setOpening(false)}
        destroyOnHidden
      >
        <Input.TextArea
          value={changeNote}
          maxLength={1000}
          autoSize={{ minRows: 3 }}
          placeholder={mp.newVersionNote}
          onChange={(event) => setChangeNote(event.target.value)}
        />
      </Modal>
    </div>
  );
}
