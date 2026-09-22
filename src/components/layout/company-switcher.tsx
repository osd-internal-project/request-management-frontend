"use client";

import { useState } from "react";
import { App } from "antd";
import { messages } from "@/lib/messages";
import { SearchSelect } from "@/components/ui/search-select";

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
 * resolves roles and visible sensitive fields per company (ROLE-04) — the menu
 * and every list on screen have to be rebuilt from the new company's
 * permissions.
 *
 * A full `window.location.reload()` rather than `router.refresh()`: the company
 * lives in an httpOnly cookie the server reads per request, and a soft refresh
 * leaves client state from the previous company in place.
 */
export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: SwitcherCompany[];
  activeCompanyId: string | null;
}) {
  // antd's `message` from context, so it inherits the app theme.
  const { message } = App.useApp();
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
      window.location.reload();
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
