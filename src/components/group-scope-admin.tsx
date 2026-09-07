"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Tree,
} from "antd";
import Text from "antd/es/typography/Text";
import { SearchSelect } from "@/components/search-select";
import {
  fetchScopes,
  replaceScopes,
  type OrgUnitScopeInput,
  type ScopeViewerKind,
} from "@/lib/api/client-org-scopes";
import type {
  DirectoryUser,
  OrgUnitNode,
  OrgUnitScopeRow,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

/** The levels the target picker filters by, widest first. */
const LEVELS = ["COMPANY", "DIVISION", "DEPARTMENT", "POSITION"] as const;

/**
 * What a grant may carry, mirroring the backend's `SCOPE_PERMISSIONS`.
 *
 * Listed here rather than fetched: it is a closed set declared in code, and the
 * API validates every entry anyway. Going stale would make the screen offer
 * less than the API accepts — never more.
 */
const SCOPE_PERMISSIONS = [
  "request.complete",
  "request.hold",
  "request.return",
  "request.cancel.any",
  "approval.decide",
] as const;

type Level = (typeof LEVELS)[number];

/** Who the grants being edited belong to. */
interface Viewer {
  readonly kind: ScopeViewerKind;
  readonly id: string;
  readonly label: string;
}

/** One row of the list being edited, before it is saved. */
interface Draft extends OrgUnitScopeInput {
  /** For the table's key. A viewer names each target at most once. */
  readonly key: string;
  readonly kind: ScopeViewerKind;
}

/**
 * "ขอบเขตข้อมูล" — who may see (and optionally work on) whose requests.
 *
 * The replacement for the `(role, resource) → level` rules withdrawn on
 * 31 ส.ค. 2569. Those could say "this role sees its department"; they could
 * never say "ฝ่ายขาย sees ฝ่ายการตลาด", which is the question the org actually
 * asks. Visibility still resolves in one place — `access-rules.ts` — and this
 * screen only supplies it with rows.
 *
 * **Redesigned 4 ก.ย. 2569.** It used to be three selects in a row: level, then
 * the group at that level, then the target. That put `level` first, which made
 * it look like the first decision, when it is not a decision at all — nothing
 * stores it. It is `OrgUnit.kind`, a filter over a picker. Worse, a grant may
 * now be written to one *person*, and a person has no level, so the first step
 * excluded half the answers.
 *
 * The chart goes on the left instead, with people under the groups they sit
 * in: an administrator picks the thing they are thinking about. `level`
 * survives on the right, where it is what it always was — a way to shorten a
 * long list of groups.
 *
 * **`ทำงานต่อได้` became a list of actions on 7 ก.ย. 2569.** One tick could only
 * say "everything this person role allows" or "nothing", so an organisation
 * that wanted "อนุมัติงาน RND ได้ แต่งาน Sale ดูอย่างเดียว" had to choose one for
 * both. The column now names the actions, and an empty cell is the old
 * unticked box. Every entry is still a ceiling rather than a grant: the API
 * intersects it with what the holder's roles carry.
 */
export function GroupScopeAdmin({
  units,
  people,
  initialViewerId,
  initialScopes,
}: {
  readonly units: OrgUnitNode[];
  /** The whole company directory, so the tree can show who is in each group. */
  readonly people: DirectoryUser[];
  /** The group the page resolved server-side, so the first paint is filled. */
  readonly initialViewerId: string | null;
  readonly initialScopes: OrgUnitScopeRow[];
}) {
  const { message } = App.useApp();

  const [viewer, setViewer] = useState<Viewer | null>(() => {
    const unit = units.find((each) => each.id === initialViewerId);

    return unit ? { kind: "unit", id: unit.id, label: unit.name } : null;
  });
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(initialScopes));
  const [search, setSearch] = useState("");
  const [targetKind, setTargetKind] = useState<ScopeViewerKind>("unit");
  const [level, setLevel] = useState<Level>("DEPARTMENT");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const unitsById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );

  const treeData = useMemo(
    () => buildTree(units, people, search.trim().toLowerCase()),
    [units, people, search],
  );

  /**
   * Every group except the one holding the grants.
   *
   * A viewer already sees its own work, so offering it would produce a grant
   * the backend refuses — better not to offer it than to explain the refusal.
   */
  const unitOptions = useMemo(
    () =>
      units
        .filter((unit) => unit.kind === level && unit.active)
        .filter((unit) => !(viewer?.kind === "unit" && unit.id === viewer.id))
        .map((unit) => ({ value: unit.id, label: unit.name })),
    [units, level, viewer],
  );

  const personOptions = useMemo(
    () =>
      people
        .filter((person) => !(viewer?.kind === "user" && person.id === viewer.id))
        .map((person) => ({
          value: person.id,
          label: `${person.displayName} · ${person.username}`,
        })),
    [people, viewer],
  );

  const load = useCallback(
    async (next: Viewer) => {
      setLoading(true);
      const result = await fetchScopes(next.kind, next.id);
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
    Selecting is a user action, so it loads from the handler rather than from
    an effect watching the state it just set. The first paint is already filled
    from the server, so the group the page opened on is never fetched twice.
  */
  function select(next: Viewer | null) {
    setViewer(next);

    if (!next) {
      setDrafts([]);
      return;
    }

    if (next.kind === "unit" && next.id === initialViewerId) {
      setDrafts(toDrafts(initialScopes));
      return;
    }

    void load(next);
  }

  function addTarget(kind: ScopeViewerKind, targetId: string) {
    if (drafts.some((draft) => draft.key === targetId)) return;

    setDrafts((current) => [
      ...current,
      {
        key: targetId,
        kind,
        ...(kind === "unit"
          ? { target_org_unit_id: targetId }
          : { target_user_id: targetId }),
        // A person has no subtree, so the flag has nothing to reach.
        include_descendants: kind === "unit",
        // Read-only by default: acting on somebody else's tickets is a
        // deliberate tick, never a side effect of granting a view.
        permissions: [],
      },
    ]);
  }

  function update(key: string, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
  }

  async function save() {
    if (!viewer) return;

    setSaving(true);
    const result = await replaceScopes(
      viewer.kind,
      viewer.id,
      drafts.map((draft) => ({
        target_org_unit_id: draft.target_org_unit_id,
        target_user_id: draft.target_user_id,
        include_descendants: draft.include_descendants,
        permissions: draft.permissions,
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

  const granting = drafts.some((draft) => draft.permissions.length > 0);
  const deciding = drafts.some((draft) =>
    draft.permissions.includes("approval.decide"),
  );

  return (
    <Card title={messages.groupScope.title} size="small">
      <Text type="secondary" className="mb-3 block text-xs">
        {messages.groupScope.intro}
      </Text>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card size="small" title={messages.groupScope.viewerPanel}>
          <Input.Search
            allowClear
            className="mb-2"
            placeholder={messages.groupScope.searchViewer}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {treeData.length ? (
            <Tree
              treeData={treeData}
              /*
                Expanded by whatever the search left, not by a state this
                component keeps: filtering a tree and then leaving it collapsed
                shows the user an empty box and a match count they cannot see.
              */
              defaultExpandAll
              key={search}
              selectedKeys={viewer ? [`${viewer.kind}:${viewer.id}`] : []}
              onSelect={(keys) => {
                const key = keys[0];
                if (typeof key !== "string") return select(null);

                const [kind, id] = key.split(":") as [ScopeViewerKind, string];
                const label =
                  kind === "unit"
                    ? (unitsById.get(id)?.name ?? id)
                    : (peopleById.get(id)?.displayName ?? id);

                select({ kind, id, label });
              }}
              className="max-h-96 overflow-auto"
            />
          ) : (
            <Empty description={messages.groupScope.noMatch} />
          )}
        </Card>

        <Card
          size="small"
          title={
            viewer ? (
              <Space size={6}>
                <span>{viewer.label}</span>
                <Tag color={viewer.kind === "unit" ? "blue" : "green"}>
                  {viewer.kind === "unit"
                    ? messages.groupScope.kindUnit
                    : messages.groupScope.kindUser}
                </Tag>
              </Space>
            ) : (
              messages.groupScope.targetPanel
            )
          }
          extra={
            <Button
              type="primary"
              size="small"
              disabled={!viewer}
              loading={saving}
              onClick={() => void save()}
            >
              {messages.groupScope.save}
            </Button>
          }
        >
          {viewer ? (
            <>
              <Space wrap className="mb-3 flex">
                <Text type="secondary" className="text-xs">
                  {messages.groupScope.addTitle}
                </Text>
                <Segmented
                  size="small"
                  value={targetKind}
                  onChange={(value) => setTargetKind(value as ScopeViewerKind)}
                  options={[
                    { value: "unit", label: messages.groupScope.kindUnit },
                    { value: "user", label: messages.groupScope.kindUser },
                  ]}
                />
                {/*
                  `level` is a filter over the picker beside it, never a stored
                  field — which is why it appears here rather than as the first
                  step of the screen, and why the person picker has none.
                */}
                {targetKind === "unit" && (
                  <SearchSelect
                    value={level}
                    onChange={(value: Level) => setLevel(value)}
                    style={{ width: 140 }}
                    placeholder={messages.groupScope.level}
                    options={LEVELS.map((value) => ({
                      value,
                      label: messages.org.unitKinds[value],
                    }))}
                  />
                )}
                <SearchSelect
                  value={null}
                  onChange={(value?: string) =>
                    value && addTarget(targetKind, value)
                  }
                  style={{ width: 280 }}
                  disabled={targetKind === "unit" && !unitOptions.length}
                  placeholder={
                    targetKind === "user"
                      ? messages.groupScope.pickTargetUser
                      : unitOptions.length
                        ? messages.groupScope.pickTarget
                        : messages.groupScope.noUnitsAtLevel
                  }
                  options={targetKind === "unit" ? unitOptions : personOptions}
                />
              </Space>

              <Alert
                type="info"
                showIcon
                className="mb-3!"
                title={messages.groupScope.inheritNote}
                description={messages.groupScope.reloginNote}
              />

              {/*
                Shown only once a grant actually carries it. A standing warning
                about something nobody has ticked is noise, and noise is what
                makes the real warning invisible.
              */}
              {granting && (
                <Alert
                  type="warning"
                  showIcon
                  className="mb-3!"
                  title={messages.groupScope.actWarning}
                  description={messages.groupScope.intersectionNote}
                />
              )}

              {/*
                Approving is the one grant that puts somebody on a ladder they
                were not routed onto, so it says so separately rather than
                sharing a line with returning and cancelling.
              */}
              {deciding && (
                <Alert
                  type="info"
                  showIcon
                  className="mb-3!"
                  title={messages.groupScope.approveNote}
                />
              )}

              <Table
                size="small"
                rowKey="key"
                loading={loading}
                pagination={false}
                dataSource={drafts}
                locale={{
                  emptyText: <Empty description={messages.groupScope.empty} />,
                }}
                columns={[
                  {
                    title: messages.groupScope.columnTarget,
                    key: "target",
                    render: (_: unknown, row: Draft) => (
                      <TargetCell
                        row={row}
                        unitsById={unitsById}
                        peopleById={peopleById}
                      />
                    ),
                  },
                  {
                    title: messages.groupScope.columnDescendants,
                    key: "descendants",
                    width: 130,
                    render: (_: unknown, row: Draft) =>
                      row.kind === "unit" ? (
                        <Checkbox
                          checked={row.include_descendants}
                          onChange={(event) =>
                            update(row.key, {
                              include_descendants: event.target.checked,
                            })
                          }
                        />
                      ) : (
                        <Tooltip
                          title={messages.groupScope.descendantsNotForUser}
                        >
                          <Checkbox disabled checked={false} />
                        </Tooltip>
                      ),
                  },
                  {
                    title: messages.groupScope.columnAct,
                    key: "act",
                    width: 280,
                    /*
                      A multi-select rather than a row of checkboxes: the set is
                      short but the column sits beside two single ticks, and
                      five more boxes in the same row reads as five more
                      switches of the same weight. Empty is read-only and says
                      so in the placeholder.
                    */
                    render: (_: unknown, row: Draft) => (
                      <SearchSelect
                        mode="multiple"
                        value={row.permissions}
                        onChange={(value: string[]) =>
                          update(row.key, { permissions: value })
                        }
                        style={{ width: "100%" }}
                        placeholder={
                          messages.groupScope.permissionsPlaceholder
                        }
                        options={SCOPE_PERMISSIONS.map((code) => ({
                          value: code,
                          label: messages.groupScope.permissions[code] ?? code,
                        }))}
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
                            current.filter((draft) => draft.key !== row.key),
                          )
                        }
                      >
                        {messages.groupScope.remove}
                      </Button>
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <Empty description={messages.groupScope.pickViewer} />
          )}
        </Card>
      </div>
    </Card>
  );
}

/** One target, named rather than shown as the id the row actually carries. */
function TargetCell({
  row,
  unitsById,
  peopleById,
}: {
  readonly row: Draft;
  readonly unitsById: Map<string, OrgUnitNode>;
  readonly peopleById: Map<string, DirectoryUser>;
}) {
  if (row.kind === "unit") {
    const unit = row.target_org_unit_id
      ? unitsById.get(row.target_org_unit_id)
      : undefined;

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
  }

  const person = row.target_user_id
    ? peopleById.get(row.target_user_id)
    : undefined;

  return person ? (
    <span>
      {person.displayName}{" "}
      <Text type="secondary" className="text-xs">
        {person.username}
      </Text>
    </span>
  ) : (
    <Text type="secondary">{row.target_user_id}</Text>
  );
}

/**
 * The chart, with the people who sit in each group beneath it.
 *
 * A group is kept when it matches the filter *or* anything under it does —
 * dropping an unmatched parent would orphan a matching child, and the tree
 * would show nothing for a search that has results.
 */
function buildTree(
  units: OrgUnitNode[],
  people: DirectoryUser[],
  filter: string,
) {
  const membersOf = new Map<string, DirectoryUser[]>();

  for (const person of people) {
    if (!person.orgUnitId) continue;

    const list = membersOf.get(person.orgUnitId) ?? [];
    list.push(person);
    membersOf.set(person.orgUnitId, list);
  }

  const childrenOf = new Map<string | null, OrgUnitNode[]>();

  for (const unit of units) {
    const list = childrenOf.get(unit.parentId) ?? [];
    list.push(unit);
    childrenOf.set(unit.parentId, list);
  }

  interface Node {
    key: string;
    title: React.ReactNode;
    children?: Node[];
  }

  function build(unit: OrgUnitNode): Node | null {
    const members = (membersOf.get(unit.id) ?? [])
      .filter(
        (person) =>
          !filter ||
          person.displayName.toLowerCase().includes(filter) ||
          person.username.toLowerCase().includes(filter),
      )
      .map((person) => ({
        key: `user:${person.id}`,
        title: (
          <span>
            👤 {person.displayName}{" "}
            <Text type="secondary" className="text-xs">
              {person.username}
            </Text>
          </span>
        ),
      }));

    const below = (childrenOf.get(unit.id) ?? [])
      .map(build)
      .filter((node): node is Node => node !== null);

    const matches = !filter || unit.name.toLowerCase().includes(filter);

    if (!matches && !members.length && !below.length) return null;

    return {
      key: `unit:${unit.id}`,
      title: (
        <span>
          🏢 {unit.name}{" "}
          <Text type="secondary" className="text-xs">
            {messages.org.unitKinds[unit.kind]}
          </Text>
        </span>
      ),
      children: [...below, ...members],
    };
  }

  return (childrenOf.get(null) ?? [])
    .map(build)
    .filter((node): node is Node => node !== null);
}

/** Saved rows as the table edits them. */
function toDrafts(rows: OrgUnitScopeRow[]): Draft[] {
  return rows.map((row) => {
    const isUnit = row.targetOrgUnitId !== null;
    const key = (isUnit ? row.targetOrgUnitId : row.targetUserId) ?? row.id;

    return {
      key,
      kind: isUnit ? ("unit" as const) : ("user" as const),
      target_org_unit_id: row.targetOrgUnitId ?? undefined,
      target_user_id: row.targetUserId ?? undefined,
      include_descendants: row.includeDescendants,
      permissions: row.permissions ?? [],
    };
  });
}
