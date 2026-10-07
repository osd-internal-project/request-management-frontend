"use client";

import { useEffect, useState } from "react";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";

interface CostCenterOption {
  readonly code: string;
  readonly name: string;
}

/** Loaded once per page: every form on it picks from the same list. */
let cached: Promise<CostCenterOption[]> | null = null;

function loadCostCenters(): Promise<CostCenterOption[]> {
  cached ??= appApi<CostCenterOption[]>("cost-centers").then((result) =>
    result.ok ? result.data : [],
  );
  return cached;
}

/** A field tagged `x-options-source: cost_centers`; the answer is stored as "code - name". */
export function CostCenterSelect({
  value,
  onChange,
}: {
  readonly value: string | undefined;
  readonly onChange: (value: unknown) => void;
}) {
  const [options, setOptions] = useState<CostCenterOption[]>([]);

  useEffect(() => {
    let live = true;
    void loadCostCenters().then((rows) => {
      if (live) setOptions(rows);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <SearchSelect
      className="w-full"
      allowClear
      placeholder={messages.costCenters.pick}
      value={value}
      onChange={onChange}
      options={options.map((row) => {
        const label = `${row.code} - ${row.name}`;
        return { value: label, label };
      })}
    />
  );
}
