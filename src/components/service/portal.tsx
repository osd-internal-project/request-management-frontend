"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Result,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { messages } from "@/lib/messages";
import { API, call } from "./portal-api";
import { PortalArticles } from "./portal-articles";

const m = messages.service.assets.portal.public;
const fmt = (value: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "—";

/** CD-249 — the invite link: exchange it for a session, then go in. */
export function PortalEnter({ invite }: { readonly invite: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void call("session", {
      method: "POST",
      body: JSON.stringify({ invite }),
    }).then((result) => {
      if (result.ok) router.replace("/f/portal");
      else setError(result.status === 429 ? m.tooMany : m.invalid);
    });
  }, [invite, router]);
  return error ? (
    <Result status="warning" title={error} />
  ) : (
    <div className="py-16 text-center">
      <Spin />
      <Text className="mt-2 block">{m.entering}</Text>
    </div>
  );
}

interface Me {
  contactName: string;
  customer: { code: string; name: string } | null;
  providerName: string | null;
  canRaise: boolean;
}
interface Job {
  id: string;
  requestNo: string | null;
  subject: string;
  workKind: string;
  severity: string | null;
  status: string;
  asset: string | null;
  openedOn: string | null;
  doneOn: string | null;
}
interface Asset {
  id: string;
  name: string;
  model: string | null;
  serialNo: string | null;
  location: string | null;
  installedOn: string | null;
}
interface Cover {
  id: string;
  kind: string;
  title: string;
  startOn: string | null;
  endOn: string | null;
  active: boolean;
  assets: number;
}
interface Report {
  id: string;
  reportNo: string;
  periodFrom: string | null;
  periodTo: string | null;
  title: string;
}

const STATUS_COLOR: Record<string, string> = {
  received: "blue",
  working: "orange",
  waiting: "gold",
  done: "green",
};

