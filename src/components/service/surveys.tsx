"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Popconfirm,
  Rate,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type {
  ServiceSurvey,
  SurveyFigureRow,
  SurveyFigures,
} from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.service.assets.surveys;
const STATE_COLOR: Record<string, string> = {
  answered: "green",
  expired: "default",
  open: "blue",
};

/** CD-248 — on a finished job's panel: its survey, and a fresh link to copy. */
export function SurveyCard({
  workOrderId,
  canManage,
}: {
  readonly workOrderId: string;
  readonly canManage: boolean;
}) {
  const { message } = App.useApp();
  const [reload, setReload] = useState(0);
  const [survey, setSurvey] = useState<ServiceSurvey | null | undefined>(
    undefined,
  );
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<ServiceSurvey | null>(
      `service-surveys/by-work-order/${workOrderId}`,
    ).then((result) => {
      if (live) setSurvey(result.ok ? result.data : null);
    });
    return () => {
      live = false;
    };
  }, [workOrderId, reload]);

  async function reissue() {
    setError(null);
    const result = await appApi<{ link: string }>(
      `service-surveys/by-work-order/${workOrderId}/link`,
      { method: "POST" },
    );
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setLink(result.data.link);
    setReload((n) => n + 1);
  }

  if (survey === undefined) return null;
  return (
    <Card size="small" className="mt-3" title={m.card}>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {survey ? (
        <div className="space-y-1">
          <Space wrap>
            <Tag color={STATE_COLOR[survey.state]}>
              {m.states[survey.state]}
            </Tag>
            {survey.sentAt ? (
              <Text type="secondary" className="text-xs">
                {m.sentTo(
                  m.via[survey.sentVia] ?? survey.sentVia,
                  survey.sentTo ?? "",
                )}
              </Text>
            ) : (
              survey.state === "open" && (
                <Text type="warning" className="text-xs">
                  {m.notSent}
                </Text>
              )
            )}
          </Space>
          {survey.overall !== null && (
            <div className="text-sm">
              {(["overall", "speed", "technician", "outcome"] as const).map(
                (key) =>
                  survey[key] !== null && (
                    <div key={key}>
                      <Text className="mr-2 inline-block w-36 text-xs">
                        {m.aspects[key]}
                      </Text>
                      <Rate disabled value={survey[key] ?? 0} />
                    </div>
                  ),
              )}
              {survey.comment && (
                <Text className="block text-sm">“{survey.comment}”</Text>
              )}
            </div>
          )}
        </div>
      ) : (
        <Text type="secondary" className="block text-xs">
          {m.notYet}
        </Text>
      )}
      {canManage && survey?.state !== "answered" && (
        <div className="mt-2">
          {link ? (
            <Space.Compact className="w-full">
              <Input readOnly value={link} />
              <Button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => message.success(m.copied))
                }
              >
                {m.copy}
              </Button>
            </Space.Compact>
          ) : (
            <Popconfirm title={m.newLinkHint} onConfirm={() => void reissue()}>
              <Button size="small">{m.newLink}</Button>
            </Popconfirm>
          )}
        </div>
      )}
    </Card>
  );
}

const figureColumns = (
  keyTitle: string,
  keyOf: (row: SurveyFigureRow) => string,
) => [
  { title: keyTitle, render: (_: unknown, row: SurveyFigureRow) => keyOf(row) },
  { title: m.columns.sent, dataIndex: "sent", width: 70 },
  { title: m.columns.answered, dataIndex: "answered", width: 70 },
  {
    title: m.columns.rate,
    width: 90,
    render: (_: unknown, row: SurveyFigureRow) =>
      row.responsePct === null ? "—" : `${row.responsePct}%`,
  },
  ...(["overall", "speed", "technician", "outcome"] as const).map((key) => ({
    title: m.columns[key],
    width: 80,
    render: (_: unknown, row: SurveyFigureRow) => row[key] ?? "—",
  })),
  {
    title: m.columns.low,
    width: 60,
    render: (_: unknown, row: SurveyFigureRow) =>
      row.low ? <Tag color="red">{row.low}</Tag> : 0,
  },
];

/** CD-248 — the service team's satisfaction figures and the latest answers. */
export function Surveys() {
  const [data, setData] = useState<SurveyFigures | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<SurveyFigures>("service-surveys").then((result) => {
      if (!live) return;
      if (result.ok) setData(result.data);
      else setError(result.message);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <Card title={m.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {data && (
        <div className="space-y-4">
          <Text strong className="block">
            {m.figures}:{" "}
            {m.total(
              data.total.sent,
              data.total.answered,
              data.total.responsePct,
            )}
            {data.total.overall !== null &&
              ` · ${m.aspects.overall} ${data.total.overall}/5`}
          </Text>
          <Text strong className="block text-sm">
            {m.byMonth}
          </Text>
          <Table<SurveyFigureRow>
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={data.byMonth}
            scroll={{ x: 700 }}
            columns={figureColumns("", (row) => row.key)}
          />
          <Text strong className="block text-sm">
            {m.byTechnician}
          </Text>
          <Table<SurveyFigureRow>
            size="small"
            rowKey="key"
            pagination={false}
            dataSource={data.byTechnician}
            scroll={{ x: 700 }}
            columns={figureColumns("", (row) => row.name ?? row.key)}
          />
          <Text strong className="block text-sm">
            {m.answers}
          </Text>
          <Table<ServiceSurvey>
            size="small"
            rowKey="id"
            pagination={data.answers.length > 20 ? { pageSize: 20 } : false}
            dataSource={data.answers}
            scroll={{ x: 800 }}
            columns={[
              {
                title: m.columns.request,
                width: 150,
                render: (_: unknown, row) => (
                  <Link href={ROUTES.requestDetail(row.requestId)}>
                    {row.requestNo ?? row.requestId.slice(0, 8)}
                  </Link>
                ),
              },
              { title: "", dataIndex: "subject" },
              {
                title: m.columns.technician,
                width: 150,
                render: (_: unknown, row) => row.technicianName ?? "",
              },
              {
                title: m.columns.overall,
                width: 150,
                render: (_: unknown, row) => (
                  <Rate disabled value={row.overall ?? 0} />
                ),
              },
              {
                title: "",
                render: (_: unknown, row) => row.comment ?? "",
              },
              {
                title: m.columns.answeredAt,
                width: 110,
                render: (_: unknown, row) =>
                  row.answeredAt
                    ? dayjs(row.answeredAt).format("DD/MM/YYYY")
                    : "",
              },
            ]}
          />
        </div>
      )}
    </Card>
  );
}
