"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Rate,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
} from "antd";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { HealthTag, signalText } from "@/components/crm/keeper/health-tag";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type {
  AccountTier,
  CustomerAccount,
  CustomerTouchType,
} from "@/lib/api/types";

const m = messages.keeper;
const ma = m.account;
const mo = messages.sales.opportunities;

/**
 * CD-86 — the Keeper's view of one customer: health and why, the account
 * plan, reviews and contacts, what the customer buys and the deals that are
 * open — with the shortcut to open an expansion deal. Loaded when the tab
 * opens, like the KYC and finance tabs.
 */
export function CustomerAccountTab({
  customerId,
  canManage,
  canCreateDeal,
}: {
  customerId: string;
  canManage: boolean;
  canCreateDeal: boolean;
}) {
  const [data, setData] = useState<CustomerAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [logging, setLogging] = useState<"review" | "contact" | null>(null);
  const [expanding, setExpanding] = useState(false);

  const load = useCallback(() => {
    void appApi<CustomerAccount>(`customers/${customerId}/account`).then(
      (result) => {
        if (result.ok) setData(result.data);
        else setError(result.message);
      },
    );
  }, [customerId]);
  useEffect(load, [load]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!data) return <Skeleton active paragraph={{ rows: 6 }} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          size="small"
          title={
            <Space size={6}>
              {ma.healthTitle}
              <HealthTag health={data.health} />
            </Space>
          }
        >
          {data.health.signals.length ? (
            <ul className="m-0 list-disc pl-5 text-sm">
              {data.health.signals.map((signal) => (
                <li
                  key={signal.code}
                  className={
                    signal.level === "red" ? "text-red-600" : "text-orange-600"
                  }
                >
                  {signalText(signal)}
                </li>
              ))}
            </ul>
          ) : (
            <Text type="success">{ma.allGood}</Text>
          )}
          <Descriptions size="small" column={2} className="mt-3">
            <Descriptions.Item label={m.columns.lastContact}>
              {data.last_contact_at
                ? dayjs(data.last_contact_at).format("D MMM YYYY")
                : m.never}
            </Descriptions.Item>
            <Descriptions.Item label={ma.lastSatisfaction}>
              {data.last_satisfaction ? `${data.last_satisfaction}/5` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={ma.revenue}>
              {data.revenue_12m === null ? "—" : formatAmount(data.revenue_12m)}
            </Descriptions.Item>
            <Descriptions.Item label={ma.target}>
              {data.plan?.target_revenue
                ? formatAmount(data.plan.target_revenue)
                : "—"}
            </Descriptions.Item>
          </Descriptions>
          <Text type="secondary" className="mt-2 block text-xs">
            {ma.healthNote}
          </Text>
        </Card>

        <Card
          size="small"
          title={ma.planTitle}
          extra={
            canManage ? (
              <Button size="small" onClick={() => setEditingPlan(true)}>
                {data.plan ? ma.editPlan : ma.createPlan}
              </Button>
            ) : null
          }
        >
          {data.plan ? (
            <Descriptions size="small" column={1}>
              <Descriptions.Item label={ma.tier}>
                <Tag color={m.tierColor[data.plan.tier]}>
                  {m.tier[data.plan.tier]}
                </Tag>
                <Text type="secondary" className="text-xs">
                  {m.tierHint}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={ma.goals}>
                <span className="whitespace-pre-wrap">
                  {data.plan.goals || "—"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={ma.reviewEvery}>
                {data.plan.review_every_months}
              </Descriptions.Item>
              <Descriptions.Item label={ma.nextReview}>
                {data.plan.next_review_on
                  ? dayjs(data.plan.next_review_on).format("D MMM YYYY")
                  : "—"}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={ma.noPlan}
            />
          )}
        </Card>
      </div>

      <Card
        size="small"
        title={ma.touchTitle}
        extra={
          canManage ? (
            <Space>
              <Button size="small" onClick={() => setLogging("contact")}>
                {ma.logContact}
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={() => setLogging("review")}
              >
                {ma.logReview}
              </Button>
            </Space>
          ) : null
        }
      >
        {data.touchpoints.length ? (
          <div className="divide-y divide-gray-100">
            {data.touchpoints.map((touch) => (
              <div key={touch.id} className="py-2 text-sm">
                <Space size={6} wrap>
                  <Tag color={touch.type === "review" ? "blue" : undefined}>
                    {ma.touchType[touch.type]}
                  </Tag>
                  {touch.satisfaction ? (
                    <Tag
                      color={
                        touch.satisfaction <= 2
                          ? "red"
                          : touch.satisfaction === 3
                            ? "orange"
                            : "green"
                      }
                    >
                      {ma.satisfaction(touch.satisfaction)}
                    </Tag>
                  ) : null}
                  <Text type="secondary" className="text-xs">
                    {dayjs(touch.occurred_at).format("D MMM YY HH:mm")} ·{" "}
                    {touch.created_by}
                  </Text>
                </Space>
                <div className="mt-1 whitespace-pre-wrap">{touch.summary}</div>
                {touch.next_steps && (
                  <Text type="secondary" className="block text-xs">
                    → {touch.next_steps}
                  </Text>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={ma.noTouches}
          />
        )}
      </Card>

      {data.open_deals_list !== null && (
        <Card
          size="small"
          title={ma.dealsTitle}
          extra={
            canCreateDeal ? (
              <Button size="small" onClick={() => setExpanding(true)}>
                {ma.openExpansion}
              </Button>
            ) : null
          }
        >
          {data.open_deals_list.length ? (
            <div className="divide-y divide-gray-100">
              {data.open_deals_list.map((deal) => (
                <div
                  key={deal.id}
                  className="flex flex-wrap items-center gap-2 py-1.5 text-sm"
                >
                  <Tag color={mo.dealTypeColor[deal.dealType]}>
                    {mo.dealType[deal.dealType]}
                  </Tag>
                  <Link href={ROUTES.opportunityDetail(deal.id)}>
                    {deal.opportunityCode} · {deal.title}
                  </Link>
                  <Tag color={mo.stageColor[deal.stage]}>
                    {mo.stage[deal.stage]}
                  </Tag>
                  <Text type="secondary">{formatAmount(deal.amount)}</Text>
                </div>
              ))}
            </div>
          ) : (
            <Text type="secondary">{ma.noDeals}</Text>
          )}
        </Card>
      )}

      {data.products !== null && (
        <Card size="small" title={ma.productsTitle}>
          <Table
            size="small"
            rowKey={(row) => row.product_code ?? row.description}
            dataSource={data.products}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: ma.noProducts }}
            columns={[
              {
                title: ma.productColumns.product,
                key: "product",
                render: (_: unknown, row) => (
                  <div>
                    {row.description}
                    {row.product_code && (
                      <Text type="secondary" className="block text-xs">
                        {row.product_code}
                      </Text>
                    )}
                  </div>
                ),
              },
              {
                title: ma.productColumns.quantity,
                key: "qty",
                width: 120,
                align: "right",
                render: (_: unknown, row) =>
                  `${row.quantity.toLocaleString("th-TH")} ${row.unit ?? ""}`,
              },
              {
                title: ma.productColumns.amount,
                dataIndex: "amount",
                width: 130,
                align: "right",
                render: (amount: number) => formatAmount(amount),
              },
              {
                title: ma.productColumns.last,
                dataIndex: "last_ordered_on",
                width: 120,
                render: (on: string) => dayjs(on).format("D MMM YY"),
              },
            ]}
          />
        </Card>
      )}

      {data.contracts.length > 0 && (
        <Card size="small" title={ma.contractsTitle}>
          <div className="divide-y divide-gray-100">
            {data.contracts.map((contract) => (
              <div key={contract.id} className="py-1.5 text-sm">
                {contract.contractNo} · {contract.title}{" "}
                <Text type="secondary">
                  — {dayjs(contract.endOn).format("D MMM YYYY")}
                </Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      <PlanModal
        open={editingPlan}
        customerId={customerId}
        plan={data.plan}
        onClose={() => setEditingPlan(false)}
        onSaved={() => {
          setEditingPlan(false);
          load();
        }}
      />
      <TouchModal
        mode={logging}
        customerId={customerId}
        onClose={() => setLogging(null)}
        onSaved={() => {
          setLogging(null);
          load();
        }}
      />
      <ExpansionModal
        open={expanding}
        customerId={customerId}
        customerName={data.name_th}
        onClose={() => setExpanding(false)}
      />
    </div>
  );
}

interface PlanValues {
  tier: AccountTier;
  goals?: string;
  target_revenue?: number | null;
  review_every_months: number;
  next_review_on?: Dayjs | null;
}

function PlanModal({
  open,
  customerId,
  plan,
  onClose,
  onSaved,
}: {
  open: boolean;
  customerId: string;
  plan: CustomerAccount["plan"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<PlanValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    let values: PlanValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi(`customers/${customerId}/account-plan`, {
      method: "PUT",
      body: JSON.stringify({
        tier: values.tier,
        goals: values.goals ?? "",
        target_revenue: values.target_revenue ?? null,
        review_every_months: values.review_every_months,
        // untouched on a new plan = the backend starts the cycle today
        ...(plan || values.next_review_on
          ? {
              next_review_on: values.next_review_on
                ? values.next_review_on.format("YYYY-MM-DD")
                : null,
            }
          : {}),
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(ma.planSaved);
    onSaved();
  }

  return (
    <Modal
      open={open}
      title={ma.planTitle}
      okText={ma.editPlan}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      mask={{ closable: false }}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Form<PlanValues>
        form={form}
        layout="vertical"
        initialValues={{
          tier: plan?.tier ?? "b",
          goals: plan?.goals ?? "",
          target_revenue: plan?.target_revenue ?? null,
          review_every_months: plan?.review_every_months ?? 3,
          next_review_on: plan?.next_review_on
            ? dayjs(plan.next_review_on)
            : null,
        }}
      >
        <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
          <Form.Item name="tier" label={ma.tier} extra={m.tierHint}>
            <Select
              options={Object.entries(m.tier).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Form.Item>
          <Form.Item name="target_revenue" label={ma.targetRevenue}>
            <InputNumber<number> className="w-full" min={0} precision={0} />
          </Form.Item>
          <Form.Item
            name="review_every_months"
            label={ma.reviewEvery}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              className="w-full"
              min={1}
              max={24}
              precision={0}
            />
          </Form.Item>
          <Form.Item name="next_review_on" label={ma.nextReview}>
            <DatePicker className="w-full" format="D MMM YYYY" />
          </Form.Item>
        </div>
        <Form.Item name="goals" label={ma.goals}>
          <Input.TextArea rows={3} maxLength={4000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

interface TouchValues {
  type: CustomerTouchType;
  summary: string;
  occurred_at?: Dayjs | null;
  satisfaction?: number;
  next_steps?: string;
}

function TouchModal({
  mode,
  customerId,
  onClose,
  onSaved,
}: {
  /** null = closed. */
  mode: "review" | "contact" | null;
  customerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<TouchValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const type = Form.useWatch("type", form);

  async function submit() {
    let values: TouchValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi<{ next_review_on: string | null }>(
      `customers/${customerId}/touchpoints`,
      {
        method: "POST",
        body: JSON.stringify({
          type: values.type,
          summary: values.summary.trim(),
          occurred_at: values.occurred_at
            ? values.occurred_at.toISOString()
            : undefined,
          satisfaction:
            values.type === "review" && values.satisfaction
              ? values.satisfaction
              : undefined,
          next_steps: values.next_steps?.trim() || undefined,
        }),
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(
      result.data.next_review_on
        ? ma.touchForm.reviewNext(
            dayjs(result.data.next_review_on).format("D MMM YYYY"),
          )
        : ma.touchForm.saved,
    );
    onSaved();
  }

  return (
    <Modal
      open={mode !== null}
      title={mode === "review" ? ma.logReview : ma.logContact}
      okText={ma.touchForm.save}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      mask={{ closable: false }}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Form<TouchValues>
        form={form}
        layout="vertical"
        initialValues={{ type: mode === "review" ? "review" : "call" }}
      >
        <div className="grid grid-cols-1 gap-x-3 md:grid-cols-2">
          <Form.Item name="type" label={ma.touchForm.type}>
            <Select
              options={Object.entries(ma.touchType)
                .filter(([value]) =>
                  mode === "review" ? value === "review" : value !== "review",
                )
                .map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="occurred_at" label={ma.touchForm.occurredAt}>
            <DatePicker
              className="w-full"
              showTime
              needConfirm={false}
              format="D MMM YYYY HH:mm"
              disabledDate={(current) => current.isAfter(dayjs(), "day")}
            />
          </Form.Item>
        </div>
        {type === "review" && (
          <Form.Item name="satisfaction" label={ma.touchForm.satisfaction}>
            <Rate />
          </Form.Item>
        )}
        <Form.Item
          name="summary"
          label={ma.touchForm.summary}
          rules={[
            {
              required: true,
              whitespace: true,
              message: ma.touchForm.summaryRequired,
            },
          ]}
        >
          <Input.TextArea rows={3} maxLength={4000} />
        </Form.Item>
        <Form.Item name="next_steps" label={ma.touchForm.nextSteps}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ExpansionModal({
  open,
  customerId,
  customerName,
  onClose,
}: {
  open: boolean;
  customerId: string;
  customerName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<{
    title: string;
    deal_type: "upsell" | "cross_sell";
    amount?: number | null;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    let values: {
      title: string;
      deal_type: "upsell" | "cross_sell";
      amount?: number | null;
    };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi<{ id: string }>("opportunities", {
      method: "POST",
      body: JSON.stringify({
        customer_id: customerId,
        title: values.title.trim(),
        deal_type: values.deal_type,
        amount: values.amount ?? undefined,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(ma.expansionCreated);
    router.push(ROUTES.opportunityDetail(result.data.id));
  }

  return (
    <Modal
      open={open}
      title={ma.expansionTitle}
      okText={ma.openExpansion}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={() => void submit()}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} className="mb-3" />}
      <Text type="secondary" className="mb-2 block">
        {customerName}
      </Text>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ deal_type: "upsell" }}
      >
        <Form.Item name="deal_type" label={mo.dealTypeLabel}>
          <Select
            options={(["upsell", "cross_sell"] as const).map((value) => ({
              value,
              label: mo.dealType[value],
            }))}
          />
        </Form.Item>
        <Form.Item
          name="title"
          label={ma.expansionName}
          rules={[
            {
              required: true,
              whitespace: true,
              message: ma.expansionNameRequired,
            },
          ]}
        >
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name="amount" label={ma.expansionAmount}>
          <InputNumber<number> className="w-full" min={0} precision={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