/** CD-249 — the customer's portal: their jobs, equipment, covers, reports. */
export function PortalHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [covers, setCovers] = useState<Cover[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [raising, setRaising] = useState<{
    assetId: string | null;
    subject: string;
    detail: string;
    severity: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([
      call<Me>("me"),
      call<Job[]>("jobs"),
      call<Asset[]>("assets"),
      call<Cover[]>("covers"),
      call<Report[]>("reports"),
    ]).then(([a, b, c, d, e]) => {
      if (!live) return;
      if (!a.ok) {
        setError(a.status === 401 ? m.expired : a.message);
        return;
      }
      setMe(a.data);
      if (b.ok) setJobs(b.data);
      if (c.ok) setAssets(c.data);
      if (d.ok) setCovers(d.data);
      if (e.ok) setReports(e.data);
    });
    return () => {
      live = false;
    };
  }, [reload]);

  async function raise() {
    if (!raising) return;
    setBusy(true);
    const result = await call<{ requestNo: string | null }>("jobs", {
      method: "POST",
      body: JSON.stringify({
        subject: raising.subject,
        severity: raising.severity,
        ...(raising.detail.trim() ? { detail: raising.detail } : {}),
        ...(raising.assetId ? { asset_id: raising.assetId } : {}),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRaising(null);
    setNotice(m.raised(result.data.requestNo ?? "—"));
    setReload((n) => n + 1);
  }

  if (error && !me) return <Result status="warning" title={error} />;
  if (!me) {
    return (
      <div className="py-16 text-center">
        <Spin />
      </div>
    );
  }

  return (
    <Card
      title={m.title}
      extra={
        <Button
          size="small"
          onClick={() =>
            void call("logout", { method: "POST" }).then(() => setMe(null))
          }
        >
          {m.logout}
        </Button>
      }
    >
      <Text className="block">
        {m.hello(me.contactName, me.customer?.name ?? "")}
      </Text>
      {me.providerName && (
        <Text type="secondary" className="mb-3 block text-xs">
          {m.provider(me.providerName)}
        </Text>
      )}
      {notice && (
        <Alert className="mb-2" type="success" showIcon title={notice} />
      )}
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      <Tabs
        items={[
          {
            key: "jobs",
            label: m.tabs.jobs,
            children: (
              <>
                {me.canRaise ? (
                  <Button
                    type="primary"
                    className="mb-3"
                    onClick={() =>
                      setRaising({
                        assetId: null,
                        subject: "",
                        detail: "",
                        severity: "medium",
                      })
                    }
                  >
                    {m.raise}
                  </Button>
                ) : (
                  <Text type="secondary" className="mb-3 block text-xs">
                    {m.raiseOff}
                  </Text>
                )}
                <Table<Job>
                  size="small"
                  rowKey="id"
                  dataSource={jobs}
                  pagination={jobs.length > 20 ? { pageSize: 20 } : false}
                  locale={{ emptyText: m.empty }}
                  scroll={{ x: 700 }}
                  columns={[
                    { title: m.columns.no, dataIndex: "requestNo", width: 150 },
                    {
                      title: m.columns.subject,
                      render: (_: unknown, row) => (
                        <span>
                          {row.subject}
                          <Text type="secondary" className="block text-xs">
                            {m.kinds[row.workKind] ?? row.workKind}
                          </Text>
                        </span>
                      ),
                    },
                    {
                      title: m.columns.asset,
                      width: 180,
                      render: (_: unknown, row) => row.asset ?? "",
                    },
                    {
                      title: m.columns.status,
                      width: 140,
                      render: (_: unknown, row) => (
                        <Tag color={STATUS_COLOR[row.status]}>
                          {m.status[row.status] ?? row.status}
                        </Tag>
                      ),
                    },
                    {
                      title: m.columns.opened,
                      width: 110,
                      render: (_: unknown, row) => fmt(row.openedOn),
                    },
                    {
                      title: m.columns.done,
                      width: 110,
                      render: (_: unknown, row) => fmt(row.doneOn),
                    },
                  ]}
                />
              </>
            ),
          },
          {
            key: "assets",
            label: m.tabs.assets,
            children: (
              <Table<Asset>
                size="small"
                rowKey="id"
                dataSource={assets}
                pagination={assets.length > 30 ? { pageSize: 30 } : false}
                locale={{ emptyText: m.empty }}
                scroll={{ x: 700 }}
                columns={[
                  { title: m.columns.name, dataIndex: "name" },
                  { title: m.columns.model, dataIndex: "model", width: 150 },
                  {
                    title: m.columns.serial,
                    dataIndex: "serialNo",
                    width: 150,
                  },
                  {
                    title: m.columns.location,
                    dataIndex: "location",
                    width: 160,
                  },
                  {
                    title: m.columns.installed,
                    width: 110,
                    render: (_: unknown, row) => fmt(row.installedOn),
                  },
                ]}
              />
            ),
          },
          {
            key: "covers",
            label: m.tabs.covers,
            children: (
              <Table<Cover>
                size="small"
                rowKey="id"
                dataSource={covers}
                pagination={false}
                locale={{ emptyText: m.empty }}
                scroll={{ x: 600 }}
                columns={[
                  {
                    title: m.columns.cover,
                    render: (_: unknown, row) => (
                      <span>
                        {row.title}
                        <Text type="secondary" className="block text-xs">
                          {m.coverKinds[row.kind] ?? row.kind}
                        </Text>
                      </span>
                    ),
                  },
                  {
                    title: m.columns.period,
                    width: 200,
                    render: (_: unknown, row) =>
                      `${fmt(row.startOn)} – ${fmt(row.endOn)}`,
                  },
                  { title: m.columns.assets, dataIndex: "assets", width: 90 },
                  {
                    title: "",
                    width: 110,
                    render: (_: unknown, row) => (
                      <Tag color={row.active ? "green" : undefined}>
                        {row.active ? m.active : m.ended}
                      </Tag>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: "reports",
            label: m.tabs.reports,
            children: (
              <Table<Report>
                size="small"
                rowKey="id"
                dataSource={reports}
                pagination={false}
                locale={{ emptyText: m.empty }}
                columns={[
                  {
                    title: m.columns.report,
                    render: (_: unknown, row) => (
                      <a
                        href={`${API}/reports/${row.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.reportNo} · {row.title}
                      </a>
                    ),
                  },
                  {
                    title: m.columns.period,
                    width: 220,
                    render: (_: unknown, row) =>
                      `${fmt(row.periodFrom)} – ${fmt(row.periodTo)}`,
                  },
                ]}
              />
            ),
          },
          {
            key: "articles",
            label: m.tabs.articles,
            children: (
              <PortalArticles
                onRaise={
                  me.canRaise
                    ? (subject) =>
                        setRaising({
                          assetId: null,
                          subject,
                          detail: "",
                          severity: "medium",
                        })
                    : null
                }
              />
            ),
          },
        ]}
      />

      <Modal
        open={raising !== null}
        title={m.raiseTitle}
        onCancel={() => setRaising(null)}
        okText={m.send}
        cancelText={m.cancel}
        confirmLoading={busy}
        okButtonProps={{ disabled: !raising?.subject.trim() }}
        onOk={() => void raise()}
        destroyOnHidden
      >
        {raising && (
          <Space direction="vertical" className="w-full">
            <label className="block text-xs">
              {m.asset}
              <Select
                className="w-full"
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                value={raising.assetId ?? undefined}
                options={assets.map((row) => ({
                  value: row.id,
                  label: [row.name, row.serialNo, row.location]
                    .filter(Boolean)
                    .join(" · "),
                }))}
                onChange={(value?: string) =>
                  setRaising({ ...raising, assetId: value ?? null })
                }
              />
            </label>
            <label className="block text-xs">
              {m.subject}
              <Input
                maxLength={255}
                value={raising.subject}
                onChange={(event) =>
                  setRaising({ ...raising, subject: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.detail}
              <Input.TextArea
                rows={3}
                maxLength={4000}
                value={raising.detail}
                onChange={(event) =>
                  setRaising({ ...raising, detail: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.severity}
              <Select
                className="w-full"
                value={raising.severity}
                options={Object.entries(m.severities).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(value: string) =>
                  setRaising({ ...raising, severity: value })
                }
              />
            </label>
          </Space>
        )}
      </Modal>
    </Card>
  );
}
