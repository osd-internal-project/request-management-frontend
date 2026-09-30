"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "antd";
import { appApi } from "@/lib/api/client";
import type { PartnerList } from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const mp = messages.presales.partners;

/**
 * CD-142 — pick a supplier from SAP's list (blocked ones left out). Picking
 * sets both the code and the name SAP holds; a quote saved before CD-142 with
 * a typed name still shows that name.
 */
export function PartnerPicker({
  code,
  name,
  onChange,
}: {
  code: string;
  name: string;
  onChange: (vendor: { code: string; name: string }) => void;
}) {
  const [options, setOptions] = useState<
    { value: string; label: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(q: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(true);
      void appApi<PartnerList>(
        `presales/partners?active=1${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      ).then((result) => {
        setLoading(false);
        if (!result.ok) return;
        setOptions(
          result.data.items.map((row) => ({
            value: row.code,
            label: `${row.code} · ${row.name}`,
            name: row.name,
          })),
        );
      });
    }, 250);
  }

  useEffect(() => {
    search("");
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const current =
    code && !options.some((option) => option.value === code)
      ? [{ value: code, label: `${code} · ${name}`, name }]
      : [];

  return (
    <Select
      showSearch={{ filterOption: false, onSearch: search }}
      allowClear
      className="w-full md:col-span-2"
      placeholder={name && !code ? name : mp.pick}
      loading={loading}
      value={code || undefined}
      options={[...current, ...options]}
      onChange={(value: string | undefined, option) => {
        const picked = Array.isArray(option) ? option[0] : option;
        onChange(
          value && picked
            ? { code: value, name: (picked as { name: string }).name }
            : { code: "", name: "" },
        );
      }}
    />
  );
}
