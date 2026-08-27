"use client";

import { useState } from "react";
import { AutoComplete, Button, DatePicker, Input, Space } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { messages } from "@/lib/messages";

const { RangePicker } = DatePicker;

/**
 * Filter values live in the URL rather than in component state.
 *
 * An auditor's job is to hand someone else the exact view they are looking at,
 * and a filtered page that cannot be linked to is one they have to describe in
 * words instead. It also means the server component keeps doing the query — no
 * second fetch from the browser, and no divergence between what the page shows
 * and what the URL says.
 */
export function AuditFilters({
  eventTypes,
  resourceTypes,
}: {
  readonly eventTypes: string[];
  readonly resourceTypes: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [actorId, setActorId] = useState(params.get("actor_id") ?? "");

  function apply(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    // Any filter change invalidates the page number: page 3 of the old result
    // set is rarely page 3 of the new one, and lands on an empty table.
    next.delete("page");

    router.push(`?${next.toString()}`);
  }

  return (
    <Space wrap size="small" className="w-full">
      <Input
        allowClear
        style={{ width: 260 }}
        placeholder={messages.audit.filters.actorHint}
        value={actorId}
        onChange={(event) => setActorId(event.target.value)}
        onPressEnter={() => apply({ actor_id: actorId })}
      />

      {/*
        AutoComplete rather than Select: the event catalog is declared in code
        across both services and has no endpoint, so any list assembled here
        would be a partial copy that silently hides the events it missed.
        Suggestions come from what is on screen; anything else can be typed.
      */}
      <AutoComplete
        allowClear
        style={{ width: 220 }}
        placeholder={messages.audit.filters.anyEvent}
        value={params.get("event_type") ?? undefined}
        options={eventTypes.map((type) => ({ value: type }))}
        filterOption={(input, option) =>
          (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
        }
        onSelect={(value: string) => apply({ event_type: value })}
        onClear={() => apply({ event_type: undefined })}
      />

      <AutoComplete
        allowClear
        style={{ width: 180 }}
        placeholder={messages.audit.filters.anyResource}
        value={params.get("resource_type") ?? undefined}
        options={resourceTypes.map((type) => ({ value: type }))}
        filterOption={(input, option) =>
          (option?.value ?? "").toLowerCase().includes(input.toLowerCase())
        }
        onSelect={(value: string) => apply({ resource_type: value })}
        onClear={() => apply({ resource_type: undefined })}
      />

      <RangePicker
        showTime
        onChange={(range) =>
          apply({
            from: range?.[0]?.toISOString(),
            to: range?.[1]?.toISOString(),
          })
        }
      />

      <Button type="primary" onClick={() => apply({ actor_id: actorId })}>
        {messages.audit.filters.apply}
      </Button>

      <Button
        onClick={() => {
          setActorId("");
          router.push("?");
        }}
      >
        {messages.audit.filters.clear}
      </Button>
    </Space>
  );
}
