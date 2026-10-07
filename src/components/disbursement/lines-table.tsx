"use client";

import { Button, Input, InputNumber, Table } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { DisbursementLine } from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";
import { baht } from "./format";

const m = messages.disbursement.lines;

export interface EditableLine {
  description: string;
  cost_center: string;
  amount: number | null;
  note: string;
}

/** Screens 2–7's expense table: read-only, or editable for clearing (screen 6). */
export function LinesTable({
  lines,
  editable,
  onChange,
}: {
  readonly lines: readonly DisbursementLine[] | readonly EditableLine[];
  readonly editable?: boolean;
  readonly onChange?: (lines: EditableLine[]) => void;
}) {
  if (!editable) {
    const rows = lines as readonly DisbursementLine[];
    const total = rows.reduce((sum, line) => sum + Number(line.amount), 0);
    return (
      <Table<DisbursementLine>
        rowKey="lineNo"
        size="small"
        pagination={false}
        dataSource={[...rows]}
        scroll={{ x: 640 }}
        columns={[
          { title: m.no, dataIndex: "lineNo", width: 48 },
          { title: m.description, dataIndex: "description" },
          { title: m.costCenter, dataIndex: "costCenter" },
          {
            title: m.amount,
            dataIndex: "amount",
            align: "right",
            render: (value: string) => baht(value),
          },
          { title: m.note, dataIndex: "note", render: (v) => v || "-" },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <strong>{m.total}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <strong>{baht(total)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        )}
      />
    );
  }

  const rows = lines as readonly EditableLine[];
  const update = (index: number, patch: Partial<EditableLine>) =>
    onChange?.(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const total = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);

  return (
    <>
      <Table<EditableLine & { key: number }>
        rowKey="key"
        size="small"
        pagination={false}
        scroll={{ x: 720 }}
        dataSource={rows.map((row, key) => ({ ...row, key }))}
        columns={[
          { title: m.no, render: (_, __, index) => index + 1, width: 48 },
          {
            title: m.description,
            render: (_, row, index) => (
              <Input
                value={row.description}
                onChange={(e) => update(index, { description: e.target.value })}
              />
            ),
          },
          {
            title: m.costCenter,
            width: 140,
            render: (_, row, index) => (
              <Input
                value={row.cost_center}
                onChange={(e) => update(index, { cost_center: e.target.value })}
              />
            ),
          },
          {
            title: m.amount,
            width: 150,
            render: (_, row, index) => (
              <InputNumber
                min={0}
                precision={2}
                className="w-full"
                value={row.amount}
                onChange={(value) => update(index, { amount: value })}
              />
            ),
          },
          {
            title: m.note,
            render: (_, row, index) => (
              <Input
                value={row.note}
                onChange={(e) => update(index, { note: e.target.value })}
              />
            ),
          },
          {
            width: 48,
            render: (_, __, index) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onChange?.(rows.filter((_, i) => i !== index))}
              />
            ),
          },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3}>
              <strong>{m.total}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <strong>{baht(total)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} colSpan={2} />
          </Table.Summary.Row>
        )}
      />
      <Button
        type="dashed"
        className="mt-2"
        onClick={() =>
          onChange?.([
            ...rows,
            { description: "", cost_center: "", amount: null, note: "" },
          ])
        }
      >
        {m.add}
      </Button>
    </>
  );
}
