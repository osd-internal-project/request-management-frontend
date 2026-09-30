"use client";

import { Button, Input } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { SearchSelect } from "@/components/ui/search-select";
import { messages } from "@/lib/messages";

const m = messages.projects.openPage;

export interface TeamRow {
  userId?: string;
  role: string;
}

/** CD-175 — the project team as rows of person + what they do. */
export function ProjectTeamFields({
  rows,
  onChange,
  people,
  exclude,
}: {
  readonly rows: TeamRow[];
  readonly onChange: (rows: TeamRow[]) => void;
  readonly people: { id: string; name: string }[];
  /** The manager — not offered as a member. */
  readonly exclude?: string;
}) {
  const taken = new Set(rows.map((row) => row.userId));
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <SearchSelect
            className="min-w-56 flex-1"
            aria-label={m.team}
            value={row.userId}
            onChange={(userId: string) =>
              onChange(
                rows.map((item, at) =>
                  at === index ? { ...item, userId } : item,
                ),
              )
            }
            options={people
              .filter(
                (person) =>
                  person.id !== exclude &&
                  (person.id === row.userId || !taken.has(person.id)),
              )
              .map((person) => ({ value: person.id, label: person.name }))}
          />
          <Input
            className="max-w-56"
            aria-label={m.memberRole}
            placeholder={m.memberRole}
            maxLength={100}
            value={row.role}
            onChange={(event) =>
              onChange(
                rows.map((item, at) =>
                  at === index ? { ...item, role: event.target.value } : item,
                ),
              )
            }
          />
          <Button
            danger
            type="text"
            aria-label="remove"
            icon={<DeleteOutlined />}
            onClick={() => onChange(rows.filter((_, at) => at !== index))}
          />
        </div>
      ))}
      <Button size="small" onClick={() => onChange([...rows, { role: "" }])}>
        {m.addMember}
      </Button>
    </div>
  );
}

/** Rows as the API takes them: people chosen only. */
export const teamPayload = (rows: TeamRow[]) =>
  rows
    .filter((row) => row.userId)
    .map((row) => ({
      user_id: row.userId!,
      role: row.role.trim() || undefined,
    }));
