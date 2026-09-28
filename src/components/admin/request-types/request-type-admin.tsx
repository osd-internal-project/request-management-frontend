"use client";

import { useState } from "react";
import { Alert, App, Button, Card, Empty, Modal, Segmented, Tabs } from "antd";
import {
  deleteRequestType,
  updateRequestType,
} from "@/lib/api/client-requests";
import { adminApi } from "@/lib/api/client";
import type {
  ApprovalMatrixVersion,
  DirectoryUser,
  OrgUnitNode,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import {
  SubjectMatrixPanel,
  subjectOf,
} from "@/components/admin/approval-matrix-admin";
import { NewTypeDialog } from "./new-type-dialog";
import { TypeDetailForm } from "./type-detail-form";
import { draftFrom, draftToPatch, type TypeDraft } from "./type-draft";
import { TypeActions, TypeTitle } from "./type-header";
import { TypeList } from "./type-list";
import { FlowTab } from "./flow/flow-tab";

/**
 * The detail pane's tabs. `approval` switches between the `:pre` ladder (before
 * the work) and the plain one (after it); step ladders live in `flow`.
 */
const TAB_KEYS = ["detail", "flow", "approval"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(key: string): key is TabKey {
  return (TAB_KEYS as readonly string[]).includes(key);
}

/**
 * Both columns fill the space under the page title on large screens and scroll
 * inside themselves, so บันทึก never leaves the screen. 240px = app header,
 * page padding, title and company tabs.
 */
const PANE = "lg:flex lg:h-[calc(100vh-240px)] lg:flex-col";

/**
 * Screen §16 A2 — ประเภทคำขอ.
 *
 * The whole screen exists to keep REQ-01's promise: the 3rd..30th request type
 * is added here, not in a migration. Saving affects **new requests only** —
 * work in flight keeps the snapshot it was raised under (§7).
 */
export function RequestTypeAdmin({
  types: initial,
  orgUnits,
  companies,
  companyId,
  matrixVersions: initialMatrix,
  userNames,
  people,
  canManageMatrix,
}: {
  readonly types: RequestType[];
  /** For the `ทีมผู้รับ` selector — same source A3 uses. */
  readonly orgUnits: OrgUnitNode[];
  /** D-18: each company has its own catalog *and* its own approval ladders. */
  readonly companies: readonly { readonly id: string; readonly name: string }[];
  readonly companyId: string;
  /** Every ladder the company has; each approval tab keeps its own subject's. */
  readonly matrixVersions: readonly ApprovalMatrixVersion[];
  /** `userId` → display name, for naming who published a ladder version. */
  readonly userNames: Readonly<Record<string, string>>;
  /** For the ผู้รับเรื่องประจำ picker. */
  readonly people: readonly DirectoryUser[];
  /** `admin.approval-matrix.manage`; false leaves the approval tabs read-only. */
  readonly canManageMatrix: boolean;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const [types, setTypes] = useState(initial);
  const [activeCompany, setActiveCompany] = useState(companyId);
  const [matrixVersions, setMatrixVersions] = useState<ApprovalMatrixVersion[]>([
    ...initialMatrix,
  ]);
  const [tab, setTab] = useState<TabKey>("detail");
  const [approvalStage, setApprovalStage] = useState<"pre" | "post">("post");
  const [selectedCode, setSelectedCode] = useState<string | null>(
    initial[0]?.code ?? null,
  );
  const [draft, setDraft] = useState<TypeDraft>(() => draftFrom(initial[0]));
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = types.find((type) => type.code === selectedCode) ?? null;
  const companyName =
    companies.find((company) => company.id === activeCompany)?.name ?? null;

  function replaceType(updated: RequestType) {
    setTypes((current) =>
      current.map((type) =>
        type.code === updated.code ? { ...type, ...updated } : type,
      ),
    );
  }

  /** The company's ladders, re-read after publishing one. */
  async function loadMatrix(forCompany: string) {
    if (!canManageMatrix) return;

    const matrix = await adminApi<ApprovalMatrixVersion[]>(
      `approval-matrix?company_id=${encodeURIComponent(forCompany)}`,
    );

    setMatrixVersions(matrix.ok ? matrix.data : []);
  }

  /**
   * Catalog and ladders are re-read together, and the selection is dropped
   * rather than carried over: company B need not run the same kinds of work as
   * company A, and a stale code would leave the pane editing a type this
   * company has never had.
   */
  async function loadCompany(nextCompanyId: string) {
    setActiveCompany(nextCompanyId);
    setSelectedCode(null);
    setTab("detail");
    setError(null);

    const [catalog] = await Promise.all([
      adminApi<RequestType[]>(
        `request-types?company_id=${encodeURIComponent(nextCompanyId)}`,
      ),
      loadMatrix(nextCompanyId),
    ]);

    setTypes(catalog.ok ? catalog.data : []);
  }

  function select(type: RequestType) {
    setSelectedCode(type.code);
    // The approval tabs belong to the type that was open; landing on one of
    // them after switching types would read as that type's ladder.
    setTab("detail");
    setDraft(draftFrom(type));
    setError(null);
  }

  async function save() {
    if (!selected) return;

    setSaving(true);
    setError(null);

    const result = await updateRequestType(selected.code, draftToPatch(draft));

    if (result.ok) {
      replaceType(result.data);
      void message.success(messages.requestTypes.saved);
    } else setError(result.message);

    setSaving(false);
  }

  async function toggleActive() {
    if (!selected) return;

    setToggling(true);

    const result = await updateRequestType(selected.code, {
      active: !selected.active,
    });

    // A toast, not the form's alert: the switch is reachable from every tab.
    if (result.ok) {
      replaceType(result.data);
      void message.success(
        result.data.active
          ? messages.requestTypes.enabled
          : messages.requestTypes.disabled,
      );
    } else void message.error(result.message);

    setToggling(false);
  }

  /**
   * Removes a type outright. The backend refuses once anything has been raised
   * against it and says so, which is a better answer than any wording here —
   * a type with history should be switched off, not erased.
   */
  function remove() {
    if (!selected) return;
    const target = selected;

    Modal.confirm({
      title: messages.requestTypes.deleteConfirm(target.name),
      content: messages.requestTypes.deleteConfirmBody,
      okText: messages.org.confirmOk,
      cancelText: messages.org.confirmCancel,
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await deleteRequestType(target.code);

        if (!result.ok) {
          void message.error(result.message);
          return;
        }

        void message.success(messages.requestTypes.deleted);
        setTypes((current) =>
          current.filter((type) => type.code !== target.code),
        );
        setSelectedCode(null);
      },
    });
  }

  /**
   * One approval tab's body. Without `admin.approval-matrix.manage` the tab
   * explains why it is empty rather than fetching into a guaranteed 403.
   */
  function approvalPanel(subject: string) {
    if (!canManageMatrix) {
      return <Alert type="info" showIcon title={messages.matrix.noPermission} />;
    }

    return (
      <SubjectMatrixPanel
        subject={subject}
        companyId={activeCompany}
        versions={matrixVersions}
        canManage={canManageMatrix}
        userNames={userNames}
        orgUnits={orgUnits}
        onPublished={() => loadMatrix(activeCompany)}
        conditionFields={Object.entries(selected?.formSchema?.properties ?? {}).map(
          ([key, property]) => ({ value: key, label: property.title || key }),
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/*
        One switcher for the whole screen. The catalog and the ladders are both
        per-company (D-18), and two selectors would let the list and the
        approval tabs show different companies at once.
      */}
      <div className="flex flex-wrap items-center gap-3">
        {companies.length > 1 && (
          <Segmented
            value={activeCompany}
            onChange={(key) => void loadCompany(String(key))}
            options={companies.map((company) => ({
              value: company.id,
              // The seed already names companies "บริษัท B"; prefixing again
              // would read "บริษัท บริษัท B".
              label: company.name,
            }))}
          />
        )}

        <div className="flex-1" />

        <Button type="primary" onClick={() => setCreating(true)}>
          {messages.requestTypes.newTypeTitle}
        </Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <TypeList
          types={types}
          orgUnits={orgUnits}
          selectedCode={selectedCode}
          companyName={companyName}
          className={PANE}
          onSelect={select}
        />

        <Card
          className={PANE}
          classNames={{ body: "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col" }}
          title={
            selected ? (
              <TypeTitle
                type={selected}
                toggling={toggling}
                onToggleActive={() => void toggleActive()}
              />
            ) : (
              messages.requestTypes.selectFirst
            )
          }
          extra={
            selected && (
              <TypeActions
                showSave={tab === "detail"}
                saving={saving}
                onSave={() => void save()}
                onDelete={remove}
              />
            )
          }
        >
          {!selected ? (
            <Empty description={messages.requestTypes.selectFirst} />
          ) : (
            /*
              `card` on the outer tabs and `line` on the form tabs inside
              รายละเอียด, so the two levels read as two. On large screens the
              tab bar stays put and only `.ant-tabs-body-holder` (antd 6's name
              for the panel wrapper) scrolls.
            */
            <Tabs
              type="card"
              className="lg:min-h-0 lg:flex-1 lg:[&>.ant-tabs-body-holder]:overflow-y-auto lg:[&>.ant-tabs-body-holder]:pr-2"
              activeKey={tab}
              onChange={(key) => {
                if (isTabKey(key)) setTab(key);
              }}
              items={[
                {
                  key: "detail",
                  label: messages.requestTypes.tabDetail,
                  children: (
                    <TypeDetailForm
                      code={selectedCode}
                      draft={draft}
                      error={error}
                      orgUnits={orgUnits}
                      people={people}
                      types={types}
                      onChange={(patch) =>
                        setDraft((current) => ({ ...current, ...patch }))
                      }
                    />
                  ),
                },
                {
                  key: "flow",
                  label: messages.requestTypes.tabFlow,
                  children: (
                    // Remounted per type and company: the draft belongs to the pair.
                    <FlowTab
                      key={`${selected.code}:${activeCompany}`}
                      type={selected}
                      types={types}
                      people={people}
                      matrix={{
                        canManage: canManageMatrix,
                        companyId: activeCompany,
                        versions: matrixVersions,
                        userNames,
                        orgUnits,
                        onPublished: () => loadMatrix(activeCompany),
                      }}
                    />
                  ),
                },
                {
                  key: "approval",
                  label: messages.requestTypes.tabApproval,
                  children: (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Segmented
                          value={approvalStage}
                          onChange={(value) =>
                            setApprovalStage(value === "pre" ? "pre" : "post")
                          }
                          options={[
                            { value: "pre", label: messages.requestTypes.approvalBefore },
                            { value: "post", label: messages.requestTypes.approvalAfter },
                          ]}
                        />
                        <span className="text-xs text-black/45">
                          {messages.requestTypes.approvalStepHint}
                        </span>
                      </div>
                      {approvalPanel(
                        approvalStage === "pre"
                          ? `${subjectOf(selected)}:pre`
                          : subjectOf(selected),
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>

      {/* Remounted per opening, so a cancelled entry does not come back. */}
      <NewTypeDialog
        key={creating ? "open" : "closed"}
        open={creating}
        companyId={activeCompany}
        onClose={() => setCreating(false)}
        onCreated={(type) => {
          setTypes((current) => [...current, type]);
          setCreating(false);
          select(type);
        }}
      />
    </div>
  );
}
