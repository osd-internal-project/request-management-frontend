"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Skeleton, Statistic, Table, Tabs } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.care;
const r = m.results;

const KINDS = [
  "ai_resolved",
  "case_opened",
  "handed_over",
  "no_answer",
  "live",
] as const;

interface Tally {
  total: number;
  ai_resolved: number;
  case_opened: number;
  handed_over: number;
  no_answer: number;
  live: number;
  aiClosedPct: number | null;
}

interface Results {
  months: (Tally & { month: string })[];
  channels: (Tally & { channel: string })[];
  total: Tally;
}

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

const counts = KINDS.map((kind) => ({
  title: r.kinds[kind],
  dataIndex: kind,
  align: "right" as const,
}));

const rate = {
  title: r.rate,
  dataIndex: "aiClosedPct",
  align: "right" as const,
  render: pct,
};

/** CD-288 — how AI CARE conversations ended: closed by AI, case, a person. */
export function CareResults() {
  const [data, setData] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<Results>("care/results").then((res) => {
      if (!live) return;
      if (res.ok) setData(res.data);
      else setError(res.message);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Card title={r.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {r.hint}
      </Text>
      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : !data ? (
        <Skeleton active />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-6">
            <Statistic title={r.rate} value={pct(data.total.aiClosedPct)} />
            <Statistic title={r.total} value={data.total.total} />
            {(["ai_resolved", "case_opened", "handed_over"] as const).map(
              (kind) => (
                <Statistic
                  key={kind}
                  title={r.kinds[kind]}
                  value={data.total[kind]}
                />
              ),
            )}
          </div>
          <Tabs
            size="small"
            items={[
              {
                key: "month",
                label: r.byMonth,
                children: (
                  <Table
                    rowKey="month"
                    size="small"
                    pagination={false}
                    scroll={{ x: 720 }}
                    dataSource={[...data.months].reverse()}
                    columns={[
                      {
                        title: r.month,
                        dataIndex: "month",
                        render: (v: string) =>
                          new Date(`${v}-01T00:00:00`).toLocaleDateString(
                            "th-TH",
                            { month: "short", year: "2-digit" },
                          ),
                      },
                      { title: r.total, dataIndex: "total", align: "right" },
                      rate,
                      ...counts,
                    ]}
                  />
                ),
              },
              {
                key: "channel",
                label: r.byChannel,
                children: (
                  <Table
                    rowKey="channel"
                    size="small"
                    pagination={false}
                    scroll={{ x: 720 }}
                    dataSource={data.channels}
                    columns={[
                      {
                        title: r.channel,
                        dataIndex: "channel",
                        render: (v: string) => m.channels[v] ?? v,
                      },
                      { title: r.total, dataIndex: "total", align: "right" },
                      rate,
                      ...counts,
                    ]}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </Card>
  );
}
