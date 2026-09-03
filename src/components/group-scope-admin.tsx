"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Space,
  Table,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/search-select";
import {
  fetchOrgUnitScopes,
  replaceOrgUnitScopes,
  type OrgUnitScopeInput,
} from "@/lib/api/client-org-scopes";
import type { OrgUnitNode, OrgUnitScopeRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** The levels an administrator picks between, widest first. */
const LEVELS = ["COMPANY", "DIVISION", "DEPARTMENT", "POSITION"] as const;

type Level = (typeof LEVELS)[number];

/** One row of the list being edited, before it is saved. */
interface Draft extends OrgUnitScopeInput {
  /** For the table's key. Grants are unique per target within one viewer. */
  readonly key: string;
}

/**
 * "ขอบเขตข้อมูลของ Group" — which group may see (and optionally work on) the
 * work of which other group.
 *
 * The replacement for the `(role, resource) → level` rules withdrawn on
 * 31 ส.ค. 2569. Those could say "this role sees its department"; they could
 * never say "ฝ่ายขาย sees ฝ่ายการตลาด", which is the question the org actually
 * asks. Visibility still resolves in one place — `access-rules.ts` — and this
 * screen only supplies it with rows.
 *
 * Two steps, in the order §16 A4 words them: pick a level, pick the group at
 * that level, then name the groups it may see. The level is not stored; it is
 * `OrgUnit.kind` of the viewer, so it is a filter over the picker rather than
 * a field of the grant.
 */
export function GroupScopeAdmin({
  units,
  /** The selected group's saved grants, if the page resolved one server-side. */
  initialViewerId,
  initialScopes,
}: {
  readonly units: OrgUnitNode[];
  readonly initialViewerId: string | null;
  readonly initialScopes: OrgUnitScopeRow[];
}) {
  const { message } = App.useApp();

  const initialLevel =
    units.find((unit) => unit.id === initialViewerId)?.kind ?? "DEPARTMENT";

  const [level, setLevel] = useState<Level>(
    LEVELS.includes(initialLevel as Level) ? (initialLevel as Level) : "DEPARTMENT",
  );
  const [viewerId, setViewerId] = useState<string | null>(initialViewerId);
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(initialScopes));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const byId = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );

  const viewersAtLevel = useMemo(
    () => units.filter((unit) => unit.kind === level && unit.active),
    [units, level],
  );

  /**
   * Every group except the one being granted the view.
   *
   * A group already sees its own work, so offering it would produce a grant
   * the backend refuses — better not to offer it than to explain the refusal.
   */
  const targetOptions = useMemo(
    () =>
      units
        .filter((unit) => unit.id !== viewerId)
        .map((unit) => ({
          value: unit.id,
          label: `${messages.org.unitKinds[unit.kind]} · ${unit.name}`,
        })),
    [units, viewerId],
  );

  const load = useCallback(
    async (unitId: string) => {
      setLoading(true);
      const result = await fetchOrgUnitScopes(unitId);
      setLoading(false);

      if (!result.ok) {
        void message.error(result.message);
        setDrafts([]);
        return;
      }

      setDrafts(toDrafts(result.data));
    },
    [message],
  );

  /*
    Selecting a group is a user action, so it loads from the handler rather
    than from an effect watching the state it just set — the same shape the
    member panel on the tree tab uses. The first paint is already filled from
    the server, so the group the page opened on is never fetched twice.
  */
  function selectViewer(unitId: string | null) {
    setViewerId(unitId);

    if (!unitId) {
      setDrafts([]);
      return;
    }

    if (unitId === initialViewerId) {
      setDrafts(toDrafts(initialScopes));
      return;
    }

    void load(unitId);
  }

  function addTarget(targetId: string) {
    if (drafts.some((draft) => draft.target_org_unit_id === targetId)) return;

    setDrafts((current) => [
      ...current,
      {
        key: targetId,
        target_org_unit_id: targetId,
        include_descendants: true,
        // Read-only by default: acting on another group's tickets is a
        // deliberate tick, never a side effect of granting a view.
        can_act: false,
      },
    ]);
  }

  function update(targetId: string, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.target_org_unit_id === targetId ? { ...draft, ...patch } : draft,
      ),
    );
  }

  async function save() {
    if (!viewerId) return;

    setSaving(true);
    const result = await replaceOrgUnitScopes(
      viewerId,
      drafts.map((draft) => ({
        target_org_unit_id: draft.target_org_unit_id,
        include_descendants: draft.include_descendants,
        can_act: draft.can_act,
      })),
    );
    setSaving(false);

    if (!result.ok) {
      void message.error(result.message);
      return;
    }

    setDrafts(toDrafts(result.data));
    void message.success(messages.groupScope.saved);
  }

  const granting = drafts.some((draft) => draft.can_act);

  return (
    <Card title={messages.groupScope.title} size="small">
      <Text type="secondary" className="mb-3 block text-xs">
        {messages.groupScope.intro}
      </Text>

      <Space wrap className="mb-3 flex">
        <SearchSelect
          value={level}
          onChange={(value: Level) => {
            setLevel(value);
            selectViewer(null);
          }}
          style={{ width: 150 }}
          placeholder={messages.groupScope.level}
          options={LEVELS.map((value) => ({
            value,
            label: messages.org.unitKinds[value],
          }))}
        />
        <SearchSelect
          value={viewerId ?? undefined}
          onChange={(value?: string) => selectViewer(value ?? null)}
          style={{ width: 280 }}
          allowClear
          placeholder={
            viewersAtLevel.length
              ? messages.groupScope.pickViewer
              : messages.groupScope.noUnitsAtLevel
          }
          disabled={!viewersAtLevel.length}
          options={viewersAtLevel.map((unit) => ({
            value: unit.id,
            label: unit.name,
          }))}
        />
        <SearchSelect
          value={null}
          onChange={(value?: string) => value && addTarget(value)}
          style={{ width: 280 }}
          disabled={!viewerId}
          placeholder={messages.groupScope.pickTarget}
          options={targetOptions}
        />
        <Button type="primary" disabled={!viewerId} loading={saving} onClick={save}>
          {messages.groupScope.save}
        </Button>
      </Space>

      <Alert
        type="info"
        showIcon
        className="mb-3!"
        title={messages.groupScope.inheritNote}
        description={messages.groupScope.reloginNote}
      />

      {/*
        Shown only once a grant actually carries it. A standing warning about
        something nobody has ticked is noise, and noise is what makes the real
        warning invisible.
      */}
      {granting && (
        <Alert
          type="warning"
          showIcon
          className="mb-3!"
          title={messages.groupScope.actWarning}
        />
      )}

      {viewerId ? (
        <Table
          size="small"
          rowKey="key"
          loading={loading}
          pagination={false}
          dataSource={drafts}
          locale={{ emptyText: <Empty description={messages.groupScope.empty} /> }}
          columns={[
            {
              title: messages.groupScope.columnTarget,
              key: "target",
              render: (_: unknown, row: Draft) => {
                const unit = byId.get(row.target_org_unit_id);

                return unit ? (
                  <span>
                    {unit.name}{" "}
                    <Text type="secondary" className="text-xs">
                      {messages.org.unitKinds[unit.kind]}
                    </Text>
                  </span>
                ) : (
                  <Text type="secondary">{row.target_org_unit_id}</Text>
                );
              },
            },
            {
              title: messages.groupScope.columnDescendants,
              key: "descendants",
              width: 130,
              render: (_: unknown, row: Draft) => (
                <Checkbox
                  checked={row.include_descendants}
                  onChange={(event) =>
                    update(row.target_org_unit_id, {
                      include_descendants: event.target.checked,
                    })
                  }
                />
              ),
            },
            {
              title: messages.groupScope.columnAct,
              key: "act",
              width: 120,
              render: (_: unknown, row: Draft) => (
                <Checkbox
                  checked={row.can_act}
                  onChange={(event) =>
                    update(row.target_org_unit_id, {
                      can_act: event.target.checked,
                    })
                  }
                />
              ),
            },
            {
              title: messages.groupScope.columnRemove,
              key: "remove",
              width: 60,
              render: (_: unknown, row: Draft) => (
                <Button
                  size="small"
                  danger
                  type="link"
                  onClick={() =>
                    setDrafts((current) =>
                      current.filter(
                        (draft) =>
                          draft.target_org_unit_id !== row.target_org_unit_id,
                      ),
                    )
                  }
                >
                  {messages.groupScope.remove}
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <Empty description={messages.groupScope.pickViewer} />
      )}
    </Card>
  );
}

/** Saved rows as the table edits them. */
function toDrafts(rows: OrgUnitScopeRow[]): Draft[] {
  return rows.map((row) => ({
    key: row.targetOrgUnitId,
    target_org_unit_id: row.targetOrgUnitId,
    include_descendants: row.includeDescendants,
    can_act: row.canAct,
  }));
}
