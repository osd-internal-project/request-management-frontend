"use client";

import { Alert, Card, Spin } from "antd";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getBiMenu, type BiMenu } from "@/lib/api/bi";
import { messages } from "@/lib/messages";

/**
 * CD-92 — one embedded Metabase dashboard.
 *
 * The URL is a short-lived token the backend signed *after* PolicyGuard let
 * this caller through, so the menu is fetched fresh on every mount — a cached
 * URL would just be an expired one. No Metabase credential ever reaches the
 * browser.
 */
export default function BiDashboardPage() {
  const { key } = useParams<{ key: string }>();
  const [menu, setMenu] = useState<BiMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMenu(null);
    setError(null);

    getBiMenu().then((result) => {
      if (cancelled) return;
      if (result.ok) setMenu(result.data);
      else setError(result.message);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  if (error) {
    return <Alert type="error" showIcon message={messages.bi.loadFailed} description={error} />;
  }

  if (!menu) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!menu.configured) {
    return <Alert type="warning" showIcon message={messages.bi.notConfigured} />;
  }

  const dashboard = menu.dashboards.find((entry) => entry.key === key);

  if (!dashboard) {
    return <Alert type="warning" showIcon message={messages.bi.notFound} />;
  }

  return (
    <Card
      title={dashboard.title}
      styles={{ body: { padding: 0 } }}
      className="overflow-hidden"
    >
      <iframe
        src={dashboard.embed_url}
        title={dashboard.title}
        className="block w-full border-0"
        style={{ height: "calc(100vh - 220px)" }}
        allowTransparency
      />
    </Card>
  );
}
