"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, App, Avatar, Button, Card, Checkbox, Empty, Form, Input, Modal, Spin, Tag } from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import { messages } from "@/lib/messages";
import { SearchSelect, SearchTreeSelect } from "@/components/search-select";
import { buildUnitTree } from "@/lib/org-tree";
import {
  canHoldMembers,
  kindUnder,
  ORG_UNIT_LEVELS,
} from "@/lib/org-levels";

import type {
  OrgUnitNode,
  UnassignedUser,
  OrgMember,
  RoleRow,
} from "@/lib/api/types";
import { adminApi } from "@/lib/api/client";
import { grantRole, revokeRole, searchUsers } from "@/lib/api/client-roles";
export type { OrgUnitNode, UnassignedUser, OrgMember } from "@/lib/api/types";

interface KeycloakIdentity {
  roles: string[];
  groups: { id: string; name: string; path: string }[];
}

/**
 * The two-character avatar §16 A3 puts beside every name — "ปิยะ พ." → "ปพ".
 *
 * Thai display names in this system are "given surname-initial", so the first
 * letter of each word is what a reader recognises. Falls back to the first two
 * characters for a single-word name rather than rendering a lonely letter.
 */
function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`;

  return displayName.slice(0, 2);
}

/**
 * "วันนี้ 09:12" / "เมื่อวาน 16:40", the wording §16 A3 uses for first login.
 *
 * An admin working this queue cares whether someone has been waiting since
 * yesterday, which a full timestamp buries. `now` is passed in so the same
 * render never reads the clock twice and disagrees with itself.
 */
function firstLoginLabel(iso: string, now: number): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor(
    (startOfToday.getTime() - new Date(at).setHours(0, 0, 0, 0)) / 86_400_000,
  );

  if (dayDiff <= 0) return `${messages.org.today} ${time}`;
  if (dayDiff === 1) return `${messages.org.yesterday} ${time}`;

  return `${at.toLocaleDateString("th-TH")} ${time}`;
}

/**
 * Roles every account in a realm carries regardless of who they are. They say
 * nothing about a person's job, so on an org screen they are pure noise.
 */
const KEYCLOAK_BUILTIN_ROLES = ["offline_access", "uma_authorization"];

/**
 * The Keycloak roles worth showing next to a name (ROLE-03).
 *
 * `exclude` drops roles already displayed as this system's own role codes —
 * they are the same fact, and printing "employee" twice in two colours reads
 * as two different things.
 */
function realmRoles(
  roles: readonly string[] | undefined,
  exclude: readonly string[] = [],
): string[] {
  return (roles ?? []).filter(
    (role) =>
      !role.startsWith("default-roles") &&
      !KEYCLOAK_BUILTIN_ROLES.includes(role) &&
      !exclude.includes(role),
  );
}

/**
 * A unit plus everything under it — the set that may never become its parent.
 *
 * `assertNoCycle` on the backend rejects these outright, but a dropdown that
 * offers the choice and then answers `ORG_UNIT_CYCLE` teaches an admin nothing
 * about the shape of their own chart. Excluding them is the explanation.
 */
function subtreeIds(units: OrgUnitNode[], rootId: string): Set<string> {
  const found = new Set([rootId]);
  let grew = true;

  // The tree is shallow (บริษัท → ฝ่าย → แผนก → ทีม) and already in memory, so
  // sweeping it to a fixed point costs less than building an index per open.
  while (grew) {
    grew = false;
    for (const unit of units) {
      if (unit.parentId && found.has(unit.parentId) && !found.has(unit.id)) {
        found.add(unit.id);
        grew = true;
      }
    }
  }

  return found;
}

/**
 * The units a search should leave on screen: the matches, **plus every unit
 * above them**.
 *
 * Dropping the ancestors would leave the matches floating at the root, and the
 * one thing an admin needs from a chart search is where in the chart the answer
 * sits. Children of a match are kept too — finding a department and losing its
 * positions would be answering half the question.
 */
function matchingSubtree(units: OrgUnitNode[], query: string): Set<string> {
  const needle = query.trim().toLowerCase();
  const byId = new Map(units.map((unit) => [unit.id, unit]));

  const visible = new Set<string>();

  for (const unit of units) {
    const hit = [unit.name, unit.code, unit.managerDisplayName]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(needle));

    if (!hit) continue;

    for (const id of subtreeIds(units, unit.id)) visible.add(id);

    let parentId = unit.parentId;
    while (parentId && !visible.has(parentId)) {
      visible.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }

  return visible;
}

/**
 * Picks one group from the chart, drawn as the chart.
 *
 * A flat list cannot answer the question these dialogs ask. OSD has 158 groups
 * and its position names repeat across departments — `Engineer Support` exists
 * under three — so a list of names is a list of ambiguities, and the one thing
 * that disambiguates them is exactly what a flat list throws away.
 *
 * Groups that may not be chosen are **disabled rather than removed**: dropping
 * one would re-hang its children at the root, and a chart whose shape depends
 * on why you opened the picker is a chart nobody can learn.
 */
function UnitTreePicker({
  units,
  value,
  onChange,
  placeholder,
  allowClear,
  disabled,
}: {
  units: OrgUnitNode[];
  /**
   * Optional because `Form.Item` injects both when this sits inside a form —
   * writing them there would be two sources for one value.
   */
  value?: string;
  onChange?: (value?: string) => void;
  placeholder: string;
  allowClear?: boolean;
  /** Groups shown but not choosable — inactive ones, the group already open. */
  disabled?: (unit: OrgUnitNode) => boolean;
}) {
  const treeData = useMemo(
    () =>
      buildUnitTree(units, {
        // The head is what tells two same-named positions apart, so it is part
        // of the label rather than a detail the picker drops.
        title: (unit) =>
          unit.managerDisplayName
            ? `${unit.name} — ${unit.managerDisplayName}`
            : unit.name,
        disabled,
      }),
    [units, disabled],
  );

  return (
    <SearchTreeSelect
      className="w-full"
      allowClear={allowClear}
      treeDefaultExpandAll
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      treeData={treeData}
    />
  );
}

function Initials({ name }: { name: string }) {
  return (
    <Avatar size="small" className="shrink-0 bg-gray-200! text-gray-700!">
      {initials(name)}
    </Avatar>
  );
}

/**
 * Screen A3 — ผังทีมและสิทธิ์.
 *
 * The org tree on the left is the source of truth for supervisors, which is
 * what data scope and approval step 1 read (D-08). Keycloak roles and groups
 * shown in the member panel are an *enrichment*: when the Admin API is not
 * configured this panel simply omits them and everything else still works.
 */
export function OrgAdmin({
  units: initialUnits,
  unassigned: initialUnassigned,
  initialSelectedId,
  initialMembers,
  companyId,
  roles,
  canManageRoles,
}: {
  units: OrgUnitNode[];
  unassigned: UnassignedUser[];
  /** Unit opened on first paint, chosen server-side. */
  initialSelectedId: string | null;
  /** Its members, fetched server-side so the first paint needs no effect. */
  initialMembers: OrgMember[];
  /** Active company — required when creating a unit (D-11). */
  companyId: string;
  /** System roles of this company, for the per-member role editor. */
  roles: RoleRow[];
  /**
   * Whether the viewer holds `admin.role.manage`. Editing a member's roles is
   * a different permission from editing the chart, and this screen is reachable
   * with only the latter — a button that always answers 403 is worse than none.
   */
  canManageRoles: boolean;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
  const [units, setUnits] = useState(initialUnits);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId,
  );
  const [members, setMembers] = useState<OrgMember[]>(initialMembers);
  const [identities, setIdentities] = useState<
    Record<string, KeycloakIdentity>
  >({});
  const [loading, setLoading] = useState(false);
  const [keycloakNote, setKeycloakNote] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<UnassignedUser | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [changingLead, setChangingLead] = useState(false);
  const [editingUnit, setEditingUnit] = useState(false);
  const [movingMember, setMovingMember] = useState<OrgMember | null>(null);
  const [editingRolesOf, setEditingRolesOf] = useState<OrgMember | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [treeQuery, setTreeQuery] = useState("");

  // One reading of the clock for the whole screen — see `firstLoginLabel`.
  const [now] = useState(() => Date.now());

  const selected = units.find((unit) => unit.id === selectedId) ?? null;

  /**
   * The lead heads the list, as §16 A3 draws it — the panel is read to answer
   * "who runs this team", and that name should not be somewhere in the middle.
   */
  const leadId = selected?.managerUserId ?? null;

  const orderedMembers = useMemo(() => {
    if (!leadId) return members;

    return [...members].sort((left, right) =>
      left.id === leadId ? -1 : right.id === leadId ? 1 : 0,
    );
  }, [members, leadId]);

  const refreshTree = useCallback(async () => {
    const result = await adminApi<OrgUnitNode[]>("org-units");
    if (result.ok) setUnits(result.data);
  }, []);

  const refreshQueue = useCallback(async () => {
    const result = await adminApi<UnassignedUser[]>("users/unassigned");
    if (result.ok) setUnassigned(result.data);
  }, []);

  /**
   * Only the newest request may write to state.
   *
   * Clicking down a tree faster than the network answers is normal, so a slow
   * response for a unit the user has already left must be discarded rather
   * than painted over the newer one.
   */
  const requestSeq = useRef(0);

  /**
   * Members plus, best-effort, their Keycloak roles and groups.
   *
   * Called from event handlers, never from an effect: selecting a unit is a
   * user action, and React's guidance is to do the work in the handler that
   * caused it. The first unit's members arrive from the server instead, so no
   * effect is needed at all.
   */
  const loadMembers = useCallback(async (unitId: string) => {
    const seq = ++requestSeq.current;
    const isCurrent = () => seq === requestSeq.current;

    setLoading(true);
    const result = await adminApi<OrgMember[]>(`org-units/${unitId}/members`);
    if (!isCurrent()) return;

    setLoading(false);

    if (!result.ok) {
      setMembers([]);
      return;
    }

    setMembers(result.data);

    const found: Record<string, KeycloakIdentity> = {};
    let unavailable: string | null = null;

    await Promise.all(
      result.data.map(async (member) => {
        const identity = await adminApi<KeycloakIdentity>(
          `keycloak/users/${encodeURIComponent(member.username)}/identity`,
        );
        if (identity.ok) found[member.username] = identity.data;
        else unavailable = identity.message;
      }),
    );

    if (!isCurrent()) return;

    setIdentities(found);
    setKeycloakNote(Object.keys(found).length ? null : unavailable);
  }, []);

  /** Selecting a unit in the tree. */
  const selectUnit = useCallback(
    (unitId: string) => {
      setSelectedId(unitId);
      void loadMembers(unitId);
    },
    [loadMembers],
  );

  /** Reload the open unit after a mutation. */
  const reloadMembers = useCallback(() => {
    if (selectedId) void loadMembers(selectedId);
  }, [selectedId, loadMembers]);

  /**
   * Take a member out of the chart entirely — unit *and* supervisor.
   *
   * Clearing only the unit would leave `supervisorUserId` pointing into a team
   * the person no longer sits in, and that edge is exactly what `scopeSetsFor`
   * and approval step 1 read.
   */
  const removeFromTeam = useCallback(
    (member: OrgMember) => {
      Modal.confirm({
        title: messages.org.removeConfirm(member.displayName),
        content: messages.org.removeConfirmBody,
        okText: messages.org.confirmOk,
        cancelText: messages.org.confirmCancel,
        okButtonProps: { danger: true },
        onOk: async () => {
          const result = await adminApi(`users/${member.id}/org`, {
            method: "PATCH",
            body: JSON.stringify({
              org_unit_id: null,
              supervisor_user_id: null,
            }),
          });

          if (!result.ok) {
            void message.error(result.message);
            return;
          }

          void message.success(messages.org.saved);
          await Promise.all([refreshTree(), refreshQueue()]);
          reloadMembers();
        },
      });
    },
    [refreshTree, refreshQueue, reloadMembers, message],
  );

  const setUnitActive = useCallback(
    async (unit: OrgUnitNode, active: boolean) => {
      const result = await adminApi(`org-units/${unit.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });

      if (!result.ok) {
        void message.error(result.message);
        return;
      }

      void message.success(messages.org.saved);
      await refreshTree();
    },
    [refreshTree, message],
  );

  /**
   * Deactivating a unit that still holds people would drop their team out of
   * the chart while scope and approval carried on reading it. Members and
   * active children move out first — a refusal, not a warning to click past.
   */
  const toggleActive = useCallback(
    (unit: OrgUnitNode) => {
      if (!unit.active) {
        void setUnitActive(unit, true);
        return;
      }

      if (unit.memberCount > 0) {
        void message.warning(messages.org.deactivateBlockedMembers);
        return;
      }

      if (units.some((child) => child.parentId === unit.id && child.active)) {
        void message.warning(messages.org.deactivateBlockedChildren);
        return;
      }

      Modal.confirm({
        title: messages.org.deactivateConfirm(unit.name),
        okText: messages.org.confirmOk,
        cancelText: messages.org.confirmCancel,
        okButtonProps: { danger: true },
        onOk: () => setUnitActive(unit, false),
      });
    },
    [units, setUnitActive, message],
  );

  const visibleUnits = useMemo(
    () => (treeQuery.trim() ? matchingSubtree(units, treeQuery) : null),
    [units, treeQuery],
  );

  const deleteUnit = useCallback(
    (unit: OrgUnitNode) => {
      Modal.confirm({
        title: messages.org.deleteConfirm(unit.name),
        content: messages.org.deleteConfirmBody,
        okText: messages.org.confirmOk,
        cancelText: messages.org.confirmCancel,
        okButtonProps: { danger: true },
        onOk: async () => {
          const result = await adminApi(`org-units/${unit.id}`, {
            method: "DELETE",
          });

          // The backend refuses while anything still points at the unit and
          // says what, so its message is more useful than any wording here.
          if (!result.ok) {
            void message.error(result.message);
            return;
          }

          void message.success(messages.org.saved);
          setSelectedId(null);
          setMembers([]);
          await refreshTree();
        },
      });
    },
    [refreshTree, message],
  );

  /**
   * The tree of §16 A3: name on the left, who runs it on the right.
   *
   * A branch prints its head's name alone ("ผอ. ประเสริฐ ท."), a unit people
   * actually sit in prints "หัวหน้า: … · N คน". That is not decoration — this
   * tree is the source of truth for "หัวหน้าของผู้ยื่น", so an admin has to be
   * able to see at a glance which unit has nobody in charge.
   *
   * Keyed on the level being one people sit in (แผนก and below) or on the box
   * actually holding somebody. The kind test used to be `=== "TEAM"`, written
   * when ทีม was the only level with members; ฝ่าย and แผนก then printed the
   * branch form for a chart that had no ทีม in it at all.
   */
  function nodeDetail(unit: OrgUnitNode): string {
    if (canHoldMembers(unit.kind) || unit.memberCount > 0) {
      const lead = unit.managerDisplayName
        ? `${messages.org.manager}: ${unit.managerDisplayName} · `
        : "";

      return `${lead}${unit.memberCount} ${messages.org.members}`;
    }

    return (
      unit.managerDisplayName ?? `${unit.memberCount} ${messages.org.members}`
    );
  }

  function renderTree(parentId: string | null, depth = 0) {
    const children = units.filter(
      (unit) =>
        unit.parentId === parentId &&
        (visibleUnits === null || visibleUnits.has(unit.id)),
    );
    if (!children.length) return null;

    return (
      <ul
        className={depth === 0 ? "space-y-1" : "ml-3 space-y-1 border-l pl-3"}
      >
        {children.map((unit) => (
          <li key={unit.id}>
            <button
              type="button"
              onClick={() => selectUnit(unit.id)}
              className={`flex w-full cursor-pointer items-baseline justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-black/5 ${
                unit.id === selectedId ? "bg-black/5 font-medium" : ""
              } ${unit.active ? "" : "opacity-50"}`}
            >
              {/*
                A deactivated unit is dimmed and labelled, never hidden. Hiding
                it would take a team that still has people in it off the chart
                while scope and approval went on reading it.
              */}
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate">{unit.name}</span>
                {!unit.active && (
                  <Tag className="m-0! shrink-0">{messages.org.inactive}</Tag>
                )}
                {/*
                  Which level a box sits at is not guessable from its name —
                  "RND" is a แผนก and "INF" the ฝ่าย above it — and the level
                  decides what may hang under it and whether people may sit in
                  it. Printed on every node rather than on selection, because
                  the question an admin has while reading the tree is where a
                  new box is allowed to go.
                */}
                <Tag className="m-0! shrink-0" color="default">
                  {messages.org.unitKinds[unit.kind]}
                </Tag>
              </span>
              <Text
                type="secondary"
                className="shrink-0 text-xs whitespace-nowrap"
              >
                {nodeDetail(unit)}
              </Text>
            </button>
            {renderTree(unit.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card
        title={messages.org.treeTitle}
        extra={
          <Button size="small" onClick={() => setAddingTeam(true)}>
            {messages.org.addTeam}
          </Button>
        }
      >
        <Input.Search
          allowClear
          className="mb-3"
          placeholder={messages.org.searchTeam}
          value={treeQuery}
          onChange={(event) => setTreeQuery(event.target.value)}
        />
        <div className="max-h-[calc(100vh-50px)] overflow-y-auto pr-2">
          {!units.length ? (
            <Empty />
          ) : visibleUnits?.size === 0 ? (
            <Empty description={messages.org.searchNoMatch} />
          ) : (
            renderTree(null)
          )}
        </div>
        <Paragraph type="secondary" className="mt-4! mb-0! text-xs">
          {messages.org.truthNote}
        </Paragraph>
      </Card>

      <div className="space-y-4">
        {/*
          AUTH-04. The count and the consequence sit in the heading together,
          because "2 คน" alone does not tell an admin that those two people
          cannot raise anything until this queue is cleared.
        */}
        <Card
          title={
            <span className="text-sm font-normal">
              <Text strong>
                {messages.org.unassignedTitle} · {unassigned.length}{" "}
                {messages.org.members}
              </Text>{" "}
              <Text type="secondary">— {messages.org.unassignedHint}</Text>
            </span>
          }
        >
          {unassigned.length ? (
            <ul className="divide-y divide-black/5">
              {unassigned.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center gap-3 py-2"
                >
                  <Initials name={user.displayName} />

                  <div className="min-w-0 grow">
                    <div className="truncate">
                      {user.displayName} ·{" "}
                      <Text type="secondary">{user.username}</Text>
                    </div>
                    <Text type="secondary" className="text-xs">
                      {user.firstLoginAt
                        ? `${messages.org.firstLogin} ${firstLoginLabel(user.firstLoginAt, now)}`
                        : ""}
                      {realmRoles(user.keycloakRoles).length
                        ? ` · ${messages.org.keycloakRole}: ${realmRoles(user.keycloakRoles).join(", ")}`
                        : ""}
                    </Text>
                  </div>

                  <Button
                    size="small"
                    type="primary"
                    onClick={() => setAssigning(user)}
                  >
                    {messages.org.assign}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty description={messages.org.unassignedEmpty} />
          )}
        </Card>

        <Card
          title={
            <span className="text-sm">
              <Text strong>{selected?.name ?? messages.org.treeTitle}</Text>
              {selected?.managerDisplayName && (
                <Text type="secondary" className="ml-2 font-normal">
                  {messages.org.teamLead}: {selected.managerDisplayName}
                </Text>
              )}
            </span>
          }
          extra={
            selected && (
              <div className="flex flex-wrap gap-2">
                <Button size="small" onClick={() => setAddingMember(true)}>
                  {messages.org.addMember}
                </Button>
                <Button size="small" onClick={() => setEditingUnit(true)}>
                  {messages.org.editTeam}
                </Button>
                <Button
                  size="small"
                  danger={selected.active}
                  onClick={() => toggleActive(selected)}
                >
                  {selected.active
                    ? messages.org.deactivateTeam
                    : messages.org.activateTeam}
                </Button>
                {/*
                  Deleting is offered beside deactivating rather than instead of
                  it: the backend refuses while anything points at the unit, so
                  the two are genuinely different answers to "retire this".
                */}
                <Button
                  size="small"
                  danger
                  onClick={() => deleteUnit(selected)}
                >
                  {messages.org.deleteTeam}
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => setChangingLead(true)}
                >
                  {messages.org.changeLead}
                </Button>
              </div>
            )
          }
        >
          {loading ? (
            <Spin />
          ) : members.length ? (
            <ul className="divide-y divide-black/5">
              {orderedMembers.map((member) => {
                const identity = identities[member.username];
                const keycloak = realmRoles(
                  identity?.roles ?? member.keycloakRoles,
                  member.roles.map((role) => role.code),
                );

                /**
                 * The unit's own lead reports *upwards*, out of this unit —
                 * §16 words that "รายงานตรงต่อ" and everyone else "หัวหน้า".
                 * Same field, and the distinction is the point: it shows an
                 * admin where this team hangs off the rest of the chart.
                 */
                const isLead = member.id === selected?.managerUserId;

                return (
                  <li key={member.id} className="flex gap-3 py-2">
                    <Initials name={member.displayName} />

                    <div className="min-w-0 grow">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span>{member.displayName}</span>
                        {member.roles[0]?.name && (
                          <Text type="secondary">{member.roles[0].name}</Text>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {member.roles.map((role) => (
                          <Tag key={role.code}>{role.code}</Tag>
                        ))}
                        {keycloak.map((role) => (
                          <Tag key={role} color="gold">
                            {role}
                          </Tag>
                        ))}
                        {identity?.groups?.map((group) => (
                          <Tag key={group.id} color="cyan">
                            {group.name}
                          </Tag>
                        ))}
                      </div>

                      <Text type="secondary" className="text-xs">
                        {isLead ? messages.org.reportsTo : messages.org.manager}
                        : {member.supervisor?.displayName ?? "—"}
                      </Text>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {canManageRoles && (
                        <Button
                          size="small"
                          onClick={() => setEditingRolesOf(member)}
                        >
                          {messages.org.editRoles}
                        </Button>
                      )}
                      <Button
                        size="small"
                        onClick={() => setMovingMember(member)}
                      >
                        {messages.org.moveMember}
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        danger
                        onClick={() => removeFromTeam(member)}
                      >
                        {messages.org.removeFromTeam}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty description={messages.org.noMembers} />
          )}

          <Paragraph type="secondary" className="mt-4! mb-0! text-xs">
            {messages.org.roleNote}
          </Paragraph>

          {keycloakNote && (
            <Alert
              className="mt-3!"
              type="info"
              showIcon
              title={messages.org.keycloakUnavailable}
              description={keycloakNote}
            />
          )}
        </Card>
      </div>

      <AssignDialog
        user={assigning}
        units={units}
        onClose={() => setAssigning(null)}
        onDone={async () => {
          setAssigning(null);
          void message.success(messages.org.saved);
          await Promise.all([refreshQueue(), refreshTree()]);
          reloadMembers();
        }}
      />

      <AddTeamDialog
        open={addingTeam}
        units={units}
        companyId={companyId}
        onClose={() => setAddingTeam(false)}
        onDone={async () => {
          setAddingTeam(false);
          void message.success(messages.org.saved);
          await refreshTree();
        }}
      />

      <ChangeLeadDialog
        key={`lead-${selected?.id ?? "none"}`}
        open={changingLead}
        unit={selected}
        onClose={() => setChangingLead(false)}
        onDone={async () => {
          setChangingLead(false);
          void message.success(messages.org.saved);
          await refreshTree();
          reloadMembers();
        }}
      />

      {/*
        Keyed on the unit so the form re-mounts with the right `initialValues`
        when the admin selects a different one. The alternative is an effect
        that syncs the form to props, which this file deliberately avoids.
      */}
      <EditUnitDialog
        key={`edit-${selected?.id ?? "none"}`}
        open={editingUnit}
        unit={selected}
        units={units}
        onClose={() => setEditingUnit(false)}
        onDone={async () => {
          setEditingUnit(false);
          void message.success(messages.org.saved);
          await refreshTree();
        }}
      />

      <MoveMemberDialog
        key={`move-${movingMember?.id ?? "none"}`}
        member={movingMember}
        units={units}
        currentUnitId={selectedId}
        onClose={() => setMovingMember(null)}
        onDone={async () => {
          setMovingMember(null);
          void message.success(messages.org.saved);
          await refreshTree();
          reloadMembers();
        }}
      />

      <AddMemberDialog
        open={addingMember}
        unit={selected}
        onClose={() => setAddingMember(false)}
        onDone={async () => {
          setAddingMember(false);
          void message.success(messages.org.saved);
          await Promise.all([refreshTree(), refreshQueue()]);
          reloadMembers();
        }}
      />

      <MemberRolesDialog
        key={`roles-${editingRolesOf?.id ?? "none"}`}
        member={editingRolesOf}
        roles={roles}
        companyId={companyId}
        onClose={() => setEditingRolesOf(null)}
        onDone={() => {
          setEditingRolesOf(null);
          void message.success(messages.org.saved);
          reloadMembers();
        }}
      />
    </div>
  );
}

/**
 * A user picker over the whole company.
 *
 * `GET /users` is company-wide (see `visibleUsersWhere`), so this is genuinely
 * everybody — which is what both callers need: a group head does not have to be
 * a member of the group they lead, and a member being added is by definition
 * not in it yet.
 *
 * Searches on the server rather than filtering a preloaded list: the directory
 * runs to hundreds of people, and a picker that only searches the first page is
 * a picker that cannot find most of them.
 */
function UserPicker({
  value,
  onChange,
  placeholder,
  allowClear,
}: {
  value?: string;
  onChange: (value?: string) => void;
  placeholder: string;
  allowClear?: boolean;
}) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  async function search(term: string) {
    setLoading(true);
    const result = await searchUsers(term);
    setLoading(false);

    setOptions(
      result.ok
        ? result.data.data.map((person) => ({
            value: person.id,
            label: `${person.displayName} · ${person.username}`,
          }))
        : [],
    );
  }

  return (
    <SearchSelect
      className="w-full"
      allowClear={allowClear}
      value={value}
      onChange={onChange}
      onSearch={(term) => void search(term)}
      onFocus={() => {
        if (!options.length) void search("");
      }}
      // The server has already matched; filtering again in the browser would
      // hide results whose match is in a field the label does not show.
      filterOption={false}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : null}
      placeholder={placeholder}
      options={options}
    />
  );
}

/** Moves somebody into the open group — the counterpart of `ย้ายทีม`. */
function AddMemberDialog({
  open,
  unit,
  onClose,
  onDone,
}: {
  open: boolean;
  unit: OrgUnitNode | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [userId, setUserId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!unit || !userId) return;
    setSaving(true);
    setError(null);

    const result = await adminApi(`users/${userId}/org`, {
      method: "PATCH",
      // The group's own head becomes their supervisor, as `AssignDialog` does
      // from the queue — the same move should not mean two different things.
      body: JSON.stringify({
        org_unit_id: unit.id,
        supervisor_user_id: unit.managerUserId ?? null,
      }),
    });

    setSaving(false);
    if (result.ok) {
      setUserId(undefined);
      onDone();
    } else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={`${messages.org.addMember}: ${unit?.name ?? ""}`}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText={messages.org.confirmOk}
      cancelText={messages.org.confirmCancel}
      okButtonProps={{ disabled: !userId }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}
      <Form layout="vertical">
        <Form.Item required extra={messages.org.addMemberHint}>
          <UserPicker
            value={userId}
            onChange={setUserId}
            placeholder={messages.org.selectUser}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * The system roles one member holds in this company.
 *
 * Roles arrive two ways (ROLE-02/ROLE-03) and only one of them is editable
 * here: a grant mapped from a Keycloak claim is re-derived on every login, so
 * revoking it would last until the person next signed in. Those are shown
 * locked with their source, and the checkbox only governs manual grants.
 */
function MemberRolesDialog({
  member,
  roles,
  companyId,
  onClose,
  onDone,
}: {
  member: OrgMember | null;
  roles: RoleRow[];
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const held = new Map((member?.roles ?? []).map((role) => [role.id, role]));

  const [checked, setChecked] = useState<string[]>([...held.keys()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mapped = new Set(
    (member?.roles ?? [])
      .filter((role) => role.source !== "MANUAL")
      .map((role) => role.id),
  );

  async function submit() {
    if (!member) return;
    setSaving(true);
    setError(null);

    const wanted = new Set(checked);
    const granted = [...wanted].filter((id) => !held.has(id));
    // A mapped grant cannot be revoked here, so it is never in the diff even
    // if the box somehow came back unchecked.
    const revoked = [...held.keys()].filter(
      (id) => !wanted.has(id) && !mapped.has(id),
    );

    for (const roleId of granted) {
      const result = await grantRole(member.id, {
        role_id: roleId,
        company_id: companyId,
      });
      if (!result.ok) {
        setSaving(false);
        setError(result.message);
        return;
      }
    }

    for (const roleId of revoked) {
      const result = await revokeRole(member.id, roleId);
      if (!result.ok) {
        setSaving(false);
        setError(result.message);
        return;
      }
    }

    setSaving(false);
    onDone();
  }

  return (
    <Modal
      open={Boolean(member)}
      title={messages.org.editRolesTitle(member?.displayName ?? "")}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText={messages.org.confirmOk}
      cancelText={messages.org.confirmCancel}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}

      <Paragraph type="secondary" className="mb-3! text-xs">
        {messages.org.editRolesHint}
      </Paragraph>

      <div className="space-y-2">
        {roles.map((role) => (
          <div key={role.id} className="flex items-center gap-2">
            <Checkbox
              checked={checked.includes(role.id)}
              disabled={mapped.has(role.id)}
              onChange={(event) =>
                setChecked((current) =>
                  event.target.checked
                    ? [...current, role.id]
                    : current.filter((id) => id !== role.id),
                )
              }
            >
              {role.name} <Text type="secondary">({role.code})</Text>
            </Checkbox>
            {held.has(role.id) && (
              <Tag color={mapped.has(role.id) ? "blue" : "orange"}>
                {mapped.has(role.id)
                  ? messages.org.fromKeycloak
                  : messages.org.manualGrant}
              </Tag>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

/**
 * Rename a unit, change what kind of unit it is, or move it elsewhere in the
 * chart. Re-parenting rebuilds `org_closure` on the backend inside the same
 * transaction, so team and department scope move with it.
 */
function EditUnitDialog({
  open,
  unit,
  units,
  onClose,
  onDone,
}: {
  open: boolean;
  unit: OrgUnitNode | null;
  units: OrgUnitNode[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const forbiddenParents = useMemo(
    () => (unit ? subtreeIds(units, unit.id) : new Set<string>()),
    [units, unit],
  );

  /*
    Only one level fits under any given parent, so the picker offers that one
    and nothing else — moving a box is what changes its level, not a separate
    decision. It stays a visible field rather than a hidden derived value
    because the level is what an admin is checking when they open this dialog.

    Every level is still listed while the parent is one the backend would
    refuse anyway (an older chart that skips a level), so the dialog can be
    used to correct such a unit instead of being the thing that blocks it.
  */
  const parentId = Form.useWatch("parent_id", form) as string | undefined;
  const parent = units.find((candidate) => candidate.id === parentId) ?? null;
  const allowed = kindUnder(parent);
  const offered = allowed ? [allowed] : [...ORG_UNIT_LEVELS];
  const kindOptions = [
    ...new Set([...offered, ...(unit ? [unit.kind] : [])]),
  ].map((kind) => ({ value: kind, label: messages.org.unitKinds[kind] }));

  async function submit() {
    if (!unit) return;

    const values = (await form.validateFields()) as {
      name: string;
      kind: OrgUnitNode["kind"];
      parent_id?: string;
    };

    setSaving(true);
    setError(null);

    const result = await adminApi(`org-units/${unit.id}`, {
      method: "PATCH",
      // `parent_id` is sent even when cleared: `null` promotes the unit to a
      // root, and omitting the key would leave it where it was instead.
      body: JSON.stringify({
        name: values.name,
        kind: values.kind,
        parent_id: values.parent_id ?? null,
      }),
    });

    setSaving(false);
    if (result.ok) onDone();
    else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={`${messages.org.editTeam}: ${unit?.name ?? ""}`}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText={messages.org.confirmOk}
      cancelText={messages.org.confirmCancel}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: unit?.name,
          kind: unit?.kind,
          parent_id: unit?.parentId ?? undefined,
        }}
      >
        <Form.Item label={messages.org.unitCode}>
          {/* Code is the unit's identity across companies — renaming is safe,
              re-coding is not, and `UpdateOrgUnitDto` does not accept it. */}
          <Input value={unit?.code} disabled />
        </Form.Item>
        <Form.Item
          name="name"
          label={messages.org.unitName}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="kind"
          label={messages.org.unitKind}
          rules={[{ required: true }]}
        >
          <SearchSelect options={kindOptions} />
        </Form.Item>
        {/*
          A group cannot hang from itself or from one of its own descendants —
          those are shown greyed rather than hidden, so an admin can see *why*
          the branch they were aiming at is not on offer.
        */}
        <Form.Item name="parent_id" label={messages.org.parentUnit}>
          <UnitTreePicker
            units={units}
            allowClear
            placeholder={messages.org.selectUnit}
            disabled={(candidate) => forbiddenParents.has(candidate.id)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * Move one person to another unit.
 *
 * The supervisor moves with them by default — the destination's lead — because
 * that edge is what data scope, approval step 1 and escalation read. It stays
 * overridable: a person can sit in a team and report past its lead.
 */
function MoveMemberDialog({
  member,
  units,
  currentUnitId,
  onClose,
  onDone,
}: {
  member: OrgMember | null;
  units: OrgUnitNode[];
  currentUnitId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [orgUnitId, setOrgUnitId] = useState<string | undefined>();
  const [supervisorId, setSupervisorId] = useState<string | undefined>();
  const [candidates, setCandidates] = useState<OrgMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Picking the destination also loads the people already in it, so the
   * supervisor field offers real names rather than asking the admin to
   * remember who is in that team.
   */
  async function selectTarget(unitId: string) {
    setOrgUnitId(unitId);

    const unit = units.find((candidate) => candidate.id === unitId);
    setSupervisorId(unit?.managerUserId ?? undefined);

    const result = await adminApi<OrgMember[]>(`org-units/${unitId}/members`);
    setCandidates(result.ok ? result.data : []);
  }

  async function submit() {
    if (!member || !orgUnitId) return;
    setSaving(true);
    setError(null);

    const result = await adminApi(`users/${member.id}/org`, {
      method: "PATCH",
      body: JSON.stringify({
        org_unit_id: orgUnitId,
        supervisor_user_id: supervisorId ?? null,
      }),
    });

    setSaving(false);
    if (result.ok) onDone();
    else setError(result.message);
  }

  return (
    <Modal
      open={Boolean(member)}
      title={`${messages.org.moveMember}: ${member?.displayName ?? ""}`}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText={messages.org.confirmOk}
      cancelText={messages.org.confirmCancel}
      okButtonProps={{ disabled: !orgUnitId }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}
      <Form layout="vertical">
        <Form.Item label={messages.org.targetUnit} required>
          <UnitTreePicker
            units={units}
            value={orgUnitId}
            onChange={(value?: string) => {
              if (value) void selectTarget(value);
            }}
            placeholder={messages.org.selectUnit}
            /*
              A deactivated group is on its way out of the chart, the group they
              are already in is not a move, and บริษัท/ฝ่าย hold no people at
              all (`MEMBER_LEVELS`). All three stay visible so the tree reads
              the same as it does everywhere else.
            */
            disabled={(unit) =>
              !unit.active ||
              unit.id === currentUnitId ||
              !canHoldMembers(unit.kind)
            }
          />
        </Form.Item>
        <Form.Item
          label={messages.org.newSupervisor}
          extra={messages.org.supervisorFromLead}
        >
          <SearchSelect
            allowClear
            value={supervisorId}
            onChange={setSupervisorId}
            disabled={!orgUnitId}
            options={candidates
              .filter((candidate) => candidate.id !== member?.id)
              .map((candidate) => ({
                value: candidate.id,
                label: `${candidate.displayName} · ${candidate.username}`,
              }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function AssignDialog({
  user,
  units,
  onClose,
  onDone,
}: {
  user: UnassignedUser | null;
  units: OrgUnitNode[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [orgUnitId, setOrgUnitId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user || !orgUnitId) return;
    setSaving(true);
    setError(null);

    const unit = units.find((candidate) => candidate.id === orgUnitId);
    const result = await adminApi(`users/${user.id}/org`, {
      method: "PATCH",
      body: JSON.stringify({
        org_unit_id: orgUnitId,
        // The unit's manager becomes their supervisor — that is what approval
        // step 1 and team scope read.
        supervisor_user_id: unit?.managerUserId ?? null,
      }),
    });

    setSaving(false);
    if (result.ok) onDone();
    else setError(result.message);
  }

  return (
    <Modal
      open={Boolean(user)}
      title={`${messages.org.assign}: ${user?.displayName ?? ""}`}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okButtonProps={{ disabled: !orgUnitId }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}
      <Form layout="vertical">
        <Form.Item label={messages.org.selectUnit} required>
          <UnitTreePicker
            units={units}
            value={orgUnitId}
            onChange={setOrgUnitId}
            placeholder={messages.org.selectUnit}
            // Placing somebody in a group that is on its way out of the chart
            // would undo the deactivation the moment they were assigned, and
            // people sit at แผนก or below — the backend refuses anything wider.
            disabled={(unit) => !unit.active || !canHoldMembers(unit.kind)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function AddTeamDialog({
  open,
  units,
  companyId,
  onClose,
  onDone,
}: {
  open: boolean;
  units: OrgUnitNode[];
  companyId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const values = (await form.validateFields()) as {
      code: string;
      name: string;
      parent_id?: string;
    };

    setSaving(true);
    setError(null);

    const parent =
      units.find((candidate) => candidate.id === values.parent_id) ?? null;

    const result = await adminApi("org-units", {
      method: "POST",
      // The level follows the parent — one level down from whatever was
      // selected, บริษัท at the root. This used to send `TEAM` for every box
      // regardless of where it was dropped, which the backend now refuses
      // outright anywhere but under a แผนก.
      body: JSON.stringify({
        ...values,
        kind: kindUnder(parent),
        company_id: companyId,
      }),
    });

    setSaving(false);
    if (result.ok) {
      form.resetFields();
      onDone();
    } else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={messages.org.addTeam}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label={messages.org.unitCode}
          rules={[{ required: true }]}
        >
          <Input placeholder="GETTER2" />
        </Form.Item>
        <Form.Item
          name="name"
          label={messages.org.unitName}
          rules={[{ required: true }]}
        >
          <Input placeholder="ทีมขาย Getter 2" />
        </Form.Item>
        <Form.Item name="parent_id" label={messages.org.parentUnit}>
          <UnitTreePicker
            units={units}
            allowClear
            placeholder={messages.org.selectUnit}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * Sets the group's head, chosen from **anybody in the company**.
 *
 * It used to offer only the group's own members, which cannot express the
 * common case: a department head who sits in one of its positions, or a
 * division head who sits nowhere below themselves. A head is who a group
 * reports to, not who is filed inside it.
 */
function ChangeLeadDialog({
  open,
  unit,
  onClose,
  onDone,
}: {
  open: boolean;
  unit: OrgUnitNode | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [managerId, setManagerId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!unit) return;
    setSaving(true);
    setError(null);

    const result = await adminApi(`org-units/${unit.id}`, {
      method: "PATCH",
      body: JSON.stringify({ manager_user_id: managerId ?? null }),
    });

    setSaving(false);
    if (result.ok) onDone();
    else setError(result.message);
  }

  return (
    <Modal
      open={open}
      title={`${messages.org.changeLead}: ${unit?.name ?? ""}`}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3!" />}
      <Form layout="vertical">
        <Form.Item
          label={messages.org.manager}
          extra={messages.org.leadFromCompany}
        >
          <UserPicker
            allowClear
            value={managerId}
            onChange={setManagerId}
            placeholder={messages.org.selectUser}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
