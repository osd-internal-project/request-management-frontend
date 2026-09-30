"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Card, Input, Space, Table, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import type { PartnerList as PartnerListData } from "@/lib/api/presales";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const mp = messages.presales.partners;

/** CD-142 — SAP's suppliers, profiled ones first; search goes to the server. */
export function PartnerList({ q, list }: { q: string; list: PartnerListData }) {
  const router = useRouter();

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <div>
        <Title level={3} className="!mb-1">
          {mp.title}
        </Title>
        <Text type="secondary">{mp.hint}</Text>
      </div>
      {!list.sap_available && (
        <Alert type="warning" showIcon title={mp.sapDown} />
      )}
      <Card>
        <Space orientation="vertical" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input.Search
              allowClear
              defaultValue={q}
              placeholder={mp.search}
              style={{ maxWidth: 360 }}
              onSearch={(value) =>
                router.push(
                  value.trim()
                    ? `${ROUTES.partners}?q=${encodeURIComponent(value.trim())}`
                    : ROUTES.partners,
                )
              }
            />
            <Text type="secondary">
              {mp.shown(list.items.length, list.total)}
            </Text>
          </div>
          <Table
            rowKey="code"
            size="small"
            dataSource={list.items}
            pagination={{ pageSize: 50, hideOnSinglePage: true }}
            locale={{ emptyText: mp.empty }}
            scroll={{ x: 800 }}
            columns={[
              {
                title: mp.code,
                dataIndex: "code",
                width: 130,
                render: (code: string) => (
                  <Link href={ROUTES.partnerDetail(code)}>{code}</Link>
                ),
              },
              {
                title: mp.name,
                dataIndex: "name",
                render: (name: string, row) => (
                  <Link href={ROUTES.partnerDetail(row.code)}>{name}</Link>
                ),
              },
              {
                title: mp.brands,
                key: "brands",
                render: (_: unknown, row) =>
                  row.brands.length ? (
                    <Space size={[4, 4]} wrap>
                      {row.brands.map((brand) => (
                        <Tag key={brand.brand}>
                          {brand.level
                            ? `${brand.brand} · ${brand.level}`
                            : brand.brand}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary">
                      {row.has_profile ? "—" : mp.noProfile}
                    </Text>
                  ),
              },
              {
                title: mp.certifications,
                dataIndex: "certification_count",
                width: 120,
                align: "right",
                render: (count: number) => (count ? count : "—"),
              },
              {
                title: mp.status,
                key: "status",
                width: 200,
                render: (_: unknown, row) => (
                  <Space size={[4, 4]} wrap>
                    {row.active === false && (
                      <Tag color="red">{mp.blocked}</Tag>
                    )}
                    {row.expiry.expired > 0 && (
                      <Tag color="red">{mp.expired(row.expiry.expired)}</Tag>
                    )}
                    {row.expiry.expiring > 0 && (
                      <Tag color="orange">
                        {mp.expiring(row.expiry.expiring)}
                      </Tag>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>
    </Space>
  );
}
