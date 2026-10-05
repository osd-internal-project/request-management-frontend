"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { PlusOutlined, WarningOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { DeliveryForm } from "./delivery-form";
import {
  READINESS_COLOR,
  thaiDate,
  type Delivery,
  type ProjectDeliveryView,
} from "./delivery-types";

const m = messages.delivery;

/** CD-250 — a project's delivery plan: its trips, and the BOQ they cover. */
export function ProjectDeliveryCard({ projectId }: { projectId: string }) {
  const { message } = App.useApp();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    version: number;
    view: ProjectDeliveryView | null;
    error: string | null;
  } | null>(null);
  const [form, setForm] = useState<{ editing: Delivery | null } | null>(null);
  const [cancelling, setCancelling] = useState<Delivery | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let live = true;
    void appApi<ProjectDeliveryView>(`delivery/projects/${projectId}`).then(
      (result) => {
        if (!live) return;
        setLoaded(
          result.ok
            ? { version, view: result.data, error: null }
            : { version, view: null, error: result.message },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [projectId, version]);

  const view = loaded?.view ?? null;
  const reload = () => setVersion((value) => value + 1);

  const cancel = async () => {
    if (!cancelling) return;
    const result = await appApi<Delivery>(
      `delivery/deliveries/${cancelling.id}/cancel`,
      { method: "POST", body: JSON.stringify({ reason: reason.trim() }) },
    );
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    setCancelling(null);
    setReason("");
    reload();
  };

  const unplanned = view?.boq.filter((b) => b.remaining > 0) ?? [];
  const over = view?.boq.filter((b) => b.over) ?? [];
  const milestoneTitle = (id: string) => {
    const x = view?.milestones.find((ms) => ms.id === id);
    return x ? `${x.seq}. ${x.title}` : "—";
  };

  return (
    <Card
      size="small"
      title={m.cardTitle}
      extra={
        view?.canEdit ? (
          <Button
            size="small"
            icon={<PlusOutlined />}
            disabled={!view.milestones.length || !view.boq.length}
            onClick={() => setForm({ editing: null })}
          >
            {m.add}
          </Button>
        ) : null
      }
    >
      {loaded?.error ? (
        <Alert type="error" showIcon title={loaded.error} />
      ) : !view ? (
        <Skeleton active />
      ) : (
        <div className="space-y-3">
          {!view.boq.length ? (
            <Alert type="info" showIcon title={m.noBoq} />
          ) : null}
          {over.length ? (
            <Alert
              type="error"
              showIcon
              title={m.overBoq}
              description={over.map((b) => b.label).join(", ")}
            />
          ) : null}
          <Table<Delivery>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={view.deliveries}
            locale={{ emptyText: m.empty }}
            scroll={{ x: 820 }}
            expandable={{
              expandedRowRender: (row) => (
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={row.lines}
                  columns={[
                    { title: m.boqLine, dataIndex: "label" },
                    {
                      title: m.quantity,
                      key: "q",
                      align: "right",
                      render: (_, line) =>
                        `${line.quantity}${line.unit ? ` ${line.unit}` : ""}`,
                    },
                    {
                      title: m.readiness,
                      key: "r",
                      render: (_, line) => (
                        <Space orientation="vertical" size={0}>
                          <Tag color={READINESS_COLOR[line.readiness]}>
                            {m.readinessLabels[line.readiness]}
                            {line.readiness === "partial" && line.readyQty
                              ? ` ${line.readyQty}/${line.quantity}`
                              : ""}
                          </Tag>
                          {line.expectedOn ? (
                            <Text type="secondary" className="text-xs">
                              {m.expectedOn} {thaiDate(line.expectedOn)}
                            </Text>
                          ) : null}
                        </Space>
                      ),
                    },
                    {
                      title: m.fallbackPlan,
                      dataIndex: "fallbackPlan",
                      render: (value: string) => value || "—",
                    },
                  ]}
                />
              ),
            }}
            columns={[
              { title: "#", dataIndex: "seq", width: 50 },
              {
                title: m.plannedOn,
                key: "date",
                width: 130,
                render: (_, row) => (
                  <Space size={4}>
                    {thaiDate(row.plannedOn)}
                    {row.warning ? (
                      <Tooltip
                        title={m.warnTip.replace("{d}", String(view.warnDays))}
                      >
                        <WarningOutlined className="text-orange-500" />
                      </Tooltip>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: m.milestone,
                key: "ms",
                render: (_, row) => milestoneTitle(row.milestoneId),
              },
              { title: m.location, dataIndex: "location" },
              {
                title: m.receiver,
                key: "rcv",
                render: (_, row) =>
                  [row.receiverName, row.receiverPhone]
                    .filter(Boolean)
                    .join(" · ") || "—",
              },
              {
                title: m.readiness,
                key: "ready",
                render: (_, row) =>
                  row.status === "planned" ? (
                    <Tag color={READINESS_COLOR[row.readiness]}>
                      {m.readinessLabels[row.readiness]}
                    </Tag>
                  ) : (
                    <Tag>{m.statuses[row.status]}</Tag>
                  ),
              },
              ...(view.canEdit
                ? [
                    {
                      key: "edit",
                      width: 150,
                      align: "right" as const,
                      render: (_: unknown, row: Delivery) =>
                        row.status === "planned" ? (
                          <Space>
                            <Button
                              size="small"
                              onClick={() => setForm({ editing: row })}
                            >
                              {m.edit}
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={() => setCancelling(row)}
                            >
                              {m.cancel}
                            </Button>
                          </Space>
                        ) : null,
                    },
                  ]
                : []),
            ]}
          />
          {unplanned.length ? (
            <Text type="secondary" className="block text-xs">
              {m.unplanned}:{" "}
              {unplanned
                .map(
                  (b) =>
                    `${b.label} ${m.remaining} ${b.remaining}${b.unit ? ` ${b.unit}` : ""}`,
                )
                .join(" · ")}
            </Text>
          ) : view.boq.length ? (
            <Text type="secondary" className="block text-xs">
              {m.allPlanned}
            </Text>
          ) : null}
        </div>
      )}
      {view && form ? (
        <DeliveryForm
          open
          view={view}
          editing={form.editing}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      ) : null}
      <Modal
        open={!!cancelling}
        title={m.cancelTitle}
        okText={m.cancel}
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={() => void cancel()}
        onCancel={() => setCancelling(null)}
      >
        <Input.TextArea
          rows={3}
          maxLength={1000}
          placeholder={m.cancelReason}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </Card>
  );
}
