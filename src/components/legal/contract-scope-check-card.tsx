"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Input, Radio, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { ScopeCheckView } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";

const m = messages.contracts.scopeCheck;

type Verdict = { verdict: "match" | "mismatch" | null; note: string };

/**
 * CD-150 — ตรวจขอบเขตงาน: every item of the scope of work the request
 * brought, found in the draft's latest version or not. Legal decides the
 * ones not found (and may overrule a found one); an inconsistent scope
 * keeps the contract from being sent for approval.
 */
export function ContractScopeCheckCard({
  draftId,
  view,
  canManage,
}: {
  readonly draftId: string;
  readonly view: ScopeCheckView;
  readonly canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>(() =>
    Object.fromEntries(
      view.items.map((item) => [
        item.key,
        { verdict: item.verdict, note: item.note ?? "" },
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acting = canManage && view.editable;

  if (!view.applicable) {
    return (
      <Card size="small" title={m.title}>
        <Text type="secondary">{m.notApplicable}</Text>
      </Card>
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    const result = await appApi(`contract-drafts/${draftId}/scope-check`, {
      method: "PUT",
      body: JSON.stringify({
        verdicts: Object.entries(verdicts)
          .filter(([, value]) => value.verdict)
          .map(([key, value]) => ({
            key,
            verdict: value.verdict,
            note: value.note,
          })),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={
        <span>
          {m.title} · {m.version(view.versionNo)}
          <Tag
            className="ml-2!"
            color={view.status ? m.statusColor[view.status] : "default"}
          >
            {view.status ? m.status[view.status] : m.unchecked}
          </Tag>
        </span>
      }
      extra={
        acting ? (
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() => void save()}
          >
            {m.save(view.versionNo)}
          </Button>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {view.checked && (
        <Text type="secondary" className="mb-2 block text-xs">
          {m.checkedBy(
            view.checked.byName,
            dayjs(view.checked.at).format("D MMM YY HH:mm"),
          )}
        </Text>
      )}
      {!view.status &&
        view.lastCheckedVersionNo !== null &&
        view.lastCheckedVersionNo !== view.versionNo && (
          <Alert
            type="warning"
            showIcon
            className="mb-2"
            title={m.earlier(view.lastCheckedVersionNo)}
          />
        )}
      {error && <Alert type="error" showIcon className="mb-2" title={error} />}

      <div className="divide-y">
        {view.items.map((item) => {
          const value = verdicts[item.key] ?? { verdict: null, note: "" };
          return (
            <div key={item.key} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Tag>{m.kinds[item.kind]}</Tag>
                <span className="text-sm">
                  {item.parent ? `${item.parent} › ` : ""}
                  {item.text}
                </span>
                <Tag color={item.found ? "green" : "orange"}>
                  {item.found ? m.found : m.notFound}
                </Tag>
              </div>
              {acting ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Radio.Group
                    size="small"
                    optionType="button"
                    value={value.verdict}
                    onChange={(event) =>
                      setVerdicts({
                        ...verdicts,
                        [item.key]: {
                          ...value,
                          verdict: event.target.value as "match" | "mismatch",
                        },
                      })
                    }
                    options={[
                      { value: "match", label: m.match },
                      { value: "mismatch", label: m.mismatch },
                    ]}
                  />
                  {(!item.found || value.verdict === "mismatch") && (
                    <Input
                      size="small"
                      className="min-w-60 flex-1"
                      maxLength={2000}
                      placeholder={m.notePlaceholder}
                      value={value.note}
                      onChange={(event) =>
                        setVerdicts({
                          ...verdicts,
                          [item.key]: { ...value, note: event.target.value },
                        })
                      }
                    />
                  )}
                </div>
              ) : (
                value.verdict && (
                  <Text
                    type={value.verdict === "match" ? "secondary" : "danger"}
                    className="block text-xs"
                  >
                    {value.verdict === "match" ? m.match : m.mismatch}
                    {value.note ? ` — ${value.note}` : ""}
                  </Text>
                )
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
