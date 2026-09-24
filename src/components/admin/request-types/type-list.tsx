"use client";

import { useMemo, useState } from "react";
import { Card, Empty, Input, Tag } from "antd";
import Text from "antd/es/typography/Text";
import type { OrgUnitNode, RequestType } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { DEFAULT_COVERAGE } from "./type-draft";

/** §16's left column: every type of the active company, status included. */
export function TypeList({
  types,
  orgUnits,
  selectedCode,
  companyName,
  className,
  onSelect,
}: {
  readonly types: RequestType[];
  readonly orgUnits: OrgUnitNode[];
  readonly selectedCode: string | null;
  readonly companyName: string | null;
  /** Sizing from the page, so both columns share one height rule. */
  readonly className: string;
  readonly onSelect: (type: RequestType) => void;
}) {
  const [query, setQuery] = useState("");
  const unitNames = useMemo(
    () => new Map(orgUnits.map((unit) => [unit.id, unit.name])),
    [orgUnits],
  );

  const needle = query.trim().toLowerCase();
  // Order comes from the API (active first, then code); this only narrows it.
  const visible = needle
    ? types.filter(
        (type) =>
          type.name.toLowerCase().includes(needle) ||
          type.code.toLowerCase().includes(needle),
      )
    : types;

  return (
    <Card
      title={
        companyName
          ? messages.requestTypes.listTitleFor(companyName)
          : messages.requestTypes.listTitle
      }
      className={className}
      classNames={{ body: "flex min-h-0 flex-1 flex-col" }}
      styles={{ body: { padding: 0 } }}
    >
      <div className="shrink-0 border-b border-black/5 p-3">
        <Input.Search
          allowClear
          placeholder={messages.requestTypes.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visible.length ? (
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
          {visible.map((type) => (
            <li
              key={type.code}
              className="border-b border-black/5 last:border-b-0"
            >
              <TypeRow
                type={type}
                selected={type.code === selectedCode}
                receiverName={
                  (type.receiverOrgUnitId &&
                    unitNames.get(type.receiverOrgUnitId)) ||
                  messages.requestTypes.noReceiver
                }
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4">
          <Empty
            description={types.length ? messages.requestTypes.searchNoMatch : undefined}
          />
        </div>
      )}
    </Card>
  );
}

function TypeRow({
  type,
  selected,
  receiverName,
  onSelect,
}: {
  readonly type: RequestType;
  readonly selected: boolean;
  readonly receiverName: string;
  readonly onSelect: (type: RequestType) => void;
}) {
  const sla = type.slaHours
    ? messages.requestTypes.slaShort(
        type.slaHours,
        (type.slaCoverage ?? DEFAULT_COVERAGE) !== DEFAULT_COVERAGE,
      )
    : messages.requestTypes.slaUnset;

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={`flex w-full cursor-pointer flex-col gap-1 border-l-[3px] px-4 py-3 text-left hover:bg-black/[0.03] ${
        selected
          ? "border-l-[var(--app-primary)] bg-[var(--app-primary-pale)]"
          : "border-l-transparent"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-semibold">{type.name}</span>
        <Tag color={type.active ? "green" : "default"} className="m-0!">
          {type.active
            ? messages.requestTypes.active
            : messages.requestTypes.inactive}
        </Tag>
      </span>

      <Text type="secondary" className="truncate text-xs">
        {messages.requestTypes.listSubtitle(type.code, receiverName, sla)}
      </Text>
    </button>
  );
}
