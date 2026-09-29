"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Descriptions, Empty, Skeleton, Table, Tag } from "antd";
import dayjs from "dayjs";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  CustomerKyc,
  CustomerKycRecord,
  KycRiskLevel,
} from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.customers.kyc;

export const RISK_COLOR: Record<KycRiskLevel, string> = {
  low: "green",
  medium: "gold",
  high: "red",
};

const STATUS_COLOR: Record<CustomerKycRecord["status"], string> = {
  verified: "blue",
  screening_hit: "red",
  superseded: "default",
  expired: "orange",
};

const day = (value: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY") : "—";

/**
 * CD-61 — the customer's KYC: where it stands (risk, until when), a live
 * check against the prohibited list — shown here so the reviewer sees any
 * match before closing the KYC request — and every verification on record.
 */
export function CustomerKycTab({ customerId }: { customerId: string }) {
  const [data, setData] = useState<CustomerKyc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void appApi<CustomerKyc>(`customers/${customerId}/kyc`).then((result) => {
      if (result.ok) setData(result.data);
      else setError(result.message);
    });
  }, [customerId]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!data) return <Skeleton active paragraph={{ rows: 4 }} />;

  const matches = data.screening.matches;

  return (
    <div className="space-y-4">
      <Descriptions size="small" column={{ xs: 1, md: 3 }} bordered>
        <Descriptions.Item label={m.status}>
          {data.verified ? (
            <Tag color="blue">{m.verified}</Tag>
          ) : data.records.some((record) => record.status === "expired") &&
            !data.verified ? (
            <Tag color="orange">{m.expired}</Tag>
          ) : (
            <Tag>{m.notVerified}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={m.risk}>
          {data.riskLevel ? (
            <Tag color={RISK_COLOR[data.riskLevel]}>
              {m.riskLevels[data.riskLevel]}
            </Tag>
          ) : (
            "—"
          )}
        </Descriptions.Item>
        <Descriptions.Item label={m.validUntil}>
          {day(data.expiresOn)}
        </Descriptions.Item>
      </Descriptions>

      {matches.length ? (
        <Alert
          type="error"
          showIcon
          title={m.screeningHit(matches.length)}
          description={
            <ul className="m-0 pl-4 text-xs">
              {matches.map((match) => (
                <li key={match.entryId}>
                  {match.name}
                  {match.taxId && ` · ${match.taxId}`} —{" "}
                  {match.byTaxId
                    ? m.byTaxId
                    : m.byName(Math.round(match.score * 100))}{" "}
                  · {match.reason}
                </li>
              ))}
            </ul>
          }
        />
      ) : (
        <Alert type="success" showIcon title={m.screeningClear} />
      )}
      <Text type="secondary" className="block text-xs">
        {m.suggestion(m.riskLevels[data.screening.suggestedRisk])}
      </Text>

      {data.records.length ? (
        <Table<CustomerKycRecord>
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: true }}
          dataSource={data.records}
          expandable={{
            rowExpandable: (row) =>
              Boolean(row.signatories || row.clearanceNote),
            expandedRowRender: (row) => (
              <div className="space-y-1 text-xs">
                {row.signatories && (
                  <div className="whitespace-pre-line">
                    <Text strong>{m.signatories}:</Text> {row.signatories}
                  </div>
                )}
                {row.clearanceNote && (
                  <div>
                    <Text strong>{m.clearance}:</Text> {row.clearanceNote}
                  </div>
                )}
              </div>
            ),
          }}
          columns={[
            {
              title: m.columns.recordedAt,
              dataIndex: "recordedAt",
              render: (value: string) => dayjs(value).format("DD/MM/YY HH:mm"),
            },
            {
              title: m.columns.status,
              dataIndex: "status",
              render: (status: CustomerKycRecord["status"]) => (
                <Tag color={STATUS_COLOR[status]}>{m.recordStatus[status]}</Tag>
              ),
            },
            {
              title: m.columns.risk,
              key: "risk",
              render: (_: unknown, row) => (
                <span>
                  <Tag color={RISK_COLOR[row.riskLevel]}>
                    {m.riskLevels[row.riskLevel]}
                  </Tag>
                  {row.riskLevel !== row.suggestedRisk && (
                    <Text type="secondary" className="text-xs">
                      {m.suggestedWas(m.riskLevels[row.suggestedRisk])}
                    </Text>
                  )}
                </span>
              ),
            },
            {
              title: m.columns.expiresOn,
              dataIndex: "expiresOn",
              render: (value: string) => day(value),
            },
            {
              title: m.columns.request,
              dataIndex: "requestId",
              render: (id: string | null) =>
                id ? (
                  <Link href={ROUTES.requestDetail(id)}>{m.openRequest}</Link>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.noRecords} />
      )}
    </div>
  );
}
