"use client";

import { useState } from "react";
import { message } from "antd";
import { useRouter } from "next/navigation";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/search-select";

export interface SwitcherCompany {
  id: string;
  name: string;
}

/**
 * AUTH-05 — the active company, on the header of every page.
 *
 * Someone with one company sees a label, not a control: a dropdown of one is
 * noise, and the spec asks for switching only where there is something to
 * switch between.
 *
 * Switching is a server round trip rather than local state because the backend
 * resolves roles, scopes, and visible sensitive fields per company (ROLE-04) —
 * the menu and every list on screen have to be rebuilt from the new company's
 * permissions, which is what `router.refresh()` does.
 */
export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: SwitcherCompany[];
  activeCompanyId: string | null;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const active = companies.find((company) => company.id === activeCompanyId);

  if (companies.length <= 1) {
    return (
      <div className="text-sm text-gray-600">
        {active ? `${messages.nav.company}: ${active.name}` : ""}
      </div>
    );
  }

  const switchTo = async (companyId: string) => {
    setSwitching(true);

    try {
      const response = await fetch("/api/auth/switch-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        void message.error(body?.message ?? messages.nav.switchFailed);
        return;
      }

      // Server components hold the data; refreshing is what re-renders every
      // list, count, and menu entry against the company just selected.
      router.refresh();
    } catch {
      void message.error(messages.common.loadError);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="hidden sm:inline">{messages.nav.company}:</span>
      <SearchSelect
        size="small"
        value={activeCompanyId ?? undefined}
        loading={switching}
        onChange={switchTo}
        style={{ minWidth: 150 }}
        options={companies.map((company) => ({
          value: company.id,
          label: company.name,
        }))}
      />
    </div>
  );
}
