"use client";

import { useMemo, type ReactNode } from "react";
import { Alert, Input, InputNumber, Radio, Select, Switch } from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  InboxOutlined,
  SafetyOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import type {
  ApprovalMatrixVersion,
  DirectoryUser,
  FlowReceiverRule,
  FlowStepScope,
  OrgUnitNode,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";
import { SubjectMatrixPanel } from "@/components/admin/approval-matrix-admin";
import { FormSchemaEditor } from "../form-schema-editor";
import { SubRequestEditor } from "../sub-request-editor";
import { RequiredDocs } from "../coded-label-editors";
import { kindUses, STEP_KINDS, type StepDraft } from "./flow-draft";
import { StepApprovalLevels } from "./step-approval-levels";
import { BackwardEditor, TransitionEditor } from "./transition-editor";

const t = messages.requestTypes.flow;

export interface MatrixContext {
  readonly canManage: boolean;
  readonly companyId: string;
  readonly versions: ApprovalMatrixVersion[];
  readonly userNames: Record<string, string>;
  readonly orgUnits: OrgUnitNode[];
  readonly onPublished: () => void | Promise<void>;
}

/** Everything one step carries: name, owner, form, children, exit ladder, exits. */
export function StepEditor({
  schemaVersion,
  typeCode,
  step,
  steps,
  fields,
  types,
  people,
  matrix,
  onChange,
}: {
  /** 2 shows the step-type picker and only the parts that type uses. */
  readonly schemaVersion: 1 | 2;
  readonly typeCode: string;
  readonly step: StepDraft;
  readonly steps: readonly StepDraft[];
  readonly fields: readonly { value: string; label: string }[];
  readonly types: readonly RequestType[];
  readonly people: readonly DirectoryUser[];
  readonly matrix: MatrixContext;
  readonly onChange: (patch: Partial<StepDraft>) => void;
}) {
  const peopleOptions = useMemo(
    () => people.map((person) => ({ value: person.id, label: person.displayName })),
    [people],
  );
  const codeValid = /^[A-Z0-9_]{1,32}$/.test(step.code);

  if (schemaVersion === 2) {
    return (
      <V2StepBody
        step={step}
        steps={steps}
        fields={fields}
        types={types}
        typeCode={typeCode}
        peopleOptions={peopleOptions}
        orgUnits={matrix.orgUnits}
        codeValid={codeValid}
        onChange={onChange}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Section title={t.sectionBasic}>
        <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
          <label className="block">
            <Text strong>{t.stepName}</Text>
            <Input
              className="mt-1"
              value={step.name}
              onChange={(event) => onChange({ name: event.target.value })}
            />
          </label>
          <label className="block">
            <Text strong>{t.stepCode}</Text>
            <Input
              className="mt-1 font-mono"
              status={codeValid ? undefined : "error"}
              value={step.code}
              onChange={(event) =>
                onChange({ code: event.target.value.toUpperCase().replace(/\s+/g, "_") })
              }
            />
            <Text type="secondary" className="block text-xs">
              {t.stepCodeHint}
            </Text>
          </label>
        </div>

        <div className="space-y-1">
          <Text strong className="block">
            {t.assignee}
          </Text>
          <Radio.Group
            value={step.assignee.type}
            onChange={(event) => {
              const type = String(event.target.value);
              onChange({
                assignee:
                  type === "user"
                    ? { type: "user", userId: peopleOptions[0]?.value ?? "" }
                    : type === "requester"
                      ? { type: "requester" }
                      : { type: "keep" },
              });
            }}
            options={[
              { value: "keep", label: t.assigneeKeep },
              { value: "requester", label: t.assigneeRequester },
              { value: "user", label: t.assigneeUser },
            ]}
          />
          {step.assignee.type === "user" && (
            <SearchSelect
              className="w-full max-w-md"
              placeholder={t.assigneeUserPlaceholder}
              value={step.assignee.userId || undefined}
              options={peopleOptions}
              onChange={(userId: string) => onChange({ assignee: { type: "user", userId } })}
            />
          )}
        </div>

        <label className="block max-w-xs">
          <Text strong>{t.sla}</Text>
          <InputNumber
            className="mt-1 w-full"
            min={1}
            value={step.slaHours ?? undefined}
            onChange={(value) => onChange({ slaHours: typeof value === "number" ? value : null })}
          />
          <Text type="secondary" className="block text-xs">
            {t.slaHint}
          </Text>
        </label>
      </Section>

      <Section title={t.sectionForm}>
        <Text type="secondary" className="block text-xs">
          {t.sectionFormHint}
        </Text>
        <FormSchemaEditor rows={step.rows} onChange={(rows) => onChange({ rows })} />
      </Section>

      <Section title={t.sectionSubRequests}>
        <SubRequestEditor
          ownCode={typeCode}
          entries={step.subRequests}
          types={types}
          onChange={(subRequests) => onChange({ subRequests })}
        />
      </Section>

      <Section title={t.sectionApproval}>
        <label className="flex items-center gap-2">
          <Switch
            checked={step.requiresApproval}
            onChange={(requiresApproval) => onChange({ requiresApproval })}
          />
          <Text>{t.requiresApproval}</Text>
        </label>
        {step.requiresApproval &&
          (codeValid ? (
            <>
              <Alert type="info" showIcon title={t.approvalHint} />
              {matrix.canManage ? (
                <SubjectMatrixPanel
                  subject={`request:${typeCode}:step:${step.code}`}
                  companyId={matrix.companyId}
                  versions={matrix.versions}
                  canManage={matrix.canManage}
                  userNames={matrix.userNames}
                  orgUnits={matrix.orgUnits}
                  onPublished={matrix.onPublished}
                  conditionFields={fields}
                />
              ) : (
                <Alert type="warning" showIcon title={messages.matrix.noPermission} />
              )}
            </>
          ) : (
            <Alert type="warning" showIcon title={t.approvalSaveFirst} />
          ))}
      </Section>

      <Section title={t.sectionExits}>
        <TransitionEditor
          step={step}
          steps={steps}
          fields={fields}
          onChange={(forward) => onChange({ forward })}
        />
      </Section>

      <Section title={t.sectionBackward}>
        <BackwardEditor
          step={step}
          steps={steps}
          onChange={(backward) => onChange({ backward })}
        />
      </Section>
    </div>
  );
}

const KIND_ICONS: Record<FlowStepScope, ReactNode> = {
  draft: <EditOutlined />,
  returned: <EditOutlined />,
  pending_approval: <SafetyOutlined />,
  submitted: <InboxOutlined />,
  in_progress: <ToolOutlined />,
  approved: <CheckCircleOutlined />,
};

/** The step's type first, then only the sections that type uses. */
function V2StepBody({
  step,
  steps,
  fields,
  types,
  typeCode,
  peopleOptions,
  orgUnits,
  codeValid,
  onChange,
}: {
  readonly step: StepDraft;
  readonly steps: readonly StepDraft[];
  readonly fields: readonly { value: string; label: string }[];
  readonly types: readonly RequestType[];
  readonly typeCode: string;
  readonly peopleOptions: readonly { value: string; label: string }[];
  readonly orgUnits: readonly OrgUnitNode[];
  readonly codeValid: boolean;
  readonly onChange: (patch: Partial<StepDraft>) => void;
}) {
  const uses = kindUses(step.kind);
  const otherSteps = steps
    .filter((other) => other.code !== step.code)
    .map((other) => ({ value: other.code, label: other.name }));

  function chooseKind(kind: FlowStepScope) {
    // A new approval step starts with the requester's own head, as the matrix screen does.
    const needsLadder =
      kind === "pending_approval" && !step.approvalLevels.length;
    onChange({
      kind,
      ...(needsLadder
        ? {
            approvalLevels: [
              { type: "supervisor", up: 1, chartOf: "requester" },
            ],
          }
        : {}),
    });
  }

  return (
    <div className="space-y-5">
      <Section title={t.sectionKind}>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {STEP_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => chooseKind(kind)}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-left transition-colors ${
                step.kind === kind
                  ? "border-[var(--app-primary,#2F6FED)] bg-[#2F6FED0d]"
                  : "border-black/10 hover:border-black/25"
              }`}
            >
              <span className="mt-0.5 text-base">{KIND_ICONS[kind]}</span>
              <span className="min-w-0">
                <Text strong className="block">
                  {t.kinds[kind].label}
                </Text>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.sectionBasic}>
        <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
          <label className="block">
            <Text strong>{t.stepName}</Text>
            <Input
              className="mt-1"
              value={step.name}
              onChange={(event) => onChange({ name: event.target.value })}
            />
          </label>
          <label className="block">
            <Text strong>{t.stepCode}</Text>
            <Input
              className="mt-1 font-mono"
              status={codeValid ? undefined : "error"}
              value={step.code}
              onChange={(event) =>
                onChange({
                  code: event.target.value.toUpperCase().replace(/\s+/g, "_"),
                })
              }
            />
          </label>
        </div>
        {!uses.approval && (
          <label className="block max-w-xs">
            <Text strong>{t.sla}</Text>
            <InputNumber
              className="mt-1 w-full"
              min={1}
              value={step.slaHours ?? undefined}
              onChange={(value) =>
                onChange({ slaHours: typeof value === "number" ? value : null })
              }
            />
            <Text type="secondary" className="block text-xs">
              {t.slaHint}
            </Text>
          </label>
        )}
      </Section>

      {uses.approval && (
        <Section title={t.sectionApprovers}>
          <Text type="secondary" className="block text-xs">
            {t.approversHint}
          </Text>
          <StepApprovalLevels
            key={step.code}
            levels={step.approvalLevels}
            orgUnits={orgUnits}
            conditionFields={fields}
            onChange={(approvalLevels) => onChange({ approvalLevels })}
          />
          <label className="block max-w-md">
            <Text strong>{t.returnTo}</Text>
            <Select
              className="mt-1 w-full"
              placeholder={t.returnToPlaceholder}
              status={step.returnTo ? undefined : "warning"}
              value={step.returnTo ?? undefined}
              options={otherSteps}
              onChange={(returnTo: string) => onChange({ returnTo })}
            />
          </label>
        </Section>
      )}

      {uses.receiver && (
        <Section title={t.sectionReceiver}>
          <ReceiverRuleField
            rule={step.receiver}
            peopleOptions={peopleOptions}
            stepOptions={otherSteps}
            onChange={(receiver) => onChange({ receiver })}
          />
        </Section>
      )}

      {uses.form && (
        <Section title={t.sectionForm}>
          <Text type="secondary" className="block text-xs">
            {t.sectionFormHint}
          </Text>
          <FormSchemaEditor
            rows={step.rows}
            onChange={(rows) => onChange({ rows })}
          />
        </Section>
      )}

      {uses.docs && (
        <Section title={t.sectionDocs}>
          <RequiredDocs
            entries={step.requiredDocs}
            onChange={(requiredDocs) => onChange({ requiredDocs })}
          />
        </Section>
      )}

      {uses.subRequests && (
        <Section title={t.sectionSubRequests}>
          <SubRequestEditor
            ownCode={typeCode}
            entries={step.subRequests}
            types={types}
            onChange={(subRequests) => onChange({ subRequests })}
          />
        </Section>
      )}

      <Section title={t.sectionExits}>
        <TransitionEditor
          step={step}
          steps={steps}
          fields={fields}
          onChange={(forward) => onChange({ forward })}
        />
      </Section>

      {/* An approval step sends work back through `returnTo`, not backward exits. */}
      {!uses.approval && (
        <Section title={t.sectionBackward}>
          <BackwardEditor
            step={step}
            steps={steps}
            onChange={(backward) => onChange({ backward })}
          />
        </Section>
      )}
    </div>
  );
}

/** Who receives a `submitted` or `in_progress` step on entry. */
function ReceiverRuleField({
  rule,
  peopleOptions,
  stepOptions,
  onChange,
}: {
  readonly rule: FlowReceiverRule;
  readonly peopleOptions: readonly { value: string; label: string }[];
  readonly stepOptions: readonly { value: string; label: string }[];
  readonly onChange: (rule: FlowReceiverRule) => void;
}) {
  return (
    <div className="space-y-2">
      <Radio.Group
        value={rule.type}
        onChange={(event) => {
          const type = String(event.target.value);
          onChange(
            type === "user"
              ? { type: "user", userId: peopleOptions[0]?.value ?? "" }
              : type === "step"
                ? { type: "step", stepCode: stepOptions[0]?.value ?? "" }
                : type === "receiver"
                  ? { type: "receiver" }
                  : { type: "keep" },
          );
        }}
        options={[
          { value: "keep", label: t.receiverKeep },
          { value: "receiver", label: t.receiverDefault },
          { value: "user", label: t.receiverUser },
          { value: "step", label: t.receiverStep },
        ]}
      />
      {rule.type === "user" && (
        <SearchSelect
          className="w-full max-w-md"
          placeholder={t.assigneeUserPlaceholder}
          value={rule.userId || undefined}
          options={[...peopleOptions]}
          onChange={(userId: string) => onChange({ type: "user", userId })}
        />
      )}
      {rule.type === "step" && (
        <Select
          className="w-full max-w-md"
          placeholder={t.receiverStepPlaceholder}
          value={rule.stepCode || undefined}
          options={[...stepOptions]}
          onChange={(stepCode: string) => onChange({ type: "step", stepCode })}
        />
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-black/5 pt-4 first:border-t-0 first:pt-0">
      <Title level={5} className="mb-0!">
        {title}
      </Title>
      {children}
    </section>
  );
}
