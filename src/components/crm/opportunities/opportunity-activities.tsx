"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Collapse, Space } from "antd";
import Text from "antd/es/typography/Text";
import {
  ACTIVITY_ICON,
  ActivityList,
  ActivityModal,
  formatWhen,
  splitActivities,
} from "@/components/crm/activity-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type {
  LeadActivityType,
  OpportunityActivity,
  OpportunityDetail,
  SalesActivity,
} from "@/lib/api/types";

const md = messages.sales.opportunities.detail;
const ma = messages.sales.leads.detail.activities;

const LOG_TYPES: LeadActivityType[] = ["call", "email", "meeting", "task", "note"];

/**
 * CD-65 กิจกรรมและการติดตามบนโอกาสการขาย — ปุ่มลงกิจกรรมตามประเภท,
 * นัดที่ค้างเรียงตามกำหนด, ที่ทำแล้วพับไว้. การลงกิจกรรมที่ทำแล้วคือสิ่งที่ล้าง
 * สถานะ "เงียบ" ที่ระบบแจ้งหัวหน้าไว้.
 */
export function OpportunityActivitiesCard({
  opportunity,
  activities,
  canManage,
}: {
  opportunity: OpportunityDetail;
  activities: OpportunityActivity[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [error, setError] = useState<string | null>(null);
  const [logging, setLogging] = useState<LeadActivityType | null>(null);

  const closed = opportunity.stage === "won" || opportunity.stage === "lost";
  const editable = canManage && !closed;
  const { pending, done } = splitActivities(activities);

  async function toggle(activity: SalesActivity, completed: boolean) {
    setError(null);
    const result = await appApi(
      `opportunities/${opportunity.id}/activities/${activity.id}`,
      { method: "PATCH", body: JSON.stringify({ completed }) },
    );
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(ma.updated);
    router.refresh();
  }

  return (
    <Card
      size="small"
      title={md.activitiesTitle}
      extra={
        closed ? (
          <Text type="secondary" className="text-xs">
            {md.closedActivitiesHint}
          </Text>
        ) : undefined
      }
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}

      {opportunity.staleAlertedAt && !closed && (
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          title={md.staleBanner(formatWhen(opportunity.staleAlertedAt))}
          description={editable ? md.staleHint : undefined}
        />
      )}

      {/* ปุ่มลงกิจกรรมอยู่ในตัวการ์ด ไม่ใช่หัวการ์ด — จอแคบจะบีบชื่อการ์ดจนอ่านไม่ออก */}
      {editable && (
        <Space size={4} wrap className="mb-3">
          {LOG_TYPES.map((type) => (
            <Button
              key={type}
              size="small"
              icon={ACTIVITY_ICON[type]}
              onClick={() => setLogging(type)}
            >
              {ma.type[type]}
            </Button>
          ))}
        </Space>
      )}

      <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
        <span>
          {md.lastActivity}:{" "}
          {opportunity.lastActivityAt
            ? formatWhen(opportunity.lastActivityAt)
            : md.neverActive}
        </span>
        <span>
          {md.nextFollowUp}:{" "}
          {opportunity.nextFollowUpAt ? formatWhen(opportunity.nextFollowUpAt) : "—"}
        </span>
      </div>

      <Text strong className="text-xs">
        {md.pendingTitle}
      </Text>
      <ActivityList
        activities={pending}
        editable={editable}
        onToggle={toggle}
        emptyText={md.noPending}
      />

      {done.length > 0 && (
        <Collapse
          ghost
          size="small"
          className="mt-2"
          items={[
            {
              key: "done",
              label: md.doneTitle(done.length),
              children: (
                <ActivityList
                  activities={done}
                  editable={editable}
                  onToggle={toggle}
                  emptyText={md.noActivities}
                />
              ),
            },
          ]}
        />
      )}

      <ActivityModal
        key={logging ? `log-${logging}` : "log-closed"}
        endpoint={`opportunities/${opportunity.id}/activities`}
        type={logging}
        onClose={() => setLogging(null)}
        onSaved={() => {
          setLogging(null);
          router.refresh();
        }}
      />
    </Card>
  );
}
