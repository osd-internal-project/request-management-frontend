"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Select,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { NegotiationRound, TradeTermStandard } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.sales.opportunities.detail.negotiations;
const OTHER = "__other__";

interface Row {
  code: string;
  name: string;
  agreed: string;
  note: string;
}

const emptyRow = (): Row => ({ code: "", name: "", agreed: "", note: "" });
const squash = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * CD-79 — การต่อรองเงื่อนไขการค้า. Each round lists what was agreed against
 * the company's standard; a term that departs from it (or is not on the list)
 * is flagged here as it is typed, and on save the server sends the round to
 * Legal — the card then shows the request, or why it did not get there.
 */
export function NegotiationCard({
  opportunityId,
  rounds,
  standards,
  editable,
}: {
  readonly opportunityId: string;
  readonly rounds: NegotiationRound[];
  readonly standards: TradeTermStandard[];
  readonly editable: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState<Dayjs>(dayjs());
  const [summary, setSummary] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCode = new Map(standards.map((term) => [term.code, term]));
  const flagged = (row: Row) => {
    if (!row.agreed.trim()) return false;
    if (row.code === OTHER) return true;
    const standard = byCode.get(row.code);
    return Boolean(
      standard && squash(standard.standardValue) !== squash(row.agreed),
    );
  };
  const flaggedCount = rows.filter(flagged).length;

  function update(index: number, patch: Partial<Row>) {
    setRows((list) =>
      list.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function start() {
    setOn(dayjs());
    setSummary("");
    setRows([emptyRow()]);
    setError(null);
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const result = await appApi<NegotiationRound>(
      `opportunities/${opportunityId}/negotiations`,
      {
        method: "POST",
        body: JSON.stringify({
          occurred_on: on.format("YYYY-MM-DD"),
          summary: summary.trim() || undefined,
          terms: rows
            .filter((row) => row.code || row.agreed.trim())
            .map((row) =>
              row.code === OTHER
                ? {
                    name: row.name,
                    agreed: row.agreed,
                    note: row.note || undefined,
                  }
                : {
                    code: row.code,
                    agreed: row.agreed,
                    note: row.note || undefined,
                  },
            ),
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    if (result.data.legalSendError) {
      void message.warning(m.savedNotSent);
    } else if (result.data.legalRequestId) {
      void message.success(m.savedSent);
    } else {
      void message.success(m.saved);
    }
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={`${m.title} · ${rounds.length}`}
      extra={
        editable ? (
          <Button size="small" type="primary" onClick={start}>
            {m.record}
          </Button>
        ) : null
      }
    >
      {rounds.length ? (
        <div className="space-y-4">
          {rounds.map((round) => (
            <div
              key={round.id}
              className="border-b border-black/5 pb-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Text strong>{m.round(round.roundNo)}</Text>
                <Text type="secondary" className="text-xs">
                  {dayjs(round.occurredOn).format("DD/MM/YYYY")}
                  {round.createdByName && ` · ${round.createdByName}`}
                </Text>
                {round.nonStandardCount ? (
                  <Tag color="orange">
                    {m.nonStandardCount(round.nonStandardCount)}
                  </Tag>
                ) : (
                  <Tag color="green">{m.allStandard}</Tag>
                )}
              </div>
              {round.summary && (
                <Text className="mt-1 block text-sm whitespace-pre-line">
                  {round.summary}
                </Text>
              )}
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pr-3 font-normal">{m.columns.term}</th>
                    <th className="pr-3 font-normal">{m.columns.standard}</th>
                    <th className="pr-3 font-normal">{m.columns.agreed}</th>
                  </tr>
                </thead>
                <tbody>
                  {round.terms.map((term, index) => (
                    <tr key={index}>
                      <td className="pr-3">{term.name}</td>
                      <td className="pr-3">{term.standard ?? m.notInList}</td>
                      <td className="pr-3">
                        {term.agreed}{" "}
                        {term.nonStandard && (
                          <Tag color="orange" className="text-xs">
                            {m.nonStandard}
                          </Tag>
                        )}
                        {term.note && (
                          <Text type="secondary" className="block">
                            {term.note}
                          </Text>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {round.legalRequestId && !round.legalSendError && (
                <Text className="mt-2 block text-xs">
                  {m.sentToLegal}{" "}
                  <Link href={ROUTES.requestDetail(round.legalRequestId)}>
                    {m.openRequest}
                  </Link>
                </Text>
              )}
              {round.legalSendError && (
                <Alert
                  className="mt-2"
                  type="warning"
                  showIcon
                  title={round.legalSendError}
                  action={
                    round.legalRequestId ? (
                      <Link href={ROUTES.requestDetail(round.legalRequestId)}>
                        <Button size="small">{m.openDraft}</Button>
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={open}
        title={m.formTitle(rounds.length + 1)}
        okText={flaggedCount ? m.saveAndSend : m.save}
        confirmLoading={busy}
        onOk={() => void save()}
        onCancel={() => setOpen(false)}
        width={760}
        destroyOnHidden
      >
        <div className="space-y-3">
          {error && <Alert type="error" showIcon title={error} />}
          {!standards.length && (
            <Alert type="info" showIcon title={m.noStandards} />
          )}
          <div className="flex flex-wrap gap-3">
            <label>
              <Text className="block text-xs">{m.date}</Text>
              <DatePicker
                value={on}
                allowClear={false}
                onChange={(value) => value && setOn(value)}
              />
            </label>
          </div>
          <label className="block">
            <Text className="block text-xs">{m.summary}</Text>
            <Input.TextArea
              rows={2}
              maxLength={4000}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>

          <div className="space-y-2">
            {rows.map((row, index) => {
              const standard = byCode.get(row.code);
              return (
                <div key={index} className="flex flex-wrap items-start gap-2">
                  <Select
                    style={{ width: 200 }}
                    placeholder={m.pickTerm}
                    value={row.code || undefined}
                    onChange={(code: string) => update(index, { code })}
                    options={[
                      ...standards.map((term) => ({
                        value: term.code,
                        label: term.name,
                      })),
                      { value: OTHER, label: m.otherTerm },
                    ]}
                  />
                  {row.code === OTHER && (
                    <Input
                      style={{ width: 160 }}
                      placeholder={m.otherName}
                      value={row.name}
                      onChange={(event) =>
                        update(index, { name: event.target.value })
                      }
                    />
                  )}
                  <div style={{ width: 200 }}>
                    <Input
                      placeholder={m.agreedPlaceholder}
                      value={row.agreed}
                      status={flagged(row) ? "warning" : undefined}
                      onChange={(event) =>
                        update(index, { agreed: event.target.value })
                      }
                    />
                    <Text type="secondary" className="text-xs">
                      {standard
                        ? m.standardIs(standard.standardValue)
                        : row.code === OTHER
                          ? m.otherAlwaysFlagged
                          : ""}
                    </Text>
                  </div>
                  <Input
                    style={{ width: 140 }}
                    placeholder={m.note}
                    value={row.note}
                    onChange={(event) =>
                      update(index, { note: event.target.value })
                    }
                  />
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    disabled={rows.length === 1}
                    onClick={() =>
                      setRows((list) => list.filter((_, i) => i !== index))
                    }
                  />
                </div>
              );
            })}
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setRows((list) => [...list, emptyRow()])}
            >
              {m.addTerm}
            </Button>
          </div>

          {flaggedCount > 0 && (
            <Alert type="warning" showIcon title={m.willSend(flaggedCount)} />
          )}
        </div>
      </Modal>
    </Card>
  );
}
