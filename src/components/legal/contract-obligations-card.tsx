"use client";

import { useState } from "react";
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
  Popconfirm,
  Space,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { ObligationDoneButton } from "@/components/legal/obligation-done-button";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type { ContractObligation } from "@/lib/api/contracts";
import { messages } from "@/lib/messages";

const m = messages.contracts.obligations;

interface Draft {
  id?: string;
  title: string;
  detail: string;
  clause: string;
  ownerUserId?: string;
  dueOn: string | null;
}

const blank: Draft = { title: "", detail: "", clause: "", dueOn: null };

/**
 * CD-163 — ข้อผูกพันตามสัญญา: what the contract commits us to, each with an
 * owner and a date. Legal adds, reassigns, waives or reopens; the owner (or
 * Legal) marks it done — the owner does so from "ข้อผูกพันของฉัน".
 */
export function ContractObligationsCard({
  contractId,
  rows,
  people,
  canManage,
  currentUserId,
}: {
  readonly contractId: string;
  readonly rows: ContractObligation[];
  readonly people: { id: string; name: string }[];
  readonly canManage: boolean;
  readonly currentUserId: string | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = dayjs().startOf("day");
  const base = `contracts/${contractId}/obligations`;

  async function save() {
    if (!draft) return;
    if (!draft.title.trim() || !draft.ownerUserId) {
      setError(m.required);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi(draft.id ? `${base}/${draft.id}` : base, {
      method: draft.id ? "PATCH" : "POST",
      body: JSON.stringify({
        title: draft.title,
        detail: draft.detail,
        clause: draft.clause,
        owner_user_id: draft.ownerUserId,
        due_on: draft.dueOn,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.saved);
    setDraft(null);
    router.refresh();
  }

  async function setStatus(id: string, status: "waived" | "open") {
    const result = await appApi(`${base}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    router.refresh();
  }

  const open = rows.filter((row) => row.status === "open").length;

  return (
    <Card
      size="small"
      title={`${m.title} · ${open}/${rows.length}`}
      extra={
        canManage ? (
          <Button
            size="small"
            onClick={() => {
              setError(null);
              setDraft({ ...blank });
            }}
          >
            {m.add}
          </Button>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {rows.length ? (
        <div className="divide-y">
          {rows.map((row) => {
            const overdue =
              row.status === "open" &&
              row.dueOn !== null &&
              dayjs(row.dueOn).isBefore(today);
            return (
              <div
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <div className={row.status === "open" ? "font-medium" : ""}>
                    {row.title}
                    {row.clause && (
                      <Text type="secondary" className="ml-2 text-xs">
                        {row.clause}
                      </Text>
                    )}
                  </div>
                  <Text type="secondary" className="block text-xs">
                    {row.ownerName} ·{" "}
                    {row.dueOn
                      ? dayjs(row.dueOn).format("D MMM YYYY")
                      : m.noDue}
                    {overdue && (
                      <Tag color="red" className="ml-2!">
                        {m.overdue}
                      </Tag>
                    )}
                  </Text>
                  {row.detail && (
                    <Text className="block text-xs whitespace-pre-line">
                      {row.detail}
                    </Text>
                  )}
                  {row.status === "done" && row.doneAt && (
                    <Text type="secondary" className="block text-xs">
                      ✓{" "}
                      {m.doneBy(
                        row.doneByName ?? "",
                        dayjs(row.doneAt).format("D MMM YY HH:mm"),
                      )}
                      {row.doneNote ? ` — ${row.doneNote}` : ""}
                    </Text>
                  )}
                </div>
                <Space size={4} wrap>
                  <Tag color={m.statusColor[row.status]}>
                    {m.status[row.status]}
                  </Tag>
                  {row.status === "open" &&
                    (canManage || row.ownerUserId === currentUserId) && (
                      <ObligationDoneButton obligation={row} />
                    )}
                  {canManage && row.status === "open" && (
                    <>
                      <Button
                        size="small"
                        onClick={() => {
                          setError(null);
                          setDraft({
                            id: row.id,
                            title: row.title,
                            detail: row.detail ?? "",
                            clause: row.clause ?? "",
                            ownerUserId: row.ownerUserId,
                            dueOn: row.dueOn?.slice(0, 10) ?? null,
                          });
                        }}
                      >
                        {m.edit}
                      </Button>
                      <Popconfirm
                        title={m.waiveConfirm}
                        onConfirm={() => void setStatus(row.id, "waived")}
                      >
                        <Button size="small">{m.waive}</Button>
                      </Popconfirm>
                    </>
                  )}
                  {canManage && row.status !== "open" && (
                    <Button
                      size="small"
                      onClick={() => void setStatus(row.id, "open")}
                    >
                      {m.reopen}
                    </Button>
                  )}
                </Space>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.empty} />
      )}

      <Modal
        open={Boolean(draft)}
        title={m.formTitle}
        onCancel={() => setDraft(null)}
        okText={messages.contracts.form.save}
        okButtonProps={{ loading: busy }}
        onOk={() => void save()}
      >
        {draft && (
          <div className="space-y-3">
            <div>
              <span className="mb-1 block text-sm">
                {m.itemTitle}
                <span className="text-red-500"> *</span>
              </span>
              <Input
                value={draft.title}
                maxLength={255}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-sm">
                  {m.owner}
                  <span className="text-red-500"> *</span>
                </span>
                <SearchSelect
                  className="w-full"
                  value={draft.ownerUserId}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      ownerUserId: (value as string) || undefined,
                    })
                  }
                  options={people.map((person) => ({
                    value: person.id,
                    label: person.name,
                  }))}
                />
              </div>
              <div>
                <span className="mb-1 block text-sm">{m.dueOn}</span>
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={draft.dueOn ? dayjs(draft.dueOn) : null}
                  onChange={(next) =>
                    setDraft({
                      ...draft,
                      dueOn: next ? next.format("YYYY-MM-DD") : null,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <span className="mb-1 block text-sm">{m.clause}</span>
              <Input
                value={draft.clause}
                maxLength={100}
                placeholder={m.clausePlaceholder}
                onChange={(event) =>
                  setDraft({ ...draft, clause: event.target.value })
                }
              />
            </div>
            <div>
              <span className="mb-1 block text-sm">{m.detail}</span>
              <Input.TextArea
                rows={2}
                maxLength={2000}
                value={draft.detail}
                onChange={(event) =>
                  setDraft({ ...draft, detail: event.target.value })
                }
              />
            </div>
            {error && <Alert type="error" showIcon title={error} />}
          </div>
        )}
      </Modal>
    </Card>
  );
}
