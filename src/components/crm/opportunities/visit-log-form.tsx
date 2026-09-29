"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Result,
  Segmented,
  Select,
} from "antd";
import { CameraOutlined, CloseOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { LeadActivityType, OpportunityRow } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { uploadActivityPhotos } from "@/components/crm/opportunities/activity-photos";

const m = messages.visitLog;
const TYPES: LeadActivityType[] = ["meeting", "call", "note"];

/**
 * CD-75 — log a visit from the phone, right after leaving the customer: which
 * deal, what happened, the meeting summary, photos straight from the camera,
 * and the next follow-up. One column, large controls, nothing to scroll past.
 *
 * Saved as the deal's ordinary CD-65 activities — a done one for the visit
 * and, when a date is given, a scheduled one for the follow-up — so the deal
 * page, the stale-deal monitor and the dashboard all see it without knowing
 * it came from a phone.
 */
export function VisitLogForm({
  deals,
  initialDealId,
}: {
  readonly deals: OpportunityRow[];
  readonly initialDealId?: string;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const [dealId, setDealId] = useState<string | undefined>(
    deals.some((deal) => deal.id === initialDealId) ? initialDealId : undefined,
  );
  const [type, setType] = useState<LeadActivityType>("meeting");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [followUpOn, setFollowUpOn] = useState<Dayjs | null>(null);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    dealId: string;
    warning: string | null;
  } | null>(null);

  const label = (deal: OpportunityRow) =>
    `${deal.opportunityCode} · ${deal.customer?.nameTh ?? deal.prospectName ?? ""} · ${deal.title}`;

  async function save() {
    if (!dealId) {
      setError(m.pickDeal);
      return;
    }
    setBusy(true);
    setError(null);
    const base = `opportunities/${dealId}/activities`;
    const logged = await appApi<{ id: string }>(base, {
      method: "POST",
      body: JSON.stringify({
        type,
        subject: subject.trim() || m.defaultSubject[type],
        detail: summary.trim() || undefined,
      }),
    });
    if (!logged.ok) {
      setBusy(false);
      setError(logged.message);
      return;
    }

    const warnings: string[] = [];
    if (photos.length) {
      const { failed, reason } = await uploadActivityPhotos(
        dealId,
        logged.data.id,
        photos,
      );
      if (failed) warnings.push(m.photosFailed(failed, reason ?? ""));
    }
    if (followUpOn) {
      const next = await appApi(base, {
        method: "POST",
        body: JSON.stringify({
          type: "task",
          subject: followUpSubject.trim() || m.defaultFollowUp,
          due_at: followUpOn.hour(9).minute(0).second(0).toISOString(),
        }),
      });
      if (!next.ok) warnings.push(m.followUpFailed(next.message));
    }
    setBusy(false);
    setDone({ dealId, warning: warnings.join(" · ") || null });
  }

  function reset() {
    setType("meeting");
    setSubject("");
    setSummary("");
    setPhotos([]);
    setFollowUpOn(null);
    setFollowUpSubject("");
    setDone(null);
  }

  if (done) {
    return (
      <Result
        status={done.warning ? "warning" : "success"}
        title={m.saved}
        subTitle={done.warning ?? undefined}
        extra={[
          <Link key="deal" href={ROUTES.opportunityDetail(done.dealId)}>
            <Button type="primary" size="large">
              {m.openDeal}
            </Button>
          </Link>,
          <Button key="again" size="large" onClick={reset}>
            {m.logAnother}
          </Button>,
        ]}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {error && <Alert type="error" showIcon title={error} />}
      {!deals.length && <Alert type="info" showIcon title={m.noDeals} />}

      <label className="block">
        <Text strong className="mb-1 block">
          {m.deal}
        </Text>
        <Select
          size="large"
          className="w-full"
          showSearch
          optionFilterProp="label"
          placeholder={m.dealPlaceholder}
          value={dealId}
          onChange={setDealId}
          options={deals.map((deal) => ({
            value: deal.id,
            label: label(deal),
          }))}
        />
      </label>

      <div>
        <Text strong className="mb-1 block">
          {m.what}
        </Text>
        <Segmented<LeadActivityType>
          block
          size="large"
          value={type}
          onChange={setType}
          options={TYPES.map((value) => ({ value, label: m.types[value] }))}
        />
      </div>

      <label className="block">
        <Text strong className="mb-1 block">
          {m.subject}
        </Text>
        <Input
          size="large"
          maxLength={255}
          placeholder={m.defaultSubject[type]}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </label>

      <label className="block">
        <Text strong className="mb-1 block">
          {m.summary}
        </Text>
        <Input.TextArea
          rows={6}
          maxLength={4000}
          placeholder={m.summaryPlaceholder}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
      </label>

      <div>
        <Text strong className="mb-1 block">
          {m.photos}
        </Text>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(event) => {
            const picked = [...(event.target.files ?? [])];
            setPhotos((list) => [...list, ...picked].slice(0, 10));
            event.target.value = "";
          }}
        />
        <Button
          size="large"
          block
          icon={<CameraOutlined />}
          onClick={() => camera.current?.click()}
          disabled={photos.length >= 10}
        >
          {m.takePhoto(photos.length)}
        </Button>
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs"
              >
                {file.name}
                <CloseOutlined
                  aria-label={m.removePhoto}
                  onClick={() =>
                    setPhotos((list) => list.filter((_, i) => i !== index))
                  }
                />
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 rounded border border-dashed p-3">
        <Text strong className="block">
          {m.followUp}
        </Text>
        <DatePicker
          size="large"
          className="w-full"
          placeholder={m.followUpDate}
          value={followUpOn}
          onChange={setFollowUpOn}
          inputReadOnly
        />
        {followUpOn && (
          <Input
            size="large"
            maxLength={255}
            placeholder={m.defaultFollowUp}
            value={followUpSubject}
            onChange={(event) => setFollowUpSubject(event.target.value)}
          />
        )}
      </div>

      <Button
        type="primary"
        size="large"
        block
        loading={busy}
        disabled={!dealId}
        onClick={() => void save()}
      >
        {m.save}
      </Button>
    </div>
  );
}
