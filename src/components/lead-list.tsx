"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Checkbox, Input, Space, Table, Tag } from "antd";
import Text from "antd/es/typography/Text";
import {
  ConvertLeadModal,
  DisqualifyLeadModal,
  LeadFormModal,
  isLeadOpen,
  leadStatusLabel,
} from "@/components/lead-actions";
import { SearchSelect } from "@/components/search-select";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { CustomerRow, LeadRow, LeadStatusSetting } from "@/lib/api/types";

const m = messages.sales.leads;

/**
 * Lead register — รับเข้า แก้ไข คัดออก (เหตุผลบังคับ ไม่มีการลบ) และแปลงเป็น
 * โอกาสการขายโดยข้อมูลไหลต่อ. The modals are shared with the detail page
 * (`lead-actions.tsx`) so both screens edit the same fields.
 */
export function LeadList({
  rows,
  total,
  page,
  pageSize,
  filters,
  customers,
  statuses,
  canManage,
}: {
  rows: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { search?: string; status?: string; mineOnly: boolean };
  customers: CustomerRow[];
  /** ทั้งชุดตามที่ตั้งไว้ รวมที่ปิดใช้งาน — Lead เก่ายังค้างอยู่บนขั้นที่เพิ่งปิดได้. */
  statuses: LeadStatusSetting[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [disqualifying, setDisqualifying] = useState<LeadRow | null>(null);
  const [converting, setConverting] = useState<LeadRow | null>(null);

  function applyFilters(next: Partial<typeof filters>) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...next };
    if (merged.search) params.set("search", merged.search);
    if (merged.status) params.set("status", merged.status);
    if (merged.mineOnly) params.set("view", "mine");
    router.push(`${ROUTES.leads}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input.Search
          className="max-w-xs"
          defaultValue={filters.search}
          placeholder={m.searchPlaceholder}
          allowClear
          onSearch={(value) => applyFilters({ search: value || undefined })}
        />
        <SearchSelect
          className="min-w-40"
          allowClear
          placeholder={m.filterStatus}
          value={filters.status}
          onChange={(value) =>
            applyFilters({ status: (value as string) || undefined })
          }
          options={statuses
            .filter((status) => status.active || status.code === filters.status)
            .map((status) => ({
              value: status.code,
              label: status.nameTh,
            }))}
        />
        <Checkbox
          checked={filters.mineOnly}
          onChange={(event) => applyFilters({ mineOnly: event.target.checked })}
        >
          {m.mineOnly}
        </Checkbox>
        <div className="grow" />
        {canManage && (
          <Space>
            <Link href={ROUTES.leadImport}>
              <Button>{m.importer.openButton}</Button>
            </Link>
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {m.newLead}
            </Button>
          </Space>
        )}
      </div>

      <Table<LeadRow>
        size="small"
        rowKey="id"
        dataSource={rows}
        locale={{ emptyText: m.empty }}
        pagination={{
          current: page,
          pageSize,
          total,
          hideOnSinglePage: true,
          onChange: (next) => {
            const params = new URLSearchParams();
            if (filters.search) params.set("search", filters.search);
            if (filters.status) params.set("status", filters.status);
            if (filters.mineOnly) params.set("view", "mine");
            params.set("page", String(next));
            router.push(`${ROUTES.leads}?${params.toString()}`);
          },
        }}
        columns={[
          {
            title: m.columns.name,
            dataIndex: "name",
            render: (name: string, row) => (
              <div>
                <Link href={ROUTES.leadDetail(row.id)}>{name}</Link>
                {row.customer && (
                  <Link href={ROUTES.customerDetail(row.customer.id)}>
                    <Text type="secondary" className="block text-xs">
                      {row.customer.customerCode} · {row.customer.nameTh}
                    </Text>
                  </Link>
                )}
              </div>
            ),
          },
          {
            title: m.columns.contact,
            dataIndex: "contactName",
            render: (contactName: string | null, row) =>
              [contactName, row.phone, row.email].filter(Boolean).join(" · ") ||
              "—",
          },
          {
            title: m.columns.source,
            dataIndex: "sourceCode",
            width: 140,
            render: (source: string | null) => source ?? "—",
          },
          {
            title: m.columns.status,
            dataIndex: "status",
            width: 170,
            render: (status: LeadRow["status"], row) => (
              <Space size={4} orientation="vertical">
                <Tag color={leadStatusLabel(status, statuses).color}>
                  {leadStatusLabel(status, statuses).label}
                </Tag>
                {row.convertedOpportunity && (
                  <Link href={ROUTES.opportunityDetail(row.convertedOpportunity.id)}>
                    <Text type="secondary" className="text-xs">
                      {row.convertedOpportunity.opportunityCode}
                    </Text>
                  </Link>
                )}
              </Space>
            ),
          },
          ...(canManage
            ? [
                {
                  title: "",
                  key: "actions",
                  width: 240,
                  render: (_: unknown, row: LeadRow) =>
                    isLeadOpen(row.status, statuses) ? (
                      <Space>
                        <Button
                          size="small"
                          onClick={() => {
                            setEditing(row);
                            setFormOpen(true);
                          }}
                        >
                          {m.actions.edit}
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => setConverting(row)}
                        >
                          {m.actions.convert}
                        </Button>
                        <Button
                          size="small"
                          danger
                          onClick={() => setDisqualifying(row)}
                        >
                          {m.actions.disqualify}
                        </Button>
                      </Space>
                    ) : null,
                },
              ]
            : []),
        ]}
      />

      <LeadFormModal
        open={formOpen}
        lead={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(id) => {
          setFormOpen(false);
          // Lead ใหม่ → เปิดหน้ารายละเอียดให้กรอกต่อ/ลงกิจกรรมได้เลย
          if (editing) router.refresh();
          else router.push(ROUTES.leadDetail(id));
        }}
      />
      <DisqualifyLeadModal
        lead={disqualifying}
        onClose={() => setDisqualifying(null)}
        onDone={() => {
          setDisqualifying(null);
          router.refresh();
        }}
      />
      <ConvertLeadModal
        key={converting?.id ?? "closed"}
        lead={converting}
        customers={customers}
        onClose={() => setConverting(null)}
        onDone={(opportunityId) => router.push(ROUTES.opportunityDetail(opportunityId))}
      />
    </div>
  );
}
