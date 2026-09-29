"use client";

import { Button, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  ApartmentOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  FormOutlined,
  InboxOutlined,
  SafetyOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import type { FlowStepScope } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import type { FlowDraft, StepDraft } from "./flow-draft";

const t = messages.requestTypes.flow;

/** One colour and icon per v2 step type, so the list reads as a path of roles. */
const KIND_TAG: Record<FlowStepScope, { color: string; icon: ReactNode }> = {
  draft: { color: "blue", icon: <EditOutlined /> },
  returned: { color: "blue", icon: <EditOutlined /> },
  pending_approval: { color: "gold", icon: <SafetyOutlined /> },
  submitted: { color: "cyan", icon: <InboxOutlined /> },
  in_progress: { color: "geekblue", icon: <ToolOutlined /> },
  approved: { color: "green", icon: <CheckCircleOutlined /> },
};

/** The steps in order, each with what it carries and where it leads. */
export function StepList({
  draft,
  selectedCode,
  fieldLabel,
  onSelect,
  onMove,
  onRemove,
  onAdd,
}: {
  readonly draft: FlowDraft;
  readonly selectedCode: string | null;
  readonly fieldLabel: (key: string) => string;
  readonly onSelect: (code: string) => void;
  readonly onMove: (code: string, offset: -1 | 1) => void;
  readonly onRemove: (code: string) => void;
  readonly onAdd: () => void;
}) {
  const nameOf = (code: string) =>
    draft.steps.find((step) => step.code === code)?.name ?? code;

  return (
    <div className="space-y-2">
      {draft.schemaVersion === 1 && (
        <Text type="secondary" className="block text-xs">
          {t.start}
        </Text>
      )}

      {draft.steps.length === 0 && (
        <Text type="secondary" className="block py-4 text-center">
          {t.emptySteps}
        </Text>
      )}

      {draft.steps.map((step, index) => (
        <div
          key={step.code}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(step.code)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onSelect(step.code);
          }}
          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
            step.code === selectedCode
              ? "border-[var(--app-primary,#2F6FED)] bg-[#2F6FED0d]"
              : "border-black/10 hover:border-black/25"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs font-semibold">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <Text strong className="block truncate">
                {step.name}
              </Text>
              <Text type="secondary" className="font-mono text-xs">
                {step.code}
              </Text>
              <StepBadges
                step={step}
                v2={draft.schemaVersion === 2}
                nameOf={nameOf}
              />
            </div>
            <span
              className="flex shrink-0 items-center"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                size="small"
                type="text"
                aria-label={t.moveUp}
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => onMove(step.code, -1)}
              />
              <Button
                size="small"
                type="text"
                aria-label={t.moveDown}
                icon={<ArrowDownOutlined />}
                disabled={index === draft.steps.length - 1}
                onClick={() => onMove(step.code, 1)}
              />
              <Button
                size="small"
                type="text"
                danger
                aria-label={t.removeStep}
                icon={<DeleteOutlined />}
                onClick={() => onRemove(step.code)}
              />
            </span>
          </div>

          <ExitSummary step={step} nameOf={nameOf} fieldLabel={fieldLabel} />
        </div>
      ))}

      <Button type="dashed" block onClick={onAdd}>
        {t.addStep}
      </Button>

      {draft.schemaVersion === 1 && (
        <Text type="secondary" className="block text-xs">
          {t.end}
        </Text>
      )}
    </div>
  );
}

/** Tablet: the same steps as a strip that scrolls sideways above the editor. */
export function StepStrip({
  draft,
  selectedCode,
  onSelect,
  onAdd,
}: {
  readonly draft: FlowDraft;
  readonly selectedCode: string | null;
  readonly onSelect: (code: string) => void;
  readonly onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {draft.steps.map((step, index) => (
        <span key={step.code} className="flex shrink-0 items-center gap-2">
          {index > 0 && <Text type="secondary">→</Text>}
          <Button
            type={step.code === selectedCode ? "primary" : "default"}
            onClick={() => onSelect(step.code)}
          >
            {index + 1}. {step.name}
            {draft.schemaVersion === 2 && (
              <Text type="secondary" className="text-xs">
                · {t.kinds[step.kind].label}
              </Text>
            )}
          </Button>
        </span>
      ))}
      <Button type="dashed" className="shrink-0" onClick={onAdd}>
        {t.addStep}
      </Button>
    </div>
  );
}

function StepBadges({
  step,
  v2,
  nameOf,
}: {
  readonly step: StepDraft;
  readonly v2: boolean;
  readonly nameOf: (code: string) => string;
}) {
  if (v2) {
    const kind = KIND_TAG[step.kind];
    return (
      <span className="mt-1 flex flex-wrap gap-1">
        <Tag className="m-0!" color={kind.color} icon={kind.icon}>
          {t.kinds[step.kind].label}
          {step.kind === "pending_approval" &&
            ` · ${t.approvalSummary(step.approvalLevels.length)}`}
        </Tag>
        {step.kind === "pending_approval" && step.returnTo && (
          <Tag className="m-0!">{t.backTo(nameOf(step.returnTo))}</Tag>
        )}
        {step.rows.length > 0 && (
          <Tag className="m-0!" icon={<FormOutlined />}>
            {t.badgeForm}
          </Tag>
        )}
        {step.requiredDocs.length > 0 && (
          <Tag className="m-0!" icon={<FileTextOutlined />}>
            {t.badgeDocs}
          </Tag>
        )}
        {step.subRequests.length > 0 && (
          <Tag className="m-0!" icon={<ApartmentOutlined />}>
            {t.badgeSubRequests}
          </Tag>
        )}
      </span>
    );
  }

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {step.requiresApproval && (
        <Tag className="m-0!" color="gold" icon={<SafetyOutlined />}>
          {t.badgeApproval}
        </Tag>
      )}
      {step.rows.length > 0 && (
        <Tag className="m-0!" icon={<FormOutlined />}>
          {t.badgeForm}
        </Tag>
      )}
      {step.subRequests.length > 0 && (
        <Tag className="m-0!" icon={<ApartmentOutlined />}>
          {t.badgeSubRequests}
        </Tag>
      )}
    </span>
  );
}

function ExitSummary({
  step,
  nameOf,
  fieldLabel,
}: {
  readonly step: StepDraft;
  readonly nameOf: (code: string) => string;
  readonly fieldLabel: (key: string) => string;
}) {
  if (!step.forward.length && !step.backward.length) {
    return (
      <Text type="secondary" className="mt-1 block text-xs">
        {t.lastStep}
      </Text>
    );
  }

  return (
    <ul className="m-0 mt-1 list-none space-y-0.5 p-0 text-xs">
      {step.forward.map((exit, index) => (
        <li key={`f-${index}`} className="text-black/60">
          {step.forward.length > 1 ? (index === step.forward.length - 1 ? "└ " : "├ ") : "→ "}
          {exit.condition
            ? t.exitIf(
                fieldLabel(exit.condition.field),
                t.ops[exit.condition.op],
                Array.isArray(exit.condition.value)
                  ? exit.condition.value.join(", ")
                  : String(exit.condition.value ?? ""),
              )
            : step.forward.length > 1
              ? t.exitOtherwise
              : ""}{" "}
          → {nameOf(exit.to)}
        </li>
      ))}
      {step.backward.map((to) => (
        <li key={`b-${to}`} className="text-black/60">
          {t.backTo(nameOf(to))}
        </li>
      ))}
    </ul>
  );
}
