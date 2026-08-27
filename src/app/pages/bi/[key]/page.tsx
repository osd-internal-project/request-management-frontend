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

  /**
   * The answer is stored together with the key it was fetched for.
   *
   * Clearing state imperatively when `key` changes would mean writing state
   * during the effect, which React now rejects — pairing the two lets
   * staleness be *derived* instead, and the spinner returns on its own while
   * the next dashboard's signed URL is being fetched.
   */
  const [loaded, setLoaded] = useState<{
    key: string;
    menu: BiMenu | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    getBiMenu().then((result) => {
      if (cancelled) return;

      setLoaded(
        result.ok
          ? { key, menu: result.data, error: null }
          : { key, menu: null, error: result.message },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = loaded?.key === key ? loaded : null;
  const menu = current?.menu ?? null;
  const error = current?.error ?? null;

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
