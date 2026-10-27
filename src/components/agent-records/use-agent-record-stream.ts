"use client";

import { useEffect, useRef } from "react";
import type { AgentRecordStamp } from "@/lib/api/agent-records";

/**
 * Watches `ids` over SSE and calls `onChange` for each row whose status moved.
 * Opens nothing when `ids` is empty; the server closes the stream once every
 * row is finished, and the hook then stops instead of letting EventSource retry.
 */
export function useAgentRecordStream(
  ids: readonly string[],
  onChange: (stamp: AgentRecordStamp) => void,
) {
  // the latest callback without reopening the stream on every render
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);

  const key = [...ids].sort().join(",");

  useEffect(() => {
    if (!key) return;
    const source = new EventSource(
      `/api/app/agent-records/stream?ids=${encodeURIComponent(key)}`,
    );
    const waiting = new Set(key.split(","));
    let heard = false;

    source.addEventListener("record", (event) => {
      heard = true;
      const stamp = parseStamp((event as MessageEvent<string>).data);
      if (!stamp) return;
      latest.current(stamp);
      if (stamp.status !== "processing") waiting.delete(stamp.id);
      if (waiting.size === 0) source.close();
    });
    source.addEventListener("ping", () => {
      heard = true;
    });
    // A stream that ended before saying anything had nothing to watch (no
    // readable row); retrying would only ask again every few seconds.
    source.addEventListener("error", () => {
      if (!heard) source.close();
      heard = false;
    });

    return () => source.close();
  }, [key]);
}

function parseStamp(data: string): AgentRecordStamp | null {
  try {
    const value: unknown = JSON.parse(data);
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      "status" in value &&
      "updatedAt" in value
    ) {
      // the three fields are checked above; their values come from our own backend
      return value as AgentRecordStamp;
    }
  } catch {
    // a malformed event is skipped; the next one carries the full state again
  }
  return null;
}
