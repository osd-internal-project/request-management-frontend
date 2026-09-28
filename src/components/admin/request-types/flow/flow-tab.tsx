"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Drawer, Dropdown, Empty, Grid, Spin, Tag } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import { HistoryOutlined } from "@ant-design/icons";
import { getRequestFlows, publishRequestFlow } from "@/lib/api/client-requests";
import type { ClientResult } from "@/lib/api/client";
import type {
  DirectoryUser,
  RequestFlowVersion,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { rowsFromSchema } from "../schema-rows";
import {
  addStep,
  conditionFields,
  draftFromVersion,
  draftToPayload,
  moveStep,
  removeStep,
  updateStep,
  type FlowDraft,
  type StepDraft,
} from "./flow-draft";
import { PublishFlowDialog } from "./publish-flow-dialog";
import { StepEditor, type MatrixContext } from "./step-editor";
import { StepList, StepStrip } from "./step-list";

const t = messages.requestTypes.flow;

/**
 * The "ขั้นตอน" tab: edit a draft of the type's step flow and publish it as the
 * next version. Two columns on desktop, a strip on tablet, a bottom drawer on phones.
 */
export function FlowTab({
  type,
  types,
  people,
  matrix,
}: {
  readonly type: RequestType;
  readonly types: readonly RequestType[];
  readonly people: readonly DirectoryUser[];
  readonly matrix: MatrixContext;
}) {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [versions, setVersions] = useState<RequestFlowVersion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<FlowDraft>({ steps: [] });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<{ field: string; reason: string }[]>([]);

  const apply = useCallback((result: ClientResult<RequestFlowVersion[]>) => {
    if (!result.ok) {
      setLoadError(result.message);
      setVersions([]);
      return;
    }
    setLoadError(null);
    setVersions(result.data);
    const published = draftFromVersion(result.data[0] ?? null);
    setDraft(published);
    setSelectedCode(published.steps[0]?.code ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getRequestFlows(type.code, matrix.companyId).then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [type.code, matrix.companyId, apply]);

  async function reload() {
    apply(await getRequestFlows(type.code, matrix.companyId));
  }

  const live = useMemo(() => draftFromVersion(versions?.[0] ?? null), [versions]);
  const typeRows = useMemo(() => rowsFromSchema(type.formSchema), [type.formSchema]);
  const fields = useMemo(() => conditionFields(typeRows, draft), [typeRows, draft]);
  const fieldLabel = (key: string) =>
    fields.find((field) => field.value === key)?.label ?? key;
  const dirty = JSON.stringify(live) !== JSON.stringify(draft);
  const nextVersion = (versions?.[0]?.version ?? 0) + 1;
  const selected = draft.steps.find((step) => step.code === selectedCode) ?? null;
  const isDesktop = Boolean(screens.lg);
  const isTablet = Boolean(screens.md) && !isDesktop;

  function select(code: string) {
    setSelectedCode(code);
    if (!screens.md) setDrawerOpen(true);
  }

  function patchSelected(patch: Partial<StepDraft>) {
    if (!selectedCode) return;
    setDraft((current) => updateStep(current, selectedCode, patch));
    if (patch.code !== undefined) setSelectedCode(patch.code);
  }

  function add() {
    const next = addStep(draft, t.newStepName(draft.steps.length + 1));
    setDraft(next);
    select(next.steps[next.steps.length - 1].code);
  }

  function remove(code: string) {
    setDraft((current) => removeStep(current, code));
    if (selectedCode === code) setSelectedCode(null);
  }

  async function publish() {
    setPublishing(true);
    setErrors([]);
    const result = await publishRequestFlow(
      type.code,
      draftToPayload(draft, matrix.companyId),
    );
    setPublishing(false);

    if (!result.ok) {
      setErrors(result.details ?? [{ field: "flow", reason: result.message }]);
      return;
    }

    setConfirming(false);
    void message.success(t.published);
    await reload();
  }

  if (versions === null) {
    return (
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    );
  }

  const editor = selected ? (
    <StepEditor
      typeCode={type.code}
      step={selected}
      steps={draft.steps}
      fields={fields}
      types={types}
      people={people}
      matrix={matrix}
      onChange={patchSelected}
    />
  ) : (
    <Empty description={t.selectStep} />
  );

  const list = (
    <StepList
      draft={draft}
      selectedCode={selectedCode}
      fieldLabel={fieldLabel}
      onSelect={select}
      onMove={(code, offset) => setDraft((current) => moveStep(current, code, offset))}
      onRemove={remove}
      onAdd={add}
    />
  );

  return (
    <div className="space-y-4">
      <Paragraph type="secondary" className="mb-0!">
        {t.intro}
      </Paragraph>
      {loadError && <Alert type="error" showIcon title={loadError} />}

      <div className="flex flex-wrap items-center gap-2">
        {versions[0] ? (
          <Tag color="green" className="m-0!">
            {t.current(versions[0].version)}
          </Tag>
        ) : (
          <Text type="secondary">{t.none}</Text>
        )}
        {versions.length > 0 && (
          <Dropdown
            menu={{
              items: versions.map((version) => ({
                key: version.id,
                label: t.historyItem(
                  version.version,
                  new Date(version.publishedAt).toLocaleString("th-TH"),
                  (version.publishedBy && matrix.userNames[version.publishedBy]) || "—",
                ),
              })),
            }}
          >
            <Button size="small" icon={<HistoryOutlined />}>
              {t.history}
            </Button>
          </Dropdown>
        )}
        <span className="flex-1" />
        {dirty && (
          <>
            <Text type="warning" className="text-xs">
              {t.unsaved}
            </Text>
            <Button size="small" onClick={() => setDraft(live)}>
              {t.reset}
            </Button>
          </>
        )}
        <Button
          type="primary"
          disabled={!dirty || draft.steps.length === 0}
          onClick={() => {
            setErrors([]);
            setConfirming(true);
          }}
        >
          {t.publish(nextVersion)}
        </Button>
      </div>

      {isDesktop && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          {list}
          <div className="rounded-lg border border-black/10 p-4">{editor}</div>
        </div>
      )}

      {isTablet && (
        <div className="space-y-3">
          <StepStrip
            draft={draft}
            selectedCode={selectedCode}
            onSelect={select}
            onAdd={add}
          />
          <div className="rounded-lg border border-black/10 p-4">{editor}</div>
        </div>
      )}

      {!isDesktop && !isTablet && (
        <>
          {list}
          <Drawer
            placement="bottom"
            size="90%"
            open={drawerOpen && selected !== null}
            title={selected?.name ?? t.editStep}
            onClose={() => setDrawerOpen(false)}
            footer={
              <Button type="primary" block onClick={() => setDrawerOpen(false)}>
                {t.done}
              </Button>
            }
          >
            {editor}
          </Drawer>
        </>
      )}

      <PublishFlowDialog
        open={confirming}
        nextVersion={nextVersion}
        draft={draft}
        current={live}
        busy={publishing}
        errors={errors}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void publish()}
      />
    </div>
  );
}
