"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Space, Table, Tag, Upload } from "antd";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { ImportResult, ImportRowResult } from "@/lib/api/types";

const m = messages.customers.importer;
const H = m.headers;

/**
 * Rows go to the backend in slices this size. 100 rows with Thai addresses
 * stay far under the backend's 2 MB JSON limit (and its 500-row DTO cap).
 */
const CHUNK = 100;

interface ParsedRow {
  row_no: number;
  type?: string;
  name_th: string;
  name_en?: string;
  tax_id?: string;
  branch_code?: string;
  branch_name?: string;
  line1?: string;
  line2?: string;
  sub_district?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

/** หัวคอลัมน์ไทยในไฟล์ต้นแบบ → field. English keys accepted as a fallback. */
const HEADER_MAP: Record<string, keyof Omit<ParsedRow, "row_no">> = {
  [H.type]: "type",
  [H.nameTh]: "name_th",
  [H.nameEn]: "name_en",
  [H.taxId]: "tax_id",
  [H.branchCode]: "branch_code",
  [H.branchName]: "branch_name",
  [H.line1]: "line1",
  [H.line2]: "line2",
  [H.subDistrict]: "sub_district",
  [H.district]: "district",
  [H.province]: "province",
  [H.postalCode]: "postal_code",
  [H.contactName]: "contact_name",
  [H.contactPhone]: "contact_phone",
  [H.contactEmail]: "contact_email",
  type: "type",
  name_th: "name_th",
  name_en: "name_en",
  tax_id: "tax_id",
  branch_code: "branch_code",
  branch_name: "branch_name",
  line1: "line1",
  line2: "line2",
  sub_district: "sub_district",
  district: "district",
  province: "province",
  postal_code: "postal_code",
  contact_name: "contact_name",
  contact_phone: "contact_phone",
  contact_email: "contact_email",
};

const TYPE_MAP: Record<string, string> = {
  [messages.customers.type.corporate]: "corporate",
  [messages.customers.type.individual]: "individual",
  [messages.customers.type.government]: "government",
  corporate: "corporate",
  individual: "individual",
  government: "government",
};

/**
 * Excel turns a text-looking digit column numeric and eats leading zeros —
 * เลขภาษีไทยขึ้นต้นด้วย 0 บ่อยมาก. A 12-digit tax id or a short branch code is
 * almost certainly that accident, so pad; the backend checksum still gates.
 */
function repairDigits(
  value: string | undefined,
  width: number,
): string | undefined {
  if (!value) return undefined;
  const digits = value.trim();
  if (!/^\d+$/.test(digits) || digits.length >= width) return digits;
  return digits.padStart(width, "0");
}

/**
 * CM-10 — นำเข้าลูกค้าเดิมจาก Excel. The browser parses the file (exceljs,
 * loaded only on this page); the backend re-validates every row and is the
 * control. Flow: template → upload → dry-run report → confirm → commit.
 */
export function CustomerImport() {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<ImportResult | null>(null);
  const [committed, setCommitted] = useState<ImportResult | null>(null);

  // One id per file, not per page visit — a second file uploaded on the same
  // page is a separate import on the audit trail.
  const importId = useRef<string>("");

  async function downloadTemplate() {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("customers");

    const headers = [
      H.type,
      H.nameTh,
      H.nameEn,
      H.taxId,
      H.branchCode,
      H.branchName,
      H.line1,
      H.line2,
      H.subDistrict,
      H.district,
      H.province,
      H.postalCode,
      H.contactName,
      H.contactPhone,
      H.contactEmail,
    ];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    // เลขภาษี/รหัสสาขา/รหัสไปรษณีย์/โทรศัพท์ ต้องเป็น text — เลข 0 นำหน้าหายคือ
    // อุบัติเหตุอันดับหนึ่งของไฟล์ Excel
    for (const col of [4, 5, 12, 14]) sheet.getColumn(col).numFmt = "@";
    sheet.addRow([
      messages.customers.type.corporate,
      "บริษัท ตัวอย่าง จำกัด",
      "Example Co., Ltd.",
      "0105536001234",
      "00000",
      "สำนักงานใหญ่",
      "เลขที่ 1 ถนนตัวอย่าง",
      "",
      "คลองตัน",
      "คลองเตย",
      "กรุงเทพมหานคร",
      "10110",
      "สมชาย ตัวอย่าง",
      "0812345678",
      "somchai@example.co.th",
    ]);
    sheet.columns.forEach((column) => {
      column.width = 18;
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
    importId.current = crypto.randomUUID();
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
        setError(m.emptyFile);
        return;
      }

      const fieldOf = new Map<number, keyof Omit<ParsedRow, "row_no">>();
      sheet.getRow(1).eachCell((cell, col) => {
        const field = HEADER_MAP[cell.text.trim()];
        if (field) fieldOf.set(col, field);
      });
      if (![...fieldOf.values()].includes("name_th")) {
        setError(m.missingNameColumn);
        return;
      }

      const parsed: ParsedRow[] = [];
      sheet.eachRow((row, rowNo) => {
        if (rowNo === 1) return;
        const record: ParsedRow = { row_no: rowNo, name_th: "" };
        fieldOf.forEach((field, col) => {
          const text = row.getCell(col).text?.trim();
          if (text)
            (record as unknown as Record<string, unknown>)[field] = text;
        });
        if (
          !Object.keys(record).some(
            (key) => key !== "row_no" && key !== "name_th",
          ) &&
          !record.name_th
        ) {
          return; // ทั้งแถวว่าง — ข้ามเงียบ ๆ
        }
        record.type = record.type
          ? (TYPE_MAP[record.type] ?? record.type)
          : undefined;
        record.tax_id = repairDigits(record.tax_id, 13);
        record.branch_code = repairDigits(record.branch_code, 5);
        record.postal_code = repairDigits(record.postal_code, 5);
        parsed.push(record);
      });

      if (!parsed.length) {
        setError(m.emptyFile);
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

  /**
   * Every chunk's rows, and the failure that stopped it if one did. Chunks
   * already committed are real customers — dropping their report on a later
   * failure is what made "just run it again" look safe when it is not.
   */
  async function send(
    mode: "dry_run" | "commit",
    data: ParsedRow[],
  ): Promise<{ result: ImportResult | null; failure: string | null }> {
    const all: ImportRowResult[] = [];
    let failure: string | null = null;
    for (let i = 0; i < data.length; i += CHUNK) {
      const response = await appApi<ImportResult>("customers/import", {
        method: "POST",
        body: JSON.stringify({
          mode,
          import_id: importId.current,
          rows: data.slice(i, i + CHUNK),
        }),
      });
      if (!response.ok) {
        failure = response.message;
        break;
      }
      all.push(...response.data.results);
    }
    if (!all.length) return { result: null, failure };
    return {
      failure,
      result: {
        importId: importId.current,
        mode,
        results: all,
        summary: {
          create: all.filter((r) => r.action === "create").length,
          skip: all.filter((r) => r.action === "skip_duplicate").length,
          error: all.filter((r) => r.action === "error").length,
        },
      },
    };
  }

  async function check(data: ParsedRow[]) {
    setChecking(true);
    setError(null);
    const { result, failure } = await send("dry_run", data);
    setChecking(false);
    if (failure) setError(failure);
    else if (result) setDryRun(result);
  }

  async function commit() {
    if (!rows) return;
    setCommitting(true);
    setError(null);
    const { result, failure } = await send("commit", rows);
    setCommitting(false);
    if (result) setCommitted(result);
    if (failure) {
      setError(
        result
          ? m.partialCommit(
              String(result.results.length),
              String(rows.length),
              failure,
            )
          : failure,
      );
    }
  }

  const report = committed ?? dryRun;
  const nameOf = new Map((rows ?? []).map((row) => [row.row_no, row] as const));

  return (
    <div className="space-y-4">
      <Card size="small">
        <Space direction="vertical" size={8} className="w-full">
          <Space wrap>
            <Button onClick={() => void downloadTemplate()}>
              {m.downloadTemplate}
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
            <p className="px-4 py-2">{parsing ? m.parsing : m.uploadHint}</p>
          </Upload.Dragger>
          {fileName && !parsing && (
            <Text type="secondary" className="text-xs">
              {fileName}
              {rows ? ` — ${m.parsedRows(String(rows.length))}` : ""}
            </Text>
          )}
        </Space>
      </Card>

      {error && <Alert type="error" showIcon title={error} />}
      {checking && <Alert type="info" showIcon title={m.checking} />}

      {committed && !error && (
        <Alert
          type="success"
          showIcon
          title={m.done(String(committed.summary.create))}
          action={
            <Link href={ROUTES.customers}>
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
                {`${committed ? m.summary.created : m.summary.create} · ${report.summary.create}`}
              </Tag>
              <Tag>{`${m.summary.skip} · ${report.summary.skip}`}</Tag>
              <Tag color={report.summary.error ? "red" : undefined}>
                {`${m.summary.error} · ${report.summary.error}`}
              </Tag>
              {!committed && dryRun && (
                <Button
                  type="primary"
                  loading={committing}
                  disabled={dryRun.summary.create === 0}
                  onClick={() => void commit()}
                >
                  {committing ? m.importing : m.confirm}
                </Button>
              )}
            </Space>

            <Table<ImportRowResult>
              size="small"
              rowKey="rowNo"
              dataSource={[...report.results]}
              pagination={{ pageSize: 50, hideOnSinglePage: true }}
              columns={[
                { title: m.columns.row, dataIndex: "rowNo", width: 70 },
                {
                  title: m.columns.name,
                  dataIndex: "rowNo",
                  render: (rowNo: number) => nameOf.get(rowNo)?.name_th ?? "—",
                },
                {
                  title: m.columns.branch,
                  dataIndex: "rowNo",
                  width: 140,
                  render: (rowNo: number) => {
                    const row = nameOf.get(rowNo);
                    if (!row?.branch_code && !row?.branch_name) return "—";
                    return [row.branch_code, row.branch_name]
                      .filter(Boolean)
                      .join(" · ");
                  },
                },
                {
                  title: m.columns.action,
                  dataIndex: "action",
                  width: 150,
                  render: (action: ImportRowResult["action"]) => (
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
                  render: (reasons: string[], row) => {
                    if (row.action === "error") {
                      return reasons
                        .map((reason) => m.reasonLabels[reason] ?? reason)
                        .join(" · ");
                    }
                    const parts: string[] = [];
                    if (row.customerCode) parts.push(row.customerCode);
                    if (row.duplicateOfRow !== undefined) {
                      parts.push(m.duplicateOfRow(String(row.duplicateOfRow)));
                    }
                    if (row.headOfficeCode) {
                      parts.push(m.headOfficeNote(row.headOfficeCode));
                    }
                    if (row.headOfficeRow !== undefined) {
                      parts.push(
                        m.headOfficeRowNote(String(row.headOfficeRow)),
                      );
                    }
                    const warnings: string[] = [];
                    if (row.possibleDuplicateOf) {
                      warnings.push(
                        m.possibleDuplicate(row.possibleDuplicateOf),
                      );
                    }
                    if (row.possibleDuplicateOfRow !== undefined) {
                      warnings.push(
                        m.possibleDuplicateRow(
                          String(row.possibleDuplicateOfRow),
                        ),
                      );
                    }
                    return (
                      <>
                        {parts.join(" · ") || (warnings.length ? "" : "—")}
                        {warnings.map((warning) => (
                          <Text
                            key={warning}
                            type="warning"
                            className="block text-xs"
                          >
                            {warning}
                          </Text>
                        ))}
                      </>
                    );
                  },
                },
              ]}
            />
          </Space>
        </Card>
      )}
    </div>
  );
}
