"use client";

import { useState } from "react";
import { App, Card, Segmented, Select, Switch, Tooltip } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  NotificationFrequency,
  NotificationPreferences,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";

const mp = messages.notifications.preferences;

const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, "0")}:00`,
}));

/**
 * CD-52 — ช่องทางและความถี่ ต่อประเภทการแจ้งเตือน. Each change is saved as it is
 * made (the server answers with the whole set, which replaces local state), so
 * there is no save button to forget.
 */
export function NotificationPreferencesCard({
  initial,
  onError,
}: {
  readonly initial: NotificationPreferences;
  readonly onError: (message: string) => void;
}) {
  const { message } = App.useApp();
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save(body: Record<string, unknown>) {
    setSaving(true);
    const result = await appApi<NotificationPreferences>(
      "notifications/preferences",
      { method: "PUT", body: JSON.stringify(body) },
    );
    setSaving(false);
    if (!result.ok) {
      onError(result.message);
      return;
    }
    setPrefs(result.data);
    message.success(mp.saved);
  }

  const anyDaily = prefs.categories.some(
    (category) => category.frequency === "daily",
  );

  return (
    <Card size="small" title={mp.title} className="self-start">
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span>{mp.inApp}</span>
          <Switch size="small" checked disabled />
        </div>
        <div className="flex items-center justify-between">
          <span>{mp.email}</span>
          <Switch
            size="small"
            checked={prefs.email}
            loading={saving}
            onChange={(next) => void save({ email: next })}
          />
        </div>
        {!prefs.email_delivery_available && (
          <Text type="secondary" className="block text-xs">
            {mp.emailUnavailable}
          </Text>
        )}
        {/* CD-51 — shown only once the Teams channel exists (TEAMS_MODE). */}
        {prefs.teams_available && (
          <>
            <div className="flex items-center justify-between">
              <span>{mp.teams}</span>
              <Switch
                size="small"
                checked={prefs.teams}
                loading={saving}
                onChange={(next) => void save({ teams: next })}
              />
            </div>
            <Text type="secondary" className="block text-xs">
              {mp.teamsHint}
            </Text>
          </>
        )}

        <div className="border-t pt-3">
          <Text strong className="block">
            {mp.perCategory}
          </Text>
          <Text type="secondary" className="block text-xs">
            {mp.perCategoryHint}
          </Text>
        </div>

        {prefs.categories.map((category) => (
          <div key={category.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span>{mp.categories[category.key] ?? category.key}</span>
              <Tooltip title={mp.emailFor}>
                <Switch
                  size="small"
                  checkedChildren={mp.emailShort}
                  unCheckedChildren={mp.emailShort}
                  checked={prefs.email && category.email}
                  disabled={!prefs.email || saving}
                  onChange={(next) =>
                    void save({
                      categories: { [category.key]: { email: next } },
                    })
                  }
                />
              </Tooltip>
            </div>
            {category.digestible ? (
              <Segmented<NotificationFrequency>
                size="small"
                block
                disabled={saving}
                value={category.frequency}
                onChange={(frequency) =>
                  void save({ categories: { [category.key]: { frequency } } })
                }
                options={[
                  { value: "immediate", label: mp.immediate },
                  { value: "daily", label: mp.daily },
                ]}
              />
            ) : (
              <Text type="secondary" className="block text-xs">
                {mp.alwaysImmediate}
              </Text>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <span>{mp.digestHour}</span>
          <Select
            size="small"
            style={{ width: 90 }}
            disabled={saving}
            value={prefs.digest_hour}
            options={HOURS}
            onChange={(digest_hour: number) => void save({ digest_hour })}
          />
        </div>
        <Text type="secondary" className="block text-xs">
          {anyDaily ? mp.digestHint : mp.digestUnused}
        </Text>
      </div>
    </Card>
  );
}
