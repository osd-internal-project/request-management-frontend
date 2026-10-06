"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  InputNumber,
  Popconfirm,
  Switch,
  Tag,
} from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { adminApi } from "@/lib/api/client";
import type {
  NotificationRuleRow,
  RuleParams,
} from "@/lib/api/notification-rules/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.notificationRules;

const MODULE_LABEL: Record<NotificationRuleRow["module"], string> = {
  crm: m.moduleCrm,
  finance: m.moduleFinance,
  pm: m.modulePm,
  kb: m.moduleKb,
};

/**
 * CD-53 — every reminder rule on one screen, one card each: on/off and its
 * days. Saving replaces the standard for this company only; "reset" puts the
 * standard back. The wording each rule sends is edited on the templates page.
 */
export function NotificationRulesAdmin({
  initial,
}: {
  readonly initial: NotificationRuleRow[];
}) {
  const [rows, setRows] = useState(initial);
  const replace = (updated: NotificationRuleRow) =>
    setRows((list) =>
      list.map((row) => (row.code === updated.code ? updated : row)),
    );

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <RuleCard key={row.code} row={row} onSaved={replace} />
      ))}

      <Card size="small" title={m.slaTitle}>
        <Text type="secondary" className="text-sm">
          {m.slaBody} <Link href={ROUTES.adminSla}>{m.slaLink}</Link>
        </Text>
      </Card>
    </div>
  );
}

function RuleCard({
  row,
  onSaved,
}: {
  row: NotificationRuleRow;
  onSaved: (row: NotificationRuleRow) => void;
}) {
  const { message } = App.useApp();
  const [enabled, setEnabled] = useState(row.enabled);
  const [values, setValues] = useState<RuleParams>(row.values);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    enabled !== row.enabled ||
    JSON.stringify(values) !== JSON.stringify(row.values);

  function load(next: NotificationRuleRow) {
    setEnabled(next.enabled);
    setValues(next.values);
    setError(null);
  }

  async function call(method: "PUT" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(null);
    const result = await adminApi<NotificationRuleRow>(
      `notification-rules/${encodeURIComponent(row.code)}`,
      { method, ...(body ? { body: JSON.stringify(body) } : {}) },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(result.data);
    load(result.data);
    message.success(method === "PUT" ? m.saved : m.resetDone);
  }

  const setParam = (key: string, value: number | number[]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <Card
      size="small"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {row.label}
          <Tag className="mr-0!">{MODULE_LABEL[row.module]}</Tag>
          {row.customized ? (
            <Tag color="blue" className="mr-0!">
              {m.customTag}
            </Tag>
          ) : (
            <Tag className="mr-0!">{m.standardTag}</Tag>
          )}
        </span>
      }
      extra={
        <span className="flex items-center gap-2">
          <Text type="secondary" className="text-xs">
            {enabled ? m.enabled : m.off}
          </Text>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            aria-label={`${m.enabled} ${row.label}`}
          />
        </span>
      }
    >
      <div className="space-y-3">
        <Text type="secondary" className="block text-sm">
          {row.description}
        </Text>

        <div className="grid gap-4 md:grid-cols-2">
          {row.params.map((param) => (
            <div key={param.key}>
              <Text strong className="mb-1 block text-sm">
                {param.label}
              </Text>
              {SINGLE.has(param.kind) ? (
                <span className="inline-flex items-center gap-2">
                  <InputNumber
                    min={param.min}
                    max={param.max}
                    precision={0}
                    disabled={!enabled}
                    value={values[param.key] as number}
                    onChange={(value) =>
                      setParam(param.key, value ?? param.min)
                    }
                    className="w-24"
                  />
                  <Text type="secondary" className="text-xs">
                    {suffixOf(param.kind)}
                  </Text>
                </span>
              ) : (
                <DaysList
                  suffix={suffixOf(param.kind)}
                  value={(values[param.key] as number[]) ?? []}
                  min={param.min}
                  max={param.max}
                  maxItems={param.max_items ?? 6}
                  disabled={!enabled}
                  onChange={(list) => setParam(param.key, list)}
                />
              )}
              <Text type="secondary" className="mt-1 block text-xs">
                {m.standardIs(
                  describe(
                    row.standard.params[param.key],
                    suffixOf(param.kind),
                  ),
                )}
              </Text>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Text type="secondary">
            {m.recipients}: {row.recipients}
          </Text>
          <Text type="secondary">
            {m.events}: {row.events.map((event) => event.label).join(" · ")} (
            <Link href={ROUTES.adminNotificationTemplates}>
              {m.editWording}
            </Link>
            )
          </Text>
        </div>

        {error && <Alert type="error" showIcon title={error} />}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {row.updated_at && (
            <Text type="secondary" className="mr-auto text-xs">
              {m.updatedAt(new Date(row.updated_at))}
            </Text>
          )}
          {row.customized && (
            <Popconfirm
              title={m.resetConfirm}
              onConfirm={() => void call("DELETE")}
            >
              <Button disabled={busy}>{m.reset}</Button>
            </Popconfirm>
          )}
          {dirty && (
            <Button disabled={busy} onClick={() => load(row)}>
              {m.discard}
            </Button>
          )}
          <Button
            type="primary"
            loading={busy}
            disabled={!dirty}
            onClick={() => void call("PUT", { enabled, params: values })}
          >
            {m.save}
          </Button>
        </div>
      </div>
    </Card>
  );
}

type ParamKind = NotificationRuleRow["params"][number]["kind"];

/** Kinds edited as one whole number rather than a list of steps. */
const SINGLE = new Set<ParamKind>(["days", "count", "percent"]);

function suffixOf(kind: ParamKind) {
  switch (kind) {
    case "percent_list":
      return m.percentSuffix;
    case "percent":
      return m.percentPlainSuffix;
    case "count":
      return m.countSuffix;
    default:
      return m.daysSuffix;
  }
}

/** Steps such as "60, 30 days" — each its own box, largest first once saved. */
function DaysList({
  suffix,
  value,
  min,
  max,
  maxItems,
  disabled,
  onChange,
}: {
  suffix: string;
  value: number[];
  min: number;
  max: number;
  maxItems: number;
  disabled: boolean;
  onChange: (list: number[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((days, index) => (
        <span key={index} className="inline-flex items-center gap-1">
          <InputNumber
            min={min}
            max={max}
            precision={0}
            size="small"
            disabled={disabled}
            value={days}
            onChange={(next) =>
              onChange(
                value.map((item, at) => (at === index ? (next ?? min) : item)),
              )
            }
            className="w-20"
          />
          {value.length > 1 && (
            <Button
              size="small"
              type="text"
              disabled={disabled}
              icon={<CloseOutlined />}
              aria-label={m.removeStep}
              onClick={() => onChange(value.filter((_, at) => at !== index))}
            />
          )}
        </span>
      ))}
      {value.length < maxItems && (
        <Button
          size="small"
          type="dashed"
          disabled={disabled}
          icon={<PlusOutlined />}
          onClick={() => onChange([...value, min])}
        >
          {m.addStep}
        </Button>
      )}
      <Text type="secondary" className="text-xs">
        {suffix}
      </Text>
    </div>
  );
}

function describe(
  value: number | number[] | undefined,
  suffix: string,
): string {
  if (value === undefined) return "-";
  return `${Array.isArray(value) ? value.join(", ") : value} ${suffix}`;
}
