"use client";

import { ExportOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Spin } from "antd";
import Paragraph from "antd/es/typography/Paragraph";
import { useEffect, useState } from "react";
import { getBiMenu, type BiMenu } from "@/lib/api/bi";
import { messages } from "@/lib/messages";

/**
 * CD-92 — the "ตั้งค่า Metabase" admin entry.
 *
 * Metabase administration happens in Metabase's own UI with its own admin
 * account; this screen only hands `admin.bi.manage` holders the door. The
 * backend returns `settings_url: null` to anyone else, so there is nothing
 * here to leak.
 */
export default function AdminBiPage() {
  const [menu, setMenu] = useState<BiMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBiMenu().then((result) => {
      if (result.ok) setMenu(result.data);
      else setError(result.message);
    });
  }, []);

  if (error) {
    return <Alert type="error" showIcon title={messages.bi.loadFailed} description={error} />;
  }

  if (!menu) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!menu.configured || !menu.settings_url) {
    return <Alert type="warning" showIcon title={messages.bi.notConfigured} />;
  }

  return (
    <Card title={messages.bi.settingsTitle}>
      <Paragraph type="secondary">{messages.bi.settingsBody}</Paragraph>
      <Button
        type="primary"
        icon={<ExportOutlined />}
        href={menu.settings_url}
        target="_blank"
      >
        {messages.bi.settingsOpen}
      </Button>
    </Card>
  );
}
