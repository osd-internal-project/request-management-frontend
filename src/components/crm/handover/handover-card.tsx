"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Checkbox, Empty, Input, Space } from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type {
  DealHandoverView,
  HandoverItem,
  OrgUnitShape,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import {
  formatWhen,
  groupItems,
  HandoverChecklistView,
  HandoverHistory,
  HandoverStatusTag,
} from "./handover-parts";

const m = messages.handover;

/** A line is done when ticked, and — if it asks for one — has its detail. */
function done(item: HandoverItem): boolean {
  return item.checked && (!item.requiresDetail || Boolean(item.detail?.trim()));
}

/**
 * CD-84 — ส่งมอบงานต่อ on the deal page. Once the deal is won the salesperson
 * works through the company's checklist and sends it to a team; while the
 * team holds it the card is read-only, and a return comes back editable with
 * the team's reason on top.
 */
export function HandoverCard({
  opportunityId,
  view,
  teams,
  canManage,
}: {
  opportunityId: string;
  view: DealHandoverView;
  /** Choosable teams — empty when the viewer cannot list them. */
  teams: OrgUnitShape[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const handover = view.handover;
  const editable = canManage && view.editable;

  const [items, setItems] = useState<HandoverItem[]>(view.items);
  const [team, setTeam] = useState<string | undefined>(
    handover?.toOrgUnitId ?? view.defaultOrgUnitId ?? undefined,
  );
  const [note, setNote] = useState(handover?.note ?? "");
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  function update(code: string, patch: Partial<HandoverItem>) {
    setItems((list) =>
      list.map((item) => (item.code === code ? { ...item, ...patch } : item)),
    );
  }

  async function send(kind: "save" | "submit") {
    setBusy(kind);
    setErrors([]);
    const result = await appApi<DealHandoverView>(
      kind === "save"
        ? `opportunities/${opportunityId}/handover`
        : `opportunities/${opportunityId}/handover/submit`,
      {
        method: kind === "save" ? "PUT" : "POST",
        body: JSON.stringify({
          to_org_unit_id: team ?? "",
          note,
          items: items.map((item) => ({
            code: item.code,
            checked: item.checked,
            detail: item.detail ?? "",
          })),
        }),
      },
    );
    setBusy(null);
    if (!result.ok) {
      setErrors(
        result.details?.length
          ? result.details.map((detail) => detail.reason)
          : [result.message],
      );
      return;
    }
    message.success(kind === "save" ? m.draftSaved : m.submitted);
    router.refresh();
  }

  const completed = items.filter(done).length;
  const teamName = (id: string | null) =>
    teams.find((unit) => unit.id === id)?.name ??
    handover?.toOrgUnitName ??
    "—";

  return (
    <Card
      size="small"
      title={
        <Space>
          {m.cardTitle}
          {handover && handover.status !== "draft" && (
            <HandoverStatusTag status={handover.status} />
          )}
        </Space>
      }
      extra={
        editable && items.length ? (
          <Text type="secondary" className="text-xs">
            {m.progress(completed, items.length)}
          </Text>
        ) : null
      }
    >
      {!view.dealWon ? (
        <Text type="secondary">{m.notWon}</Text>
      ) : (
        <div className="space-y-3">
          {handover?.status === "returned" && handover.returnReason && (
            <Alert
              type="warning"
              showIcon
              title={m.returnedBecause(
                handover.decidedByName ?? "",
                handover.returnReason,
              )}
            />
          )}
          {handover?.status === "submitted" && (
            <Alert
              type="info"
              showIcon
              title={m.sentTo(
                teamName(handover.toOrgUnitId),
                formatWhen(handover.submittedAt),
                handover.round,
              )}
            />
          )}
          {handover?.status === "accepted" && (
            <Alert
              type="success"
              showIcon
              title={m.acceptedBy(
                handover.decidedByName ?? "",
                formatWhen(handover.decidedAt),
              )}
            />
          )}

          {editable ? (
            <>
              <Text type="secondary" className="block text-xs">
                {m.intro}
              </Text>
              {items.length ? (
                groupItems(items).map((group) => (
                  <div key={group.category}>
                    <Text strong>{m.categories[group.category]}</Text>
                    <div className="mt-1 space-y-2">
                      {group.items.map((item) => (
                        <div key={item.code}>
                          <Checkbox
                            checked={item.checked}
                            onChange={(e) =>
                              update(item.code, { checked: e.target.checked })
                            }
                          >
                            {item.label}
                            {item.requiresDetail && (
                              <span className="text-red-500"> *</span>
                            )}
                          </Checkbox>
                          {item.requiresDetail && (
                            <Input.TextArea
                              className="mt-1 ml-6"
                              style={{ width: "calc(100% - 24px)" }}
                              autoSize={{ minRows: 1, maxRows: 4 }}
                              maxLength={4000}
                              placeholder={m.detailPlaceholder}
                              value={item.detail ?? ""}
                              onChange={(e) =>
                                update(item.code, { detail: e.target.value })
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={m.noItems}
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Text>{m.team}</Text>
                <SearchSelect
                  style={{ minWidth: 240 }}
                  allowClear
                  placeholder={m.teamPlaceholder}
                  value={team}
                  onChange={setTeam}
                  options={teams
                    .filter((unit) => unit.active || unit.id === team)
                    .map((unit) => ({ value: unit.id, label: unit.name }))}
                />
              </div>
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 6 }}
                maxLength={4000}
                placeholder={m.note}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {errors.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  title={
                    <ul className="m-0 pl-4">
                      {errors.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  }
                />
              )}

              <Space>
                <Button
                  loading={busy === "save"}
                  disabled={busy !== null}
                  onClick={() => void send("save")}
                >
                  {m.saveDraft}
                </Button>
                <Button
                  type="primary"
                  loading={busy === "submit"}
                  disabled={busy !== null}
                  onClick={() => void send("submit")}
                >
                  {m.submit}
                </Button>
              </Space>
            </>
          ) : handover ? (
            <>
              <HandoverChecklistView items={handover.items} />
              {handover.note && (
                <Text type="secondary" className="block whitespace-pre-wrap">
                  {handover.note}
                </Text>
              )}
            </>
          ) : (
            <Text type="secondary">{m.empty}</Text>
          )}

          {handover && handover.history.length > 0 && (
            <div>
              <Text strong className="text-xs">
                {m.history}
              </Text>
              <div className="mt-2">
                <HandoverHistory entries={handover.history} />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
