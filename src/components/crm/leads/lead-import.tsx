"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Space, Table, Tag, Upload } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.sales.leads.importer;
const H = m.headers;

const CHUNK = 200;

interface ParsedRow {
  row_no: number;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  source_code?: string;
  note?: string;
}

interface RowResult {
  rowNo: number;
  action: "create" | "skip_duplicate" | "error";
  reasons: string[];
  leadId?: string;
}

interface ImportResult {
  importId: string;
  mode: "dry_run" | "commit";
  summary: { create: number; skip: number; error: number };
  results: RowResult[];
}

const HEADER_MAP: Record<string, keyof Omit<ParsedRow, "row_no">> = {
  [H.name]: "name",
  [H.contactName]: "contact_name",
  [H.phone]: "phone",
  [H.email]: "email",
  [H.source]: "source_code",
  [H.note]: "note",
  name: "name",
  contact_name: "contact_name",
  phone: "phone",
  email: "email",
  source_code: "source_code",
  note: "note",
};

/** Excel กินเลข 0 นำหน้าเบอร์โทร — เบอร์ 9 หลักล้วนตัวเลขคือเหตุการณ์นั้น. */
function repairPhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.trim();
  if (/^\d{9}$/.test(digits)) return `0${digits}`;
  return digits;
}

/**
 * นำเข้า Lead จาก Excel — สูตรเดียวกับหน้า import ลูกค้า (CM-10): เบราว์เซอร์
 * parse, backend คุมการตรวจ; dry-run เต็มรายแถวก่อนยืนยัน.
 */
