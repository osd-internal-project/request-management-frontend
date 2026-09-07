"use client";

import { Alert, Card, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import type { RoleRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";

/**
 * "การมองเห็นข้อมูล" — what decides who sees which rows.
 *
 * This pane used to edit `scope_rules`, setting a level of
 * own/team/department/company/all per role. Those levels were withdrawn on
 * 31 ส.ค. 2569: visibility follows **involvement in a request** and **the
 * groups a person heads**, neither of which a `(role, resource) → level` row
 * can express. `libs/share/src/access/access-rules.ts` is the whole of it now.
 *
 * So the pane is read-only, and deliberately so. It was hidden for a day and
 * that turned out to be worse than showing something honest: nobody could
 * answer "why can this person not see that", which is exactly the question
 * behind the empty receiver dropdown on 2 ก.ย. 2569 — a permission problem
 * wearing the costume of missing data.
 *
 * Everything below is derived from `roles`, which screen A3 already loads. No
 * fetch of its own, and nothing to save.
 */
export function ScopeRulesAdmin({ roles }: { readonly roles: RoleRow[] }) {
  /**
   * The permissions that widen what somebody sees, in the order they widen it.
   *
   * Not the whole catalog: a permission that only lets an action happen says
   * nothing about visibility, and listing it here would make the table an
   * inventory rather than an answer.
   */
  const widening = [
    {
      code: "request.read.all",
      label: messages.scopeInfo.readAll,
      colour: "red",
    },
    {
      code: "request.sensitive.read",
      label: messages.scopeInfo.sensitive,
      colour: "gold",
    },
    {
      code: "report.request.read",
      label: messages.scopeInfo.reports,
      colour: "blue",
    },
    { code: "audit.read", label: messages.scopeInfo.audit, colour: "purple" },
  ] as const;

  const rows = [...roles]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((role) => {
      const held = new Set(
        role.permissions.map((entry) => entry.permissionCode),
      );

      return {
        key: role.id,
        role,
        widening: widening.filter((entry) => held.has(entry.code)),
      };
    });

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        title={messages.scopeInfo.sourceTitle}
        description={messages.scopeInfo.sourceBody}
      />

      <Card title={messages.scopeInfo.everyoneTitle} size="small">
        <ul className="m-0 list-disc space-y-1 pl-5 text-sm">
          {messages.scopeInfo.everyoneRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Card>

      <Card title={messages.scopeInfo.rolesTitle} size="small">
        <Table
          size="small"
          pagination={false}
          dataSource={rows}
          columns={[
            {
              title: messages.scopeInfo.columnRole,
              key: "role",
              render: (_: unknown, row: (typeof rows)[number]) => (
                <span>
                  {row.role.name}{" "}
                  <Text type="secondary" className="text-xs">
                    {row.role.code}
                  </Text>
                </span>
              ),
            },
            {
              title: messages.scopeInfo.columnWidening,
              key: "widening",
              render: (_: unknown, row: (typeof rows)[number]) =>
                row.widening.length ? (
                  <span className="flex flex-wrap gap-1">
                    {row.widening.map((entry) => (
                      <Tag key={entry.code} color={entry.colour}>
                        {entry.label}
                      </Tag>
                    ))}
                  </span>
                ) : (
                  /*
                    The common case, and the one worth stating rather than
                    leaving blank: an employee sees what they are part of and
                    what they lead, and nothing else.
                  */
                  <Text type="secondary">{messages.scopeInfo.involvedOnly}</Text>
                ),
            },
            {
              /*
                The question this pane exists to answer is "why can this person
                not see that", and since 7 ก.ย. 2569 a role's level is one of
                the answers. Read-only here like everything else on this pane —
                it is set in the Role tab, beside the permissions.
              */
              title: messages.scopeInfo.columnLevel,
              key: "level",
              width: 140,
              render: (_: unknown, row: (typeof rows)[number]) =>
                row.role.visibilityLevel ? (
                  <Tag color="cyan">
                    {messages.scopeInfo.levelOf(
                      messages.org.unitKinds[row.role.visibilityLevel],
                    )}
                  </Tag>
                ) : (
                  <Text type="secondary">{messages.scopeInfo.noLevel}</Text>
                ),
            },
            {
              title: messages.scopeInfo.columnHolders,
              key: "holders",
              width: 90,
              render: (_: unknown, row: (typeof rows)[number]) =>
                messages.roleAdmin.holders(row.role._count.users),
            },
          ]}
        />
      </Card>
    </div>
  );
}
