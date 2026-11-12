"use client";

import { useEffect, useState } from "react";
import { Alert, Button, DatePicker, Divider, Input, Radio, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { SearchSelect } from "@/components/ui/search-select";
import { adminApi } from "@/lib/api/client";
import type { PermissionRow } from "@/lib/api/types";
import { messages, thaiForPermission } from "@/lib/messages";

const m = messages.org.overrides;

interface OverrideRow {
  readonly id: string;
  readonly permissionCode: string;
  readonly effect: "GRANT" | "REVOKE";
  readonly reason: string;
  readonly expiresAt: string | null;
  readonly live: boolean;
}

interface OverrideList {
  readonly overrides: OverrideRow[];
  readonly from_roles: number;
  readonly effective: number;
}

/** P7 — per-person GRANT/REVOKE in the active company; each change saves at once. */
export function PermissionOverridesSection({ userId }: { readonly userId: string }) {
  const [list, setList] = useState<OverrideList | null>(null);
  const [catalog, setCatalog] = useState<PermissionRow[]>([]);
  const [code, setCode] = useState<string>();
  const [effect, setEffect] = useState<OverrideRow["effect"]>("GRANT");
  const [reason, setReason] = useState("");
  const [expires, setExpires] = useState<Dayjs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void adminApi<PermissionRow[]>("permissions").then((answer) => {
      // Only what a company role may hold: no machine scopes, no system.*.
      if (live && answer.ok) {
        setCatalog(answer.data.filter((p) => p.type !== "service" && p.module !== "system"));
      }
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    void adminApi<OverrideList>(`users/${userId}/permission-overrides`).then((answer) => {
      if (!live) return;
      if (answer.ok) setList(answer.data);
      else setError(answer.message);
    });
    return () => {
      live = false;
    };
  }, [userId, reload]);

  async function add() {
    if (!code) return;
    setBusy(true);
    setError(null);
    const answer = await adminApi<OverrideRow>(`users/${userId}/permission-overrides`, {
      method: "POST",
      body: JSON.stringify({
        permission_code: code,
        effect,
        reason: reason.trim(),
        ...(expires ? { expires_at: expires.endOf("day").toISOString() } : {}),
      }),
    });
    setBusy(false);
    if (!answer.ok) {
      setError(answer.message);
      return;
    }
    setCode(undefined);
    setReason("");
    setExpires(null);
    setReload((n) => n + 1);
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    const answer = await adminApi<void>(`users/${userId}/permission-overrides/${id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!answer.ok) setError(answer.message);
    else setReload((n) => n + 1);
  }

  const grants = list?.overrides.filter((o) => o.live && o.effect === "GRANT").length ?? 0;
  const revokes = list?.overrides.filter((o) => o.live && o.effect === "REVOKE").length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <Divider className="my-3!">{m.title}</Divider>
      <Text type="secondary" className="text-xs">
        {m.hint}
      </Text>
      {list && (
        <Text strong>{m.effective(list.effective, list.from_roles, grants, revokes)}</Text>
      )}

      <ul className="flex flex-col gap-1">
        {list?.overrides.map((row) => (
          <li
            key={row.id}
            className={`flex flex-wrap items-center gap-2 ${row.live ? "" : "text-[var(--app-text-muted)]"}`}
          >
            <Tag color={row.effect === "GRANT" ? "blue" : "red"}>
              {row.effect === "GRANT" ? m.grant : m.revoke}
            </Tag>
            <span className="min-w-0 flex-1">
              {thaiForPermission(row.permissionCode) || row.permissionCode}
              <Text type="secondary" className="ml-1 text-xs">
                ({row.permissionCode})
              </Text>
              <div className="text-xs">
                {row.expiresAt
                  ? m.until(dayjs(row.expiresAt).format("D MMM YYYY"))
                  : m.noExpiry}
                {!row.live && ` ${m.lapsed}`}
              </div>
              <div className="text-xs">{row.reason}</div>
            </span>
            <Button size="small" disabled={busy} onClick={() => void revoke(row.id)}>
              {m.remove}
            </Button>
          </li>
        ))}
      </ul>

      {error && <Alert type="error" showIcon title={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <SearchSelect
          className="min-w-60 flex-1"
          placeholder={m.permission}
          value={code}
          onChange={setCode}
          options={catalog.map((p) => ({
            value: p.code,
            label: `${thaiForPermission(p.code) || p.code} (${p.code})`,
          }))}
        />
        <Radio.Group
          value={effect}
          onChange={(event) => setEffect(event.target.value as OverrideRow["effect"])}
          options={[
            { value: "GRANT", label: m.grant },
            { value: "REVOKE", label: m.revoke },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="min-w-60 flex-1"
          value={reason}
          maxLength={500}
          placeholder={m.reason}
          aria-label={m.reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <DatePicker
          value={expires}
          placeholder={m.expires}
          disabledDate={(day) => day.isBefore(dayjs(), "day")}
          onChange={setExpires}
        />
        <Button type="primary" disabled={!code || !reason.trim()} loading={busy} onClick={add}>
          {m.save}
        </Button>
      </div>
    </div>
  );
}
