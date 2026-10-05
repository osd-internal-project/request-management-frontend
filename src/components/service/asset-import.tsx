"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Space, Table, Tag, Upload } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type { AssetImportResult } from "@/lib/api/service";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.service.assets.importer;
const H = m.headers;
const CHUNK = 500;

interface ParsedRow {
  row_no: number;
  customer_code?: string;
  kind?: string;
  name?: string;
  product_code?: string;
  model?: string;
  serial_no?: string;
  location?: string;
  version?: string;
  installed_on?: string;
  note?: string;
}

const HEADER_MAP: Record<string, keyof Omit<ParsedRow, "row_no">> = {
  [H.customerCode]: "customer_code",
  [H.kind]: "kind",
  [H.name]: "name",
  [H.productCode]: "product_code",
  [H.model]: "model",
  [H.serial]: "serial_no",
  [H.location]: "location",
  [H.version]: "version",
  [H.installedOn]: "installed_on",
  [H.note]: "note",
};

const KIND_MAP: Record<string, string> = {
  [messages.service.assets.kinds.equipment]: "equipment",
  [messages.service.assets.kinds.software]: "software",
};

const actionColor: Record<string, string> = {
  create: "success",
  skip_duplicate: "default",
  error: "error",
};

/** A date cell as YYYY-MM-DD, whether Excel kept it as a date or as text. */
function dayOf(value: unknown, text: string): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const thai = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (thai) {
    const year =
      Number(thai[3]) > 2400 ? Number(thai[3]) - 543 : Number(thai[3]);
    return `${year}-${thai[2].padStart(2, "0")}-${thai[1].padStart(2, "0")}`;
  }
  return trimmed;
}

/**
 * CD-236 — the installed base that predates the system, from a file: parsed
 * here, checked by the server (dry run), then written row by row.
 */
export function AssetImport() {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<AssetImportResult | null>(null);
  const [committed, setCommitted] = useState<AssetImportResult | null>(null);
  const importId = useRef("");

  async function downloadTemplate() {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("assets");
    sheet.addRow([
      H.customerCode,
      H.kind,
      H.name,
      H.productCode,
      H.model,
      H.serial,
      H.location,
      H.version,
      H.installedOn,
      H.note,
    ]);
    sheet.getRow(1).font = { bold: true };
    for (const col of [1, 6, 9]) sheet.getColumn(col).numFmt = "@";
    sheet.addRow([
      "CUS-OSD-000001",
      messages.service.assets.kinds.equipment,
      "สวิตช์ 24 พอร์ต",
      "SW-24",
      "C9200-24T",
      "FOC1234X0YZ",
      "อาคาร A ชั้น 2 ห้อง server",
      "",
      "2024-03-15",
      "",
    ]);
    sheet.columns.forEach((column) => {
      column.width = 20;
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

  async function send(mode: "dry_run" | "commit", data: ParsedRow[]) {
    const results: AssetImportResult["results"] = [];
    for (let i = 0; i < data.length; i += CHUNK) {
      const response = await appApi<AssetImportResult>(
        "service-assets/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            import_id: importId.current,
            rows: data.slice(i, i + CHUNK),
          }),
        },
      );
      if (!response.ok) {
        return { result: null, failure: response.message, results };
      }
      results.push(...response.data.results);
    }
    const summary = {
      create: results.filter((r) => r.action === "create").length,
      skip: results.filter((r) => r.action === "skip_duplicate").length,
      error: results.filter((r) => r.action === "error").length,
    };
    return {
      result: { importId: importId.current, mode, summary, results },
      failure: null,
      results,
    };
  }

  async function parseFile(file: File) {
    importId.current = crypto.randomUUID();
    setBusy(true);
    setError(null);
    setChecked(null);
    setCommitted(null);
    setRows(null);
    setFileName(file.name);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount < 2) {
        setError(m.emptyFile);
        return;
      }
      const fieldOf = new Map<number, keyof Omit<ParsedRow, "row_no">>();
      sheet.getRow(1).eachCell((cell, col) => {
        const field = HEADER_MAP[cell.text.trim()];
        if (field) fieldOf.set(col, field);
      });
      if (![...fieldOf.values()].includes("name")) {
        setError(m.missingName);
        return;
      }
      const parsed: ParsedRow[] = [];
      sheet.eachRow((row, rowNo) => {
        if (rowNo === 1) return;
        const record: ParsedRow = { row_no: rowNo };
        fieldOf.forEach((field, col) => {
          const cell = row.getCell(col);
          const text =
            field === "installed_on"
              ? dayOf(cell.value, cell.text ?? "")
              : cell.text?.trim();
          if (text) record[field] = text;
        });
        if (Object.keys(record).length === 1) return;
        if (record.kind) record.kind = KIND_MAP[record.kind] ?? record.kind;
        parsed.push(record);
      });
      if (!parsed.length) {
        setError(m.emptyFile);
        return;
      }
      setRows(parsed);
      const { result, failure } = await send("dry_run", parsed);
      if (failure) setError(failure);
      setChecked(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!rows) return;
    setBusy(true);
    setError(null);
    const { result, failure } = await send("commit", rows);
    setBusy(false);
    if (failure) setError(failure);
    setCommitted(result);
  }

  const shown = committed ?? checked;

  return (
    <Card
      title={m.title}
      extra={
        <Link href={ROUTES.serviceAssets} className="text-xs">
          {messages.service.assets.title}
        </Link>
      }
    >
      <Text type="secondary" className="mb-3 block text-xs">
        {m.hint}
      </Text>
      <Space wrap className="mb-3">
        <Button onClick={() => void downloadTemplate()}>{m.template}</Button>
        <Upload
          accept=".xlsx"
          showUploadList={false}
          beforeUpload={(file) => {
            void parseFile(file);
            return false;
          }}
        >
          <Button type="primary" loading={busy && !checked}>
            {busy && !checked ? m.checking : m.pick}
          </Button>
        </Upload>
        {fileName && <Text type="secondary">{fileName}</Text>}
        {checked && !committed && checked.summary.create > 0 && (
          <Button
            type="primary"
            danger
            loading={busy}
            onClick={() => void commit()}
          >
            {busy ? m.importing : m.confirm}
          </Button>
        )}
      </Space>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {shown && (
        <Alert
          className="mb-2"
          type={committed ? "success" : "info"}
          showIcon
          title={committed ? m.done : null}
          description={m.summary(
            shown.summary.create,
            shown.summary.skip,
            shown.summary.error,
          )}
        />
      )}
      {shown && (
        <Table
          rowKey="rowNo"
          size="small"
          dataSource={shown.results}
          pagination={shown.results.length > 50 ? { pageSize: 50 } : false}
          columns={[
            { title: m.row, dataIndex: "rowNo", width: 70 },
            {
              title: m.result,
              dataIndex: "action",
              width: 120,
              render: (value: string) => (
                <Tag color={actionColor[value]}>{m.actions[value]}</Tag>
              ),
            },
            {
              title: m.reasons,
              dataIndex: "reasons",
              render: (value: string[]) => value.join(" · "),
            },
          ]}
        />
      )}
    </Card>
  );
}