export function LeadImport() {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<ImportResult | null>(null);
  const [committed, setCommitted] = useState<ImportResult | null>(null);

  const importId = useMemo(() => crypto.randomUUID(), []);

  async function downloadTemplate() {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("leads");

    sheet.addRow([H.name, H.contactName, H.phone, H.email, H.source, H.note]);
    sheet.getRow(1).font = { bold: true };
    sheet.getColumn(3).numFmt = "@"; // โทรศัพท์เป็น text — กันเลข 0 หน้าหาย
    sheet.addRow([
      "บริษัท ตัวอย่าง จำกัด",
      "สมหญิง ตัวอย่าง",
      "0812345678",
      "somying@example.co.th",
      "งานอีเวนต์ 2569",
      "สนใจระบบโทรศัพท์",
    ]);
    sheet.columns.forEach((column) => {
      column.width = 22;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = m.templateFile;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function parseFile(file: File): Promise<void> {
    setParsing(true);
    setError(null);
    setDryRun(null);
    setCommitted(null);
    setRows(null);
    setFileName(file.name);

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount < 2) {
        setError(messages.customers.importer.emptyFile);
        return;
      }

      const fieldOf = new Map<number, keyof Omit<ParsedRow, "row_no">>();
      sheet.getRow(1).eachCell((cell, col) => {
        const field = HEADER_MAP[cell.text.trim()];
        if (field) fieldOf.set(col, field);
      });
      if (![...fieldOf.values()].includes("name")) {
        setError(m.missingNameColumn);
        return;
      }

      const parsed: ParsedRow[] = [];
      sheet.eachRow((row, rowNo) => {
        if (rowNo === 1) return;
        const record: ParsedRow = { row_no: rowNo, name: "" };
        fieldOf.forEach((field, col) => {
          const text = row.getCell(col).text?.trim();
          if (text) (record as unknown as Record<string, unknown>)[field] = text;
        });
        if (!record.name && !record.phone && !record.email) return;
        record.phone = repairPhone(record.phone);
        parsed.push(record);
      });

      if (!parsed.length) {
        setError(messages.customers.importer.emptyFile);
        return;
      }
      setRows(parsed);
      await check(parsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setParsing(false);
    }
  }

  async function send(
    mode: "dry_run" | "commit",
    data: ParsedRow[],
  ): Promise<ImportResult | null> {
    const all: RowResult[] = [];
    for (let i = 0; i < data.length; i += CHUNK) {
      const result = await appApi<ImportResult>("leads/import", {
        method: "POST",
        body: JSON.stringify({
          mode,
          import_id: importId,
          rows: data.slice(i, i + CHUNK),
        }),
      });
      if (!result.ok) {
        setError(result.message);
        return null;
      }
      all.push(...result.data.results);
    }
    return {
      importId,
      mode,
      results: all,
      summary: {
        create: all.filter((r) => r.action === "create").length,
        skip: all.filter((r) => r.action === "skip_duplicate").length,
        error: all.filter((r) => r.action === "error").length,
      },
    };
  }

  async function check(data: ParsedRow[]) {
    setChecking(true);
    setError(null);
    const result = await send("dry_run", data);
    setChecking(false);
    if (result) setDryRun(result);
  }

  async function commit() {
    if (!rows) return;
    setCommitting(true);
    setError(null);
    const result = await send("commit", rows);
    setCommitting(false);
    if (result) setCommitted(result);
  }

  const report = committed ?? dryRun;
  const rowOf = new Map((rows ?? []).map((row) => [row.row_no, row] as const));
  const mc = messages.customers.importer;

  return (
    <div className="space-y-4">
      <Card size="small">
        <Space direction="vertical" size={8} className="w-full">
          <Space wrap>
            <Button onClick={() => void downloadTemplate()}>
              {mc.downloadTemplate}
            </Button>
            <Text type="secondary" className="text-xs">
              {m.templateHint}
            </Text>
          </Space>
          <Upload.Dragger
            accept=".xlsx"
            maxCount={1}
            showUploadList={false}
            disabled={parsing || committing}
            beforeUpload={(file) => {
              void parseFile(file);
              return false;
            }}
          >
            <p className="px-4 py-2">{parsing ? mc.parsing : mc.uploadHint}</p>
          </Upload.Dragger>
          {fileName && !parsing && (
            <Text type="secondary" className="text-xs">
              {fileName}
              {rows ? ` — ${mc.parsedRows(String(rows.length))}` : ""}
            </Text>
          )}
        </Space>
      </Card>

      {error && <Alert type="error" showIcon title={error} />}
      {checking && <Alert type="info" showIcon title={mc.checking} />}

      {committed && (
        <Alert
          type="success"
          showIcon
          title={m.done(String(committed.summary.create))}
          action={
            <Link href={ROUTES.leads}>
              <Button size="small">{m.backToList}</Button>
            </Link>
          }
        />
      )}

      {report && (
        <Card size="small">
          <Space direction="vertical" size={10} className="w-full">
            <Space wrap>
              <Tag color="green">
                {`${committed ? mc.summary.created : mc.summary.create} · ${report.summary.create}`}
              </Tag>
              <Tag>{`${mc.summary.skip} · ${report.summary.skip}`}</Tag>
              <Tag color={report.summary.error ? "red" : undefined}>
                {`${mc.summary.error} · ${report.summary.error}`}
              </Tag>
              {!committed && dryRun && (
                <Button
                  type="primary"
                  loading={committing}
                  disabled={dryRun.summary.create === 0}
                  onClick={() => void commit()}
                >
                  {committing ? mc.importing : mc.confirm}
                </Button>
              )}
            </Space>

            <Table<RowResult>
              size="small"
              rowKey="rowNo"
              dataSource={[...report.results]}
              pagination={{ pageSize: 50, hideOnSinglePage: true }}
              columns={[
                { title: m.columns.row, dataIndex: "rowNo", width: 70 },
                {
                  title: m.columns.name,
                  dataIndex: "rowNo",
                  render: (rowNo: number) => rowOf.get(rowNo)?.name ?? "—",
                },
                {
                  title: m.columns.contact,
                  dataIndex: "rowNo",
                  render: (rowNo: number) => {
                    const row = rowOf.get(rowNo);
                    return (
                      [row?.phone, row?.email].filter(Boolean).join(" · ") ||
                      "—"
                    );
                  },
                },
                {
                  title: m.columns.action,
                  dataIndex: "action",
                  width: 170,
                  render: (action: RowResult["action"]) => (
                    <Tag
                      color={
                        action === "create"
                          ? "green"
                          : action === "error"
                            ? "red"
                            : undefined
                      }
                    >
                      {m.actionLabel[action] ?? action}
                    </Tag>
                  ),
                },
                {
                  title: m.columns.detail,
                  dataIndex: "reasons",
                  render: (reasons: string[], row) =>
                    row.action === "error"
                      ? reasons
                          .map((reason) => m.reasonLabels[reason] ?? reason)
                          .join(" · ")
                      : reasons.join(" · ") || "—",
                },
              ]}
            />
          </Space>
        </Card>
      )}
    </div>
  );
}
