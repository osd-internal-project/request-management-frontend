"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, Rate, Result, Spin } from "antd";
import Text from "antd/es/typography/Text";
import { messages } from "@/lib/messages";

const m = messages.service.assets.surveys;

interface View {
  companyName: string;
  requestNo: string | null;
  subject: string;
  doneOn: string | null;
  state: "open" | "answered" | "expired";
}

/**
 * CD-248 — the customer's page: the job, an overall score (required), three
 * aspects and a comment, sent once. No session; the link is the credential.
 */
export function PublicSurvey({ token }: { readonly token: string }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    void fetch(`/api/public/survey/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = (await response.json()) as View & { message?: string };
        if (!live) return;
        if (response.ok) setView(body);
        else setError(body.message ?? m.public.invalid);
      })
      .catch(() => live && setError(m.public.unavailable));
    return () => {
      live = false;
    };
  }, [token]);

  async function submit() {
    if (!scores.overall) {
      setError(m.public.required);
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/public/survey/${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          overall: scores.overall,
          ...(scores.speed ? { speed: scores.speed } : {}),
          ...(scores.technician ? { technician: scores.technician } : {}),
          ...(scores.outcome ? { outcome: scores.outcome } : {}),
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        }),
      },
    ).catch(() => null);
    setBusy(false);
    if (!response) {
      setError(m.public.unavailable);
      return;
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      setError(body.message ?? m.public.unavailable);
      return;
    }
    setDone(true);
  }

  if (done) return <Result status="success" title={m.public.thanks} />;
  if (!view) {
    return error ? (
      <Result status="warning" title={error} />
    ) : (
      <div className="py-16 text-center">
        <Spin />
      </div>
    );
  }
  if (view.state === "answered") {
    return <Result status="success" title={m.public.answered} />;
  }
  if (view.state === "expired") {
    return <Result status="info" title={m.public.expired} />;
  }

  return (
    <Card title={m.public.title}>
      <Text className="mb-1 block">{m.public.intro(view.companyName)}</Text>
      <Text type="secondary" className="mb-4 block text-sm">
        {m.public.job(view.requestNo ?? "—", view.subject)}
      </Text>
      {error && <Alert className="mb-3" type="error" showIcon title={error} />}
      <div className="space-y-4">
        {(["overall", "speed", "technician", "outcome"] as const).map((key) => (
          <div key={key}>
            <Text strong={key === "overall"} className="block">
              {m.aspects[key]}
              {key === "overall" && <Text type="danger"> *</Text>}
            </Text>
            <Rate
              value={scores[key] ?? 0}
              onChange={(value) => setScores({ ...scores, [key]: value })}
            />
          </div>
        ))}
        <div>
          <Text className="block">{m.comment}</Text>
          <Input.TextArea
            rows={3}
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
        <Button
          type="primary"
          block
          loading={busy}
          onClick={() => void submit()}
        >
          {m.public.submit}
        </Button>
      </div>
    </Card>
  );
}
