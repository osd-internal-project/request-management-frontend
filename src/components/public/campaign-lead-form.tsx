"use client";

import { useState } from "react";
import { Alert, Button, Card, Checkbox, Input, Result } from "antd";
import Title from "antd/es/typography/Title";
import Paragraph from "antd/es/typography/Paragraph";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { messages } from "@/lib/messages";

const m = messages.leadForm;

/** What the form page reads before it draws — CD-270 adds the event. */
export interface LeadFormView {
  campaign: string;
  intro: string | null;
  kind: "campaign" | "event";
  event?: {
    starts_at: string | null;
    ends_at: string | null;
    venue: string | null;
    online: boolean;
    full: boolean;
    open: boolean;
  };
}

interface Values {
  company: string;
  contact_name: string;
  position: string;
  phone: string;
  email: string;
  need: string;
}

const EMPTY: Values = {
  company: "",
  contact_name: "",
  position: "",
  phone: "",
  email: "",
  need: "",
};

/**
 * CD-269 — a campaign's public registration form: who they are, how to reach
 * them, what they need, and consent to be contacted. Posts to the web app's
 * own route, which adds the intake key on the server.
 */
export function CampaignLeadForm({
  token,
  form,
}: {
  token: string;
  form: LeadFormView;
}) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    status: string | null;
    online_url: string | null;
  } | null>(null);

  const event = form.kind === "event" ? form.event : undefined;

  const set = (key: keyof Values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  async function submit() {
    if (!values.contact_name.trim() && !values.company.trim()) {
      setError(m.nameRequired);
      return;
    }
    if (!values.phone.trim() && !values.email.trim()) {
      setError(m.contactRequired);
      return;
    }
    if (!consent) {
      setError(m.consentRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/public/lead-forms/${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, consent, website }),
      },
    ).catch(() => null);
    setBusy(false);
    if (!response) {
      setError(m.failed);
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      setError(body.message ?? m.failed);
      return;
    }
    const answer = (await response.json().catch(() => ({}))) as {
      status?: string | null;
      online_url?: string | null;
    };
    setDone({
      status: answer.status ?? null,
      online_url: answer.online_url ?? null,
    });
  }

  return (
    <Card className="mx-auto max-w-xl">
      {done ? (
        <Result
          status={done.status === "waitlisted" ? "info" : "success"}
          title={
            done.status === "registered"
              ? m.registered
              : done.status === "waitlisted"
                ? m.waitlisted
                : m.thanks
          }
          subTitle={done.status ? undefined : m.thanksHint}
          extra={
            done.online_url ? (
              <a href={done.online_url} target="_blank" rel="noreferrer">
                {m.onlineLink}
              </a>
            ) : undefined
          }
        />
      ) : event && !event.open ? (
        <Result status="info" title={m.eventClosed} />
      ) : (
        <div className="space-y-4">
          <div>
            <Title level={3} className="mb-1!">
              {form.campaign}
            </Title>
            {event && (
              <div className="mb-2 text-sm">
                {event.starts_at && (
                  <div>
                    <Text type="secondary">{m.eventWhen}: </Text>
                    {dayjs(event.starts_at).format("DD/MM/YYYY HH:mm")}
                    {event.ends_at &&
                      `–${dayjs(event.ends_at).format("HH:mm")}`}
                  </div>
                )}
                {event.venue && (
                  <div>
                    <Text type="secondary">{m.eventWhere}: </Text>
                    {event.venue}
                  </div>
                )}
                {event.online && <Text type="secondary">{m.eventOnline}</Text>}
              </div>
            )}
            {event?.full && (
              <Alert
                type="warning"
                showIcon
                title={m.eventFull}
                className="mb-2"
              />
            )}
            {form.intro && (
              <Paragraph type="secondary" className="whitespace-pre-line">
                {form.intro}
              </Paragraph>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <Text>{m.company}</Text>
              <Input
                value={values.company}
                maxLength={255}
                onChange={set("company")}
              />
            </label>
            <label className="block">
              <Text>{m.contactName}</Text>
              <Input
                value={values.contact_name}
                maxLength={255}
                onChange={set("contact_name")}
              />
            </label>
            <label className="block">
              <Text>{m.position}</Text>
              <Input
                value={values.position}
                maxLength={255}
                onChange={set("position")}
              />
            </label>
            <label className="block">
              <Text>{m.phone}</Text>
              <Input
                value={values.phone}
                maxLength={50}
                inputMode="tel"
                onChange={set("phone")}
              />
            </label>
            <label className="block">
              <Text>{m.email}</Text>
              <Input
                value={values.email}
                maxLength={255}
                inputMode="email"
                onChange={set("email")}
              />
            </label>
            <label className="block sm:col-span-2">
              <Text>{m.need}</Text>
              <Input.TextArea
                rows={3}
                value={values.need}
                maxLength={1500}
                onChange={set("need")}
              />
            </label>
          </div>

          {/* The honeypot: out of sight and out of the tab order; people leave it empty. */}
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 overflow-hidden"
          >
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>

          <Checkbox
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          >
            {m.consent}
          </Checkbox>

          {error && <Alert type="error" showIcon title={error} />}

          <Button
            type="primary"
            size="large"
            block
            loading={busy}
            onClick={() => void submit()}
          >
            {m.submit}
          </Button>
        </div>
      )}
    </Card>
  );
}
