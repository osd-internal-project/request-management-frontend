"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  message,
} from "antd";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import Link from "next/link";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

import type {
  OrgUnitNode,
  UnassignedUser,
  OrgMember,
} from "@/lib/api/types";
import { adminApi } from "@/lib/api/client";
export type {
  OrgUnitNode,
  UnassignedUser,
  OrgMember,
} from "@/lib/api/types";

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
}: {
  units: OrgUnitNode[];
  unassigned: UnassignedUser[];
  /** Unit opened on first paint, chosen server-side. */
  initialSelectedId: string | null;
  /** Its members, fetched server-side so the first paint needs no effect. */
  initialMembers: OrgMember[];
  /** Active company — required when creating a unit (D-11). */
  companyId: string;
}) {
  const [units, setUnits] = useState(initialUnits);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [members, setMembers] = useState<OrgMember[]>(initialMembers);
  const [identities, setIdentities] = useState<Record<string, KeycloakIdentity>>({});
  const [loading, setLoading] = useState(false);
  const [keycloakNote, setKeycloakNote] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<UnassignedUser | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [changingLead, setChangingLead] = useState(false);

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
   * The tree of §16 A3: name on the left, who runs it on the right.
   *
   * A branch prints its head's name alone ("ผอ. ประเสริฐ ท."), a unit people
   * actually sit in prints "หัวหน้า: … · N คน". That is not decoration — this
   * tree is the source of truth for "หัวหน้าของผู้ยื่น", so an admin has to be
   * able to see at a glance which unit has nobody in charge.
   *
   * Keyed on having members rather than on `kind === "TEAM"`: the real OSD
   * chart is บริษัท → ฝ่าย → แผนก with no TEAM level at all, and the kind test
   * left every one of its units printing the branch form.
   */
  function nodeDetail(unit: OrgUnitNode): string {
    if (unit.kind === "TEAM" || unit.memberCount > 0) {
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
    const children = units.filter((unit) => unit.parentId === parentId);
    if (!children.length) return null;

    return (
      <ul className={depth === 0 ? "space-y-1" : "ml-3 space-y-1 border-l pl-3"}>
        {children.map((unit) => (
          <li key={unit.id}>
            <button
              type="button"
              onClick={() => selectUnit(unit.id)}
              className={`flex w-full cursor-pointer items-baseline justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-black/5 ${
                unit.id === selectedId ? "bg-black/5 font-medium" : ""
              }`}
            >
              <span className="truncate">{unit.name}</span>
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
        {units.length ? renderTree(null) : <Empty />}
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
              <Button type="primary" size="small" onClick={() => setChangingLead(true)}>
                {messages.org.changeLead}
              </Button>
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
                        <Tag color="geekblue">
                          {messages.org.scope}: {member.scope}
                        </Tag>
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
                        {/*
                          Not an edit control. `ScopeRule` is keyed on
                          `(role, resource)` — SCOPE-01, enforced by
                          `@@unique([roleId, resource])` — so there is no such
                          thing as this person's scope to change. A button here
                          promised one and silently rewrote the scope of
                          everyone holding the same role.
                        */}
                        {member.roles.length > 0 && (
                          <Link href={`${ROUTES.adminOrg}?tab=scope`}>
                            <Text type="secondary" className="text-xs underline">
                              {messages.org.scopeEditedOnRole}
                            </Text>
                          </Link>
                        )}
                      </div>

                      <Text type="secondary" className="text-xs">
                        {isLead ? messages.org.reportsTo : messages.org.manager}
                        : {member.supervisor?.displayName ?? "—"}
                      </Text>
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
        open={changingLead}
        unit={selected}
        members={members}
        onClose={() => setChangingLead(false)}
        onDone={async () => {
          setChangingLead(false);
          void message.success(messages.org.saved);
          await refreshTree();
          reloadMembers();
        }}
      />
    </div>
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
          <Select
            value={orgUnitId}
            onChange={setOrgUnitId}
            placeholder={messages.org.selectUnit}
            options={units.map((unit) => ({
              value: unit.id,
              label: `${unit.name}${unit.managerDisplayName ? ` — ${unit.managerDisplayName}` : ""}`,
            }))}
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

    const result = await adminApi("org-units", {
      method: "POST",
      // A unit added by hand is a team under whatever was selected; ฝ่าย and
      // แผนก come from the HR register through the importer, not from here.
      body: JSON.stringify({ ...values, kind: "TEAM", company_id: companyId }),
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
        <Form.Item name="code" label={messages.org.unitCode} rules={[{ required: true }]}>
          <Input placeholder="GETTER2" />
        </Form.Item>
        <Form.Item name="name" label={messages.org.unitName} rules={[{ required: true }]}>
          <Input placeholder="ทีมขาย Getter 2" />
        </Form.Item>
        <Form.Item name="parent_id" label={messages.org.parentUnit}>
          <Select
            allowClear
            options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ChangeLeadDialog({
  open,
  unit,
  members,
  onClose,
  onDone,
}: {
  open: boolean;
  unit: OrgUnitNode | null;
  members: OrgMember[];
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
        <Form.Item label={messages.org.manager}>
          <Select
            allowClear
            value={managerId}
            onChange={setManagerId}
            placeholder={messages.org.manager}
            options={members.map((member) => ({
              value: member.id,
              label: `${member.displayName} · ${member.username}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
