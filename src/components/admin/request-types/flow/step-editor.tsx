"use client";

import { useMemo, type ReactNode } from "react";
import { Alert, Input, InputNumber, Radio, Switch } from "antd";
import Text from "antd/es/typography/Text";
import Title from "antd/es/typography/Title";
import type {
  ApprovalMatrixVersion,
  DirectoryUser,
  OrgUnitNode,
  RequestType,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";
import { SubjectMatrixPanel } from "@/components/admin/approval-matrix-admin";
import { FormSchemaEditor } from "../form-schema-editor";
import { SubRequestEditor } from "../sub-request-editor";
import type { StepDraft } from "./flow-draft";
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
  typeCode,
  step,
  steps,
  fields,
  types,
  people,
  matrix,
  onChange,
}: {
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
