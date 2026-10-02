"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  CostLine,
  LaborLine,
  PartnerQuote,
  SolutionDetail,
} from "@/lib/api/presales";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { PartnerPicker } from "./partner-picker";

const mc = messages.presales.cost;

const money = (value: number) =>
  value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

interface QuoteDraft {
  id: string | null;
  vendorName: string;
  vendorCode: string;
  quoteNo: string;
  quoteDate: string;
  validUntil: string;
  requestId: string;
  /** BOQ line index → unit price; absent = not quoted. */
  prices: Record<number, number | null>;
}

/**
 * CD-136 — ประมาณต้นทุน of the version shown: each BOQ line costed by its
 * newest partner quote, else its reference cost; labour from the rate table.
 * Editable on a draft or locked version, frozen once superseded. Complete +
 * approved = ready for Pricing (handoff 3).
 */
export function CostCard({ solution }: { solution: SolutionDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const version = solution.version;
  const cost = solution.cost;
  const base = `presales/solutions/${solution.id}/versions/${version.versionNo}`;
  const editable = solution.can_manage && version.status !== "superseded";
  // CD-207 — HR's levels × work types; rates only for hr.rate.read.
  const options = solution.cost_settings.labor_options;
  const ratesVisible = solution.cost_settings.labor_rates_visible;
  const pickable = options.levels.length > 0 && options.work_types.length > 0;
  // A line saved before HR (a role only) is matched to the level named alike.
  const levelOf = (line: LaborLine) =>
    line.levelCode ??
    options.levels.find((level) => level.name === line.role)?.code;
  const workTypeOf = (line: LaborLine) =>
    line.workTypeCode ??
    (line.levelCode
      ? undefined
      : options.work_types.find((type) => type.code === "GENERAL")?.code);
  const boq = version.boq;
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);

  const [labor, setLabor] = useState<LaborLine[]>(cost?.labor ?? []);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<QuoteDraft | null>(null);
  const [asking, setAsking] = useState(false);
  const [askLines, setAskLines] = useState<number[]>([]);

  async function run(path: string, init: RequestInit, done?: string) {
    setBusy(true);
    const result = await appApi<{ request_id?: string }>(path, init);
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return null;
    }
    if (done) void message.success(done);
    router.refresh();
    return result.data;
  }

  const saveLabor = () =>
    run(
      `${base}/labor`,
      {
        method: "PUT",
        body: JSON.stringify({
          lines: labor.map((line) => ({
            level_code: levelOf(line) ?? "",
            work_type_code: workTypeOf(line) ?? "",
            mandays: line.mandays,
            note: line.note,
          })),
        }),
      },
      mc.saved,
    );

  function openQuote(row: PartnerQuote | null) {
    setQuote(
      row
        ? {
            id: row.id,
            vendorName: row.vendorName,
            vendorCode: row.vendorCode,
            quoteNo: row.quoteNo,
            quoteDate: row.quoteDate?.slice(0, 10) ?? "",
            validUntil: row.validUntil?.slice(0, 10) ?? "",
            requestId: row.requestId ?? "",
            prices: Object.fromEntries(
              row.lines.map((line) => [line.lineIndex, line.unitPrice]),
            ),
          }
        : {
            id: null,
            vendorName: "",
            vendorCode: "",
            quoteNo: "",
            quoteDate: new Date().toISOString().slice(0, 10),
            validUntil: "",
            requestId: "",
            prices: {},
          },
    );
  }

  async function saveQuote() {
    if (!quote) return;
    const ok = await run(
      quote.id ? `${base}/quotes/${quote.id}` : `${base}/quotes`,
      {
        method: quote.id ? "PUT" : "POST",
        body: JSON.stringify({
          vendor_name: quote.vendorName,
          vendor_code: quote.vendorCode,
          quote_no: quote.quoteNo,
          quote_date: quote.quoteDate || undefined,
          valid_until: quote.validUntil || undefined,
          request_id: quote.requestId || undefined,
          lines: Object.entries(quote.prices)
            .filter(([, price]) => price !== null && price !== undefined)
            .map(([index, price]) => ({
              line_index: Number(index),
              unit_price: price,
            })),
        }),
      },
    );
    if (ok) setQuote(null);
  }

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file || !uploadFor) return;
    const body = new FormData();
    body.append("file", file);
    await run(`${base}/quotes/${uploadFor}/file`, { method: "POST", body });
    if (fileInput.current) fileInput.current.value = "";
    setUploadFor(null);
  }

  async function askVendors() {
    const data = await run(`${base}/vendor-quote-request`, {
      method: "POST",
      body: JSON.stringify({ line_indexes: askLines }),
    });
    if (data?.request_id) router.push(ROUTES.requestDetail(data.request_id));
  }

  return (
    <Card
      size="small"
      title={mc.title}
      extra={
        cost ? (
          <Space>
            <Text strong>
              {mc.total}{" "}
              {cost.total === null ? mc.hiddenAmount : money(cost.total)}
            </Text>
            {cost.complete ? (
              <Tag color="green">{mc.complete}</Tag>
            ) : (
              <Tag color="orange">{mc.incomplete(cost.missing_cost)}</Tag>
            )}
            {cost.expired_quotes > 0 && (
              <Tag color="red">{mc.expired(cost.expired_quotes)}</Tag>
            )}
          </Space>
        ) : null
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {mc.hint}
      </Text>
      {version.status === "superseded" && (
        <Alert type="info" showIcon title={mc.frozen} className="mb-2" />
      )}

      {cost && (
        <>
          <Space className="mb-2" wrap>
            <Text>
              {mc.materials}: {money(cost.materials_total)}
            </Text>
            <Text>
              {mc.labor}:{" "}
              {cost.labor_total === null
                ? mc.hiddenAmount
                : money(cost.labor_total)}
            </Text>
          </Space>
          <Table<CostLine>
            size="small"
            rowKey="index"
            pagination={false}
            dataSource={cost.lines}
            columns={[
              { title: "#", width: 40, render: (_, row) => row.index + 1 },
              {
                title: mc.line,
                key: "line",
                render: (_: unknown, row) => (
                  <>
                    {row.productCode && (
                      <Text type="secondary" className="mr-1 text-xs">
                        {row.productCode}
                      </Text>
                    )}
                    {row.name}
                  </>
                ),
              },
              { title: mc.quantity, dataIndex: "quantity", width: 80 },
              {
                title: mc.unitCost,
                dataIndex: "unitCost",
                width: 130,
                render: (value: number | null) =>
                  value === null ? (
                    <Tag color="orange">{mc.noCost}</Tag>
                  ) : (
                    money(value)
                  ),
              },
              {
                title: mc.source,
                key: "source",
                render: (_: unknown, row) => (
                  <>
                    {row.source === "quote"
                      ? mc.fromQuote(row.vendorName ?? "")
                      : row.source === "reference"
                        ? mc.fromReference
                        : "—"}
                    {row.expired && (
                      <Tag color="red" className="ml-1">
                        {mc.expiredTag}
                      </Tag>
                    )}
                  </>
                ),
              },
              {
                title: mc.lineTotal,
                key: "total",
                width: 130,
                render: (_: unknown, row) =>
                  row.unitCost === null
                    ? "—"
                    : money(row.unitCost * row.quantity),
              },
            ]}
          />
        </>
      )}

      <div className="mt-4">
        <Text strong className="block">
          {mc.laborTitle}
        </Text>
        {editable && !pickable && (
          <Alert type="warning" showIcon title={mc.noRates} className="my-1" />
        )}
        {cost?.labor_hidden && (
          <Text type="secondary" className="my-1 block text-xs">
            {mc.ratesHidden}
          </Text>
        )}
        <Table<LaborLine & { index: number }>
          size="small"
          rowKey="index"
          pagination={false}
          // A fixed role column: an empty select at "100%" of an auto column
          // collapsed to nothing, then widened on pick and shifted the inputs.
          scroll={{ x: 600 }}
          dataSource={(editable ? labor : (cost?.labor ?? [])).map(
            (line, index) => ({ ...line, index }),
          )}
          columns={[
            {
              title: mc.role,
              dataIndex: "role",
              width: 320,
              render: (role: string, row) =>
                editable ? (
                  // CD-207 — the level and the work type; HR has the rate.
                  <Space.Compact style={{ width: "100%" }}>
                    <Select
                      value={levelOf(row)}
                      placeholder={mc.level}
                      style={{ width: "55%" }}
                      options={options.levels.map((level) => ({
                        value: level.code,
                        label: `${level.code} ${level.name}`,
                      }))}
                      onChange={(value: string) =>
                        setLabor((rows) =>
                          rows.map((line, at) =>
                            at === row.index
                              ? {
                                  ...line,
                                  levelCode: value,
                                  workTypeCode: workTypeOf(line),
                                }
                              : line,
                          ),
                        )
                      }
                    />
                    <Select
                      value={workTypeOf(row)}
                      placeholder={mc.workType}
                      style={{ width: "45%" }}
                      options={options.work_types.map((type) => ({
                        value: type.code,
                        label: type.name,
                      }))}
                      onChange={(value: string) =>
                        setLabor((rows) =>
                          rows.map((line, at) =>
                            at === row.index
                              ? {
                                  ...line,
                                  levelCode: levelOf(line),
                                  workTypeCode: value,
                                }
                              : line,
                          ),
                        )
                      }
                    />
                  </Space.Compact>
                ) : (
                  role
                ),
            },
            {
              title: mc.mandays,
              dataIndex: "mandays",
              width: 110,
              render: (mandays: number, row) =>
                editable ? (
                  <InputNumber
                    value={mandays}
                    min={0}
                    onChange={(value) =>
                      setLabor((rows) =>
                        rows.map((line, at) =>
                          at === row.index
                            ? { ...line, mandays: Number(value) || 0 }
                            : line,
                        ),
                      )
                    }
                  />
                ) : (
                  mandays
                ),
            },
            // CD-207 — the rate only for hr.rate.read; HR sets it on save.
            ...(ratesVisible
              ? [
                  {
                    title: mc.rate,
                    dataIndex: "rate",
                    width: 120,
                    render: (rate: number | null) =>
                      rate === null ? "—" : money(rate),
                  },
                ]
              : []),
            {
              title: mc.note,
              dataIndex: "note",
              render: (note: string, row) =>
                editable ? (
                  <Input
                    value={note}
                    maxLength={1000}
                    onChange={(event) =>
                      setLabor((rows) =>
                        rows.map((line, at) =>
                          at === row.index
                            ? { ...line, note: event.target.value }
                            : line,
                        ),
                      )
                    }
                  />
                ) : (
                  note || "—"
                ),
            },
            ...(editable
              ? [
                  {
                    key: "remove",
                    width: 48,
                    render: (_: unknown, row: { index: number }) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          setLabor((rows) =>
                            rows.filter((_, at) => at !== row.index),
                          )
                        }
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
        {editable && (
          <Space className="mt-2">
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              disabled={!pickable}
              onClick={() =>
                setLabor((rows) => [
                  ...rows,
                  { role: "", mandays: 1, rate: null, note: "" },
                ])
              }
            >
              {mc.addLabor}
            </Button>
            <Button
              size="small"
              loading={busy}
              onClick={() => void saveLabor()}
            >
              {mc.saveLabor}
            </Button>
          </Space>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Text strong>
          {mc.quotes} · {solution.partner_quotes.length}
        </Text>
        {editable && (
          <Space>
            {solution.cost_settings.vendor_quote_configured && (
              <Button
                size="small"
                disabled={!boq.length}
                onClick={() => {
                  setAskLines([]);
                  setAsking(true);
                }}
              >
                {mc.requestQuote}
              </Button>
            )}
            <Button
              size="small"
              icon={<PlusOutlined />}
              disabled={!boq.length}
              onClick={() => openQuote(null)}
            >
              {mc.addQuote}
            </Button>
          </Space>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        onChange={(event) => void upload(event.target.files)}
      />
      {solution.partner_quotes.length ? (
        <Table<PartnerQuote>
          size="small"
          rowKey="id"
          pagination={false}
          className="mt-1"
          dataSource={solution.partner_quotes}
          columns={[
            {
              title: mc.vendorName,
              dataIndex: "vendorName",
              render: (name: string, row) => (
                <>
                  {name}
                  {row.vendorCode && (
                    <Text type="secondary" className="block text-xs">
                      {row.vendorCode}
                    </Text>
                  )}
                </>
              ),
            },
            {
              title: mc.quoteNo,
              key: "no",
              render: (_: unknown, row) => (
                <>
                  {row.quoteNo || "—"}
                  <Text type="secondary" className="block text-xs">
                    {row.quoteDate?.slice(0, 10) ?? "—"} →{" "}
                    {row.validUntil?.slice(0, 10) ?? "—"}
                  </Text>
                </>
              ),
            },
            {
              title: mc.priceLines,
              key: "lines",
              render: (_: unknown, row) =>
                row.lines
                  .map(
                    (line) => `#${line.lineIndex + 1} ${money(line.unitPrice)}`,
                  )
                  .join(" · "),
            },
            {
              key: "file",
              width: 160,
              render: (_: unknown, row) =>
                row.fileName ? (
                  <a
                    href={`/api/app/presales/solutions/${solution.id}/quotes/${row.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {row.fileName}
                  </a>
                ) : editable ? (
                  <Button
                    size="small"
                    onClick={() => {
                      setUploadFor(row.id);
                      fileInput.current?.click();
                    }}
                  >
                    {mc.attach}
                  </Button>
                ) : (
                  "—"
                ),
            },
            ...(editable
              ? [
                  {
                    key: "actions",
                    width: 90,
                    render: (_: unknown, row: PartnerQuote) => (
                      <Space size={0}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => openQuote(row)}
                        >
                          {mc.editQuote}
                        </Button>
                        <Popconfirm
                          title={mc.removeQuote}
                          onConfirm={() =>
                            void run(`${base}/quotes/${row.id}`, {
                              method: "DELETE",
                            })
                          }
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]
              : []),
          ]}
        />
      ) : (
        <Text type="secondary" className="block">
          {mc.quotesEmpty}
        </Text>
      )}

      <Modal
        open={quote !== null}
        title={quote?.id ? mc.editQuote : mc.addQuote}
        okText={mc.save}
        width={720}
        okButtonProps={{
          loading: busy,
          disabled:
            !quote?.vendorName.trim() ||
            !Object.values(quote.prices).some(
              (price) => price !== null && price !== undefined,
            ),
        }}
        onOk={() => void saveQuote()}
        onCancel={() => setQuote(null)}
        destroyOnHidden
      >
        {quote && (
          <Space orientation="vertical" className="w-full">
            <div className="grid gap-2 md:grid-cols-2">
              {/* CD-142 — the vendor comes from SAP's supplier list. */}
              <PartnerPicker
                code={quote.vendorCode}
                name={quote.vendorName}
                onChange={(vendor) =>
                  setQuote({
                    ...quote,
                    vendorCode: vendor.code,
                    vendorName: vendor.name,
                  })
                }
              />
              <Input
                value={quote.quoteNo}
                maxLength={100}
                placeholder={mc.quoteNo}
                onChange={(event) =>
                  setQuote({ ...quote, quoteNo: event.target.value })
                }
              />
              <Space>
                <Input
                  type="date"
                  value={quote.quoteDate}
                  aria-label={mc.quoteDate}
                  onChange={(event) =>
                    setQuote({ ...quote, quoteDate: event.target.value })
                  }
                />
                <Input
                  type="date"
                  value={quote.validUntil}
                  aria-label={mc.validUntil}
                  onChange={(event) =>
                    setQuote({ ...quote, validUntil: event.target.value })
                  }
                />
              </Space>
            </div>
            <Text className="text-xs">{mc.priceLines}</Text>
            {boq.map((line, index) => (
              <Space.Compact key={index} className="w-full">
                <Input
                  value={`${index + 1}. ${line.productCode} ${line.name} × ${line.quantity}`}
                  disabled
                />
                <InputNumber
                  value={quote.prices[index] ?? undefined}
                  min={0}
                  style={{ width: 160 }}
                  onChange={(value) =>
                    setQuote({
                      ...quote,
                      prices: {
                        ...quote.prices,
                        [index]:
                          value === null || value === undefined
                            ? null
                            : Number(value),
                      },
                    })
                  }
                />
              </Space.Compact>
            ))}
          </Space>
        )}
      </Modal>

      <Modal
        open={asking}
        title={mc.requestQuote}
        okText={mc.requestOk}
        okButtonProps={{ loading: busy, disabled: !askLines.length }}
        onOk={() => void askVendors()}
        onCancel={() => setAsking(false)}
        destroyOnHidden
      >
        <Text type="secondary" className="mb-2 block text-xs">
          {mc.requestHint}
        </Text>
        <Checkbox.Group
          value={askLines}
          onChange={(values) => setAskLines(values as number[])}
          className="w-full"
        >
          <Space orientation="vertical">
            {boq.map((line, index) => (
              <Checkbox key={index} value={index}>
                {index + 1}. {line.productCode} {line.name} × {line.quantity}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Modal>
    </Card>
  );
}
