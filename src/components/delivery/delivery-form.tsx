"use client";

import { useEffect } from "react";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import type { Delivery, ProjectDeliveryView } from "./delivery-types";

const m = messages.delivery;

type LineValues = {
  boq_index?: number;
  quantity?: number;
  readiness: string;
  ready_qty?: number | null;
  expected_on?: Dayjs | null;
  fallback_plan?: string;
  note?: string;
};

type Values = {
  milestone_id?: string;
  planned_on?: Dayjs;
  location?: string;
  receiver_name?: string;
  receiver_phone?: string;
  note?: string;
  lines: LineValues[];
};

/** CD-250 — add or change one delivery trip. */
export function DeliveryForm({
  open,
  view,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  view: ProjectDeliveryView;
  editing: Delivery | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const lines = Form.useWatch("lines", form) ?? [];

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      editing
        ? {
            milestone_id: editing.milestoneId,
            planned_on: dayjs(editing.plannedOn),
            location: editing.location,
            receiver_name: editing.receiverName,
            receiver_phone: editing.receiverPhone,
            note: editing.note,
            lines: editing.lines.map((line) => ({
              boq_index: line.boqIndex,
              quantity: line.quantity,
              readiness: line.readiness,
              ready_qty: line.readyQty,
              expected_on: line.expectedOn ? dayjs(line.expectedOn) : null,
              fallback_plan: line.fallbackPlan,
              note: line.note,
            })),
          }
        : {
            milestone_id: view.milestones.find((x) => x.status !== "achieved")
              ?.id,
            lines: [{ readiness: "unknown" }],
          },
    );
  }, [open, editing, view, form]);

  const save = async (values: Values) => {
    const body = {
      milestone_id: values.milestone_id,
      planned_on: values.planned_on?.format("YYYY-MM-DD"),
      location: values.location ?? "",
      receiver_name: values.receiver_name ?? "",
      receiver_phone: values.receiver_phone ?? "",
      note: values.note ?? "",
      lines: values.lines.map((line) => ({
        boq_index: line.boq_index,
        quantity: line.quantity,
        readiness: line.readiness,
        ready_qty:
          line.readiness === "partial" ? (line.ready_qty ?? null) : null,
        expected_on: line.expected_on?.format("YYYY-MM-DD") ?? null,
        fallback_plan: line.fallback_plan ?? "",
        note: line.note ?? "",
      })),
    };
    const result = await appApi<Delivery>(
      editing
        ? `delivery/deliveries/${editing.id}`
        : `delivery/projects/${view.project.id}/deliveries`,
      { method: editing ? "PUT" : "POST", body: JSON.stringify(body) },
    );
    if (!result.ok) {
      void message.error(result.message);
      return;
    }
    void message.success(m.saved);
    onSaved();
  };

  return (
    <Modal
      open={open}
      width={980}
      title={
        editing ? m.editTitle.replace("{n}", String(editing.seq)) : m.addTitle
      }
      okText={m.save}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form<Values>
        form={form}
        layout="vertical"
        onFinish={(values) => void save(values)}
      >
        <div className="grid grid-cols-1 gap-x-3 md:grid-cols-3">
          <Form.Item
            name="milestone_id"
            label={m.milestone}
            rules={[{ required: true, message: m.pickMilestone }]}
          >
            <Select
              options={view.milestones.map((x) => ({
                value: x.id,
                label: `${x.seq}. ${x.title}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="planned_on"
            label={m.plannedOn}
            rules={[{ required: true, message: m.pickDate }]}
          >
            <DatePicker className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="location"
            label={m.location}
            rules={[
              { required: true, whitespace: true, message: m.needLocation },
            ]}
          >
            <Input maxLength={1000} />
          </Form.Item>
          <Form.Item name="receiver_name" label={m.receiver}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="receiver_phone" label={m.phone}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="note" label={m.note}>
            <Input maxLength={1000} />
          </Form.Item>
        </div>
        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className="space-y-2">
              {fields.map((field) => {
                const readiness = lines[field.name]?.readiness;
                const notReady =
                  readiness === "not_ready" || readiness === "partial";
                return (
                  <div
                    key={field.key}
                    className="rounded-md border border-solid border-black/10 p-2 dark:border-white/15"
                  >
                    <Space wrap align="start">
                      <Form.Item
                        name={[field.name, "boq_index"]}
                        label={m.boqLine}
                        rules={[{ required: true, message: m.pickBoq }]}
                        className="!mb-1"
                      >
                        <Select
                          className="!w-72"
                          showSearch={{ optionFilterProp: "label" }}
                          options={view.boq.map((b) => ({
                            value: b.index,
                            label: `${b.label} (${m.remaining} ${b.remaining}${b.unit ? ` ${b.unit}` : ""})`,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "quantity"]}
                        label={m.quantity}
                        rules={[{ required: true, message: m.needQty }]}
                        className="!mb-1"
                      >
                        <InputNumber min={0.01} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "readiness"]}
                        label={m.readiness}
                        className="!mb-1"
                      >
                        <Select
                          className="!w-36"
                          options={(
                            [
                              "unknown",
                              "ready",
                              "partial",
                              "not_ready",
                            ] as const
                          ).map((value) => ({
                            value,
                            label: m.readinessLabels[value],
                          }))}
                        />
                      </Form.Item>
                      {readiness === "partial" ? (
                        <Form.Item
                          name={[field.name, "ready_qty"]}
                          label={m.readyQty}
                          className="!mb-1"
                        >
                          <InputNumber min={0.01} />
                        </Form.Item>
                      ) : null}
                      {notReady || readiness === "unknown" ? (
                        <Form.Item
                          name={[field.name, "expected_on"]}
                          label={m.expectedOn}
                          className="!mb-1"
                        >
                          <DatePicker format="DD/MM/YYYY" />
                        </Form.Item>
                      ) : null}
                      <Button
                        type="text"
                        danger
                        className="mt-7"
                        icon={<DeleteOutlined />}
                        aria-label={m.removeLine}
                        onClick={() => remove(field.name)}
                      />
                    </Space>
                    {notReady ? (
                      <Form.Item
                        name={[field.name, "fallback_plan"]}
                        label={m.fallbackPlan}
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message: m.needFallback,
                          },
                        ]}
                        className="!mb-1"
                      >
                        <Input.TextArea rows={2} maxLength={1000} />
                      </Form.Item>
                    ) : null}
                  </div>
                );
              })}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => add({ readiness: "unknown" })}
              >
                {m.addLine}
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
