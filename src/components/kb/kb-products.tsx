"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appApi } from "@/lib/api/client";

interface Products {
  items: {
    code: string;
    name: string;
    groupCode: string | null;
    groupName: string | null;
  }[];
  groups: { code: string; name: string | null }[];
}

/** CD-259 — SAP items and item groups to pick, searched as the user types. */
export function useProductOptions() {
  const [data, setData] = useState<Products>({ items: [], groups: [] });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((q: string) => {
    void appApi<Products>(`kb/products?q=${encodeURIComponent(q)}`).then(
      (r) => r.ok && setData(r.data),
    );
  }, []);

  useEffect(() => load(""), [load]);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(q.trim()), 250);
  };

  return {
    search,
    itemOptions: data.items.map((p) => ({
      value: p.code,
      label: `${p.code} · ${p.name}`,
    })),
    groupOptions: data.groups.map((g) => ({
      value: g.code,
      label: g.name ? `${g.code} · ${g.name}` : g.code,
    })),
  };
}
