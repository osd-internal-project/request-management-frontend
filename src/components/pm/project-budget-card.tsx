"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import type { BudgetLineView, ProjectBudgetView } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.budget;

interface Row {
  key: number;
  category: BudgetLineView["category"];
  code: string;
  description: string;
  quantity: number | null;
  unit: string;
  unitCost: number | null;
}

let nextKey = 1;
const toRow = (line: BudgetLineView): Row => ({
  key: nextKey++,
  category: line.category,
  code: line.code ?? "",
  description: line.description,
  quantity: line.quantity,
  unit: line.unit ?? "",
  unitCost: line.unitCost,
});

/**
 * CD-179 — the reference budget: drawn from the baseline as a draft, the
 * manager fills in what is missing and confirms it; confirmed, it shows
 * the totals by category and the margin, and changes only through a change
 * request.
 */
export function ProjectBudgetCard({
  projectId,
  view,
}: {
  readonly projectId: string;
  readonly view: ProjectBudgetView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const current = view.current;
  const editing = Boolean(view.canEdit && current?.status === "draft");
  const [rows, setRows] = useState<Row[]>(
    () => current?.lines.map(toRow) ?? [],
  );
  const [note, setNote] = useState(current?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, init: RequestInit, done: string) {
    setBusy(true);
    setError(null);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(done);
    router.refresh();
    return true;
  }

  const save = () =>
    call(
      `projects/${projectId}/budget/draft`,
      {
        method: "PUT",
        body: JSON.stringify({
          lines: rows.map((row) => ({
            category: row.category,
            code: row.code || null,
            description: row.description,
            quantity: row.quantity ?? 0,
            unit: row.unit || null,
            unit_cost: row.unitCost,
          })),
          note,
        }),
      },
      m.saved,
    );

  const patch = (key: number, change: Partial<Row>) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const draftTotal = rows.reduce(
    (sum, row) => sum + (row.quantity ?? 0) * (row.unitCost ?? 0),
    0,
  );

  return (
    <Card
      size="small"
      title={
        <span>
          {m.title}
          {current && (
            <>
              {" · "}
              {m.version(current.versionNo)}{" "}
              <Tag color={m.statusColor[current.status]}>
                {m.status[current.status]}
              </Tag>
            </>
          )}
        </span>
      }
      extra={
        editing ? (
          <Space wrap>
            <Button size="small" loading={busy} onClick={() => void save()}>
              {m.save}
            </Button>
            <Popconfirm
              title={m.lockConfirm}
              onConfirm={() =>
                void call(
                  `projects/${projectId}/budget/lock`,
                  { method: "POST" },
                  m.locked,
                )
              }
            >
              <Button
                size="small"
                type="primary"
                disabled={busy || view.awaitingIntake}
              >
                {m.lock}
              </Button>
            </Popconfirm>
          </Space>
        ) : !current && view.canEdit ? (
          <Button
            size="small"
            type="primary"
            loading={busy}
            onClick={() =>
              void call(
                `projects/${projectId}/budget`,
                { method: "POST" },
                m.started,
              )
            }
          >
            {m.start}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {/* CD-176 — the first budget waits until the work is received */}
      {view.awaitingIntake && (
        <Alert className="mb-2" type="info" showIcon title={m.awaitingIntake} />
      )}
      {editing && current && current.lockProblems.length > 0 && (
        <Alert
          className="mb-2"
          type="warning"
          showIcon
          title={current.lockProblems.join(" · ")}
        />
      )}

      {!current ? (
        <Text type="secondary">{m.none}</Text>
      ) : editing ? (
        <>
          <Table<Row>
            size="small"
            rowKey="key"
            pagination={false}
            scroll={{ x: 900 }}
            dataSource={rows}
            columns={[
              {
                title: m.columns.category,
                key: "category",
                width: 140,
                render: (_: unknown, row) => (
                  <Select
                    size="small"
                    className="w-full"
                    value={row.category}
                    onChange={(category: Row["category"]) =>
                      patch(row.key, { category })
                    }
                    options={Object.entries(m.categories).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                ),
              },
              {
                title: m.columns.code,
                key: "code",
                width: 110,
                render: (_: unknown, row) => (
                  <Input
                    size="small"
                    value={row.code}
                    onChange={(event) =>
                      patch(row.key, { code: event.target.value })
                    }
                  />
                ),
              },
              {
                title: m.columns.description,
                key: "description",
                render: (_: unknown, row) => (
                  <Input
                    size="small"
                    value={row.description}
                    onChange={(event) =>
                      patch(row.key, { description: event.target.value })
                    }
                  />
                ),
              },
              {
                title: m.columns.quantity,
                key: "quantity",
                width: 90,
                render: (_: unknown, row) => (
                  <InputNumber
                    size="small"
                    className="w-full!"
                    min={0}
                    value={row.quantity}
                    onChange={(value) =>
                      patch(row.key, {
                        quantity: value === null ? null : Number(value),
                      })
                    }
                  />
                ),
              },
              {
                title: m.columns.unit,
                key: "unit",
                width: 90,
                render: (_: unknown, row) => (
                  <Input
                    size="small"
                    value={row.unit}
                    onChange={(event) =>
                      patch(row.key, { unit: event.target.value })
                    }
                  />
                ),
              },
              {
                title: m.columns.unitCost,
                key: "unitCost",
                width: 130,
                render: (_: unknown, row) => (
                  <InputNumber
                    size="small"
                    className="w-full!"
                    min={0}
                    status={row.unitCost === null ? "warning" : undefined}
                    placeholder={m.noCost}
                    value={row.unitCost}
                    onChange={(value) =>
                      patch(row.key, {
                        unitCost: value === null ? null : Number(value),
                      })
                    }
                  />
                ),
              },
              {
                title: m.columns.amount,
                key: "amount",
                width: 120,
                align: "right",
                render: (_: unknown, row) =>
                  formatAmount((row.quantity ?? 0) * (row.unitCost ?? 0)),
              },
              {
                title: "",
                key: "remove",
                width: 40,
                render: (_: unknown, row) => (
                  <Button
                    size="small"
                    type="text"
                    danger
                    aria-label={m.remove}
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setRows(rows.filter((item) => item.key !== row.key))
                    }
                  />
                ),
              },
            ]}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <Button
              size="small"
              onClick={() =>
                setRows([
                  ...rows,
                  {
                    key: nextKey++,
                    category: "other",
                    code: "",
                    description: "",
                    quantity: 1,
                    unit: "",
                    unitCost: null,
                  },
                ])
              }
            >
              {m.addLine}
            </Button>
            <Text strong>
              {m.total}: {formatAmount(draftTotal)}
            </Text>
          </div>
          <label className="mt-2 block text-xs">
            {m.note}
            <Input.TextArea
              rows={2}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          <Table<BudgetLineView>
            size="small"
            rowKey={(_, index) => String(index)}
            pagination={false}
            scroll={{ x: 760 }}
            dataSource={current.lines}
            columns={[
              {
                title: m.columns.category,
                key: "category",
                width: 120,
                render: (_: unknown, line) => m.categories[line.category],
              },
              { title: m.columns.code, dataIndex: "code", width: 110 },
              { title: m.columns.description, dataIndex: "description" },
              {
                title: m.columns.quantity,
                key: "quantity",
                width: 110,
                align: "right",
                render: (_: unknown, line) =>
                  `${line.quantity.toLocaleString("th-TH")} ${line.unit ?? ""}`,
              },
              {
                title: m.columns.unitCost,
                key: "unitCost",
                width: 120,
                align: "right",
                render: (_: unknown, line) => formatAmount(line.unitCost),
              },
              {
                title: m.columns.amount,
                key: "amount",
                width: 120,
                align: "right",
                render: (_: unknown, line) => formatAmount(line.amount),
              },
            ]}
          />
          <div className="mt-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
            {Object.entries(current.byCategory).map(([category, amount]) => (
              <span key={category}>
                {m.categories[category]}: {formatAmount(amount)}
              </span>
            ))}
            <span className="font-medium">
              {m.total}: {formatAmount(current.total)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
            <span>
              {m.contractValue}: {formatAmount(current.contractValue)}
            </span>
            {current.margin !== null && (
              <Text type={current.margin < 0 ? "danger" : "success"}>
                {m.margin}: {formatAmount(current.margin)}
                {current.marginPct !== null && ` (${current.marginPct}%)`}
              </Text>
            )}
          </div>
          {current.lockedAt && (
            <Text type="secondary" className="mt-1 block text-xs">
              {m.lockedBy(
                current.lockedByName ?? "—",
                dayjs(current.lockedAt).format("D MMM YYYY HH:mm"),
              )}{" "}
              · {m.changeOnly}
            </Text>
          )}
        </>
      )}

      <Text type="secondary" className="mt-2 block text-xs">
        {m.actual}
      </Text>
    </Card>
  );
}
