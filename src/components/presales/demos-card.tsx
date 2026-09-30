"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  CriterionResult,
  DemoCriterion,
  DemoEquipment,
  DemoFinding,
  DemoRequestOption,
  SolutionDemo,
  SolutionDetail,
} from "@/lib/api/presales";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const md = messages.presales.demos;
const mp = messages.presales;

const today = () => new Date().toISOString().slice(0, 10);
const dateOf = (value: string | null) => (value ? value.slice(0, 10) : "—");

const STATUS_COLOR: Record<string, string> = {
  planned: "blue",
  done: "green",
  cancelled: "default",
};
const RESULTS = Object.keys(md.results) as CriterionResult[];

/**
 * CD-139 — Demo / POC on the Solution: the plan, the people booked, the
 * equipment out and back, results against each success criterion, and the
 * findings. Pre-Sales writes it; a demo closes only with every item back, and
 * a finding that needs a Solution change stays open until a version has it.
 */
export function DemosCard({ solution }: { solution: SolutionDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const base = `presales/solutions/${solution.id}/demos`;
  const counts = solution.demo_counts;
  const [creating, setCreating] = useState(false);
  const [options, setOptions] = useState<DemoRequestOption[] | null>(null);
  const [requestId, setRequestId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run(path: string, init: RequestInit, done?: string) {
    setBusy(true);
    const result = await appApi(path, init);
    setBusy(false);
    if (!result.ok) {
      void message.error(result.message);
      return false;
    }
    if (done) void message.success(done);
    router.refresh();
    return true;
  }

  async function openCreate() {
    setCreating(true);
    setRequestId("");
    const result = await appApi<DemoRequestOption[]>(
      `presales/solutions/${solution.id}/demo-requests`,
    );
    setOptions(result.ok ? result.data : []);
  }

  async function create() {
    const ok = await run(base, {
      method: "POST",
      body: JSON.stringify(requestId ? { request_id: requestId } : {}),
    });
    if (ok) setCreating(false);
  }

  return (
    <Card
      size="small"
      title={`${md.title} · ${counts.total}`}
      extra={
        <Space>
          {counts.total > 0 && (
            <Text type="secondary" className="text-xs">
              {md.summary(
                counts.planned,
                counts.equipment_out,
                counts.findings_open,
              )}
            </Text>
          )}
          {solution.can_manage && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => void openCreate()}
            >
              {md.add}
            </Button>
          )}
        </Space>
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {md.hint}
      </Text>
      {solution.demos.length ? (
        <Collapse
          size="small"
          items={solution.demos.map((demo) => ({
            key: demo.id,
            label: (
              <Space wrap>
                <Tag>{md.kinds[demo.kind]}</Tag>
                <span>
                  #{demo.seq} {demo.title}
                </span>
                <Tag color={STATUS_COLOR[demo.status]}>
                  {md.statuses[demo.status]}
                </Tag>
                {demo.scheduledOn && (
                  <Text type="secondary" className="text-xs">
                    {dateOf(demo.scheduledOn)}
                  </Text>
                )}
                {demo.equipment.some((item) => !item.returnedOn) && (
                  <Tag color="orange">{md.notReturned}</Tag>
                )}
              </Space>
            ),
            children: (
              <DemoPanel
                // Reset the form to what was stored after every change.
                key={JSON.stringify(demo)}
                demo={demo}
                solution={solution}
                base={`${base}/${demo.id}`}
                busy={busy}
                run={run}
              />
            ),
          }))}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={md.empty} />
      )}

      <Modal
        open={creating}
        title={md.add}
        okText={md.create}
        okButtonProps={{ loading: busy }}
        onOk={() => void create()}
        onCancel={() => setCreating(false)}
        destroyOnHidden
      >
        <Radio.Group
          value={requestId}
          onChange={(event) => setRequestId(event.target.value as string)}
          className="w-full"
        >
          <Space orientation="vertical" className="w-full">
            <Radio value="">{md.blank}</Radio>
            {(options ?? []).map((option) => (
              <Radio key={option.id} value={option.id} disabled={option.used}>
                {md.fromRequest} {option.requestNo ?? option.id}
                {option.objective && ` — ${option.objective.split("\n")[0]}`}
                {option.used && <Tag className="ml-1">{md.requestUsed}</Tag>}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Modal>
    </Card>
  );
}

function DemoPanel({
  demo,
  solution,
  base,
  busy,
  run,
}: {
  demo: SolutionDemo;
  solution: SolutionDetail;
  base: string;
  busy: boolean;
  run: (path: string, init: RequestInit, done?: string) => Promise<boolean>;
}) {
  const editable = solution.can_manage && demo.status === "planned";
  const [form, setForm] = useState({
    kind: demo.kind,
    title: demo.title,
    scheduledOn: demo.scheduledOn ? demo.scheduledOn.slice(0, 10) : "",
    site: demo.site,
    people: demo.people,
    plan: demo.plan,
    outcome: demo.outcome,
  });
  const [criteria, setCriteria] = useState<DemoCriterion[]>(demo.criteria);
  const [item, setItem] = useState({
    name: "",
    serial: "",
    quantity: 1,
    takenBy: "",
    outOn: today(),
  });
  const [finding, setFinding] = useState({ text: "", requiresChange: false });
  const [resolving, setResolving] = useState<DemoFinding | null>(null);
  const [resolveVersion, setResolveVersion] = useState<number | undefined>();
  const [returning, setReturning] = useState<DemoEquipment | null>(null);
  const [returnedOn, setReturnedOn] = useState(today());

  const setCriterion = (index: number, patch: Partial<DemoCriterion>) =>
    setCriteria((rows) =>
      rows.map((row, at) => (at === index ? { ...row, ...patch } : row)),
    );

  const save = () =>
    run(
      base,
      {
        method: "PATCH",
        body: JSON.stringify({
          kind: form.kind,
          title: form.title,
          scheduled_on: form.scheduledOn,
          site: form.site,
          people: form.people,
          plan: form.plan,
          outcome: form.outcome,
          criteria,
        }),
      },
      md.saved,
    );

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      {demo.requestId && (
        <Link href={ROUTES.requestDetail(demo.requestId)}>
          {md.openRequest}
        </Link>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Text className="block text-xs">{md.titleLabel}</Text>
          <Space.Compact className="w-full">
            <Select
              value={form.kind}
              disabled={!editable}
              style={{ width: 100 }}
              options={[
                { value: "demo", label: md.kinds.demo },
                { value: "poc", label: md.kinds.poc },
              ]}
              onChange={(value: "demo" | "poc") =>
                setForm({ ...form, kind: value })
              }
            />
            <Input
              value={form.title}
              disabled={!editable}
              maxLength={300}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </Space.Compact>
        </div>
        <div>
          <Text className="block text-xs">{md.scheduledOn}</Text>
          <Input
            type="date"
            value={form.scheduledOn}
            disabled={!editable}
            onChange={(event) =>
              setForm({ ...form, scheduledOn: event.target.value })
            }
          />
        </div>
        <div>
          <Text className="block text-xs">{md.site}</Text>
          <Input
            value={form.site}
            disabled={!editable}
            maxLength={1000}
            onChange={(event) => setForm({ ...form, site: event.target.value })}
          />
        </div>
        <div>
          <Text className="block text-xs">{md.people}</Text>
          <Input
            value={form.people}
            disabled={!editable}
            maxLength={2000}
            onChange={(event) =>
              setForm({ ...form, people: event.target.value })
            }
          />
        </div>
      </div>
      <div>
        <Text className="block text-xs">{md.plan}</Text>
        <Input.TextArea
          value={form.plan}
          disabled={!editable}
          maxLength={8000}
          autoSize={{ minRows: 2, maxRows: 8 }}
          onChange={(event) => setForm({ ...form, plan: event.target.value })}
        />
      </div>

      <div>
        <Text strong className="block">
          {md.criteria}
        </Text>
        <Space orientation="vertical" className="w-full" size={4}>
          {criteria.map((row, index) => (
            <Space.Compact key={index} className="w-full">
              <Input
                value={row.text}
                disabled={!editable}
                maxLength={1000}
                placeholder={md.criterionPlaceholder}
                onChange={(event) =>
                  setCriterion(index, { text: event.target.value })
                }
              />
              <Select
                value={row.result}
                disabled={!editable}
                style={{ width: 130 }}
                options={RESULTS.map((value) => ({
                  value,
                  label: md.results[value],
                }))}
                onChange={(value: CriterionResult) =>
                  setCriterion(index, { result: value })
                }
              />
              <Input
                value={row.note}
                disabled={!editable}
                maxLength={1000}
                placeholder={md.notePlaceholder}
                style={{ maxWidth: 220 }}
                onChange={(event) =>
                  setCriterion(index, { note: event.target.value })
                }
              />
              {editable && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={md.remove}
                  onClick={() =>
                    setCriteria((rows) => rows.filter((_, at) => at !== index))
                  }
                />
              )}
            </Space.Compact>
          ))}
          {editable && (
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() =>
                setCriteria((rows) => [
                  ...rows,
                  { text: "", result: "pending", note: "" },
                ])
              }
            >
              {md.addCriterion}
            </Button>
          )}
        </Space>
      </div>

      <div>
        <Text className="block text-xs">{md.outcome}</Text>
        <Input.TextArea
          value={form.outcome}
          disabled={!editable}
          maxLength={8000}
          autoSize={{ minRows: 2, maxRows: 8 }}
          onChange={(event) =>
            setForm({ ...form, outcome: event.target.value })
          }
        />
      </div>

      {editable && (
        <Space wrap>
          <Button
            type="primary"
            loading={busy}
            disabled={!form.title.trim()}
            onClick={() => void save()}
          >
            {md.save}
          </Button>
          <Popconfirm
            title={md.closeConfirm}
            onConfirm={() =>
              void run(`${base}/close`, {
                method: "POST",
                body: JSON.stringify({ status: "done" }),
              })
            }
          >
            <Button loading={busy}>{md.closeDone}</Button>
          </Popconfirm>
          <Popconfirm
            title={md.closeConfirm}
            onConfirm={() =>
              void run(`${base}/close`, {
                method: "POST",
                body: JSON.stringify({ status: "cancelled" }),
              })
            }
          >
            <Button loading={busy}>{md.closeCancelled}</Button>
          </Popconfirm>
          <Popconfirm
            title={md.removeConfirm}
            onConfirm={() => void run(base, { method: "DELETE" })}
          >
            <Button danger icon={<DeleteOutlined />}>
              {md.remove}
            </Button>
          </Popconfirm>
        </Space>
      )}

      <div>
        <Text strong className="block">
          {md.equipment}
        </Text>
        <Table<DemoEquipment>
          size="small"
          rowKey="id"
          pagination={false}
          locale={{ emptyText: md.equipmentEmpty }}
          dataSource={demo.equipment}
          columns={[
            {
              title: md.equipmentName,
              dataIndex: "name",
              render: (name: string, row) => (
                <>
                  {name}
                  {row.serial && (
                    <Text type="secondary" className="block text-xs">
                      {row.serial}
                    </Text>
                  )}
                </>
              ),
            },
            { title: md.quantity, dataIndex: "quantity", width: 70 },
            {
              title: md.takenBy,
              dataIndex: "takenBy",
              render: (value: string) => value || "—",
            },
            {
              title: md.outOn,
              dataIndex: "outOn",
              width: 110,
              render: dateOf,
            },
            {
              title: md.returnedOn,
              dataIndex: "returnedOn",
              width: 150,
              render: (value: string | null, row) =>
                value ? (
                  dateOf(value)
                ) : solution.can_manage ? (
                  <Button
                    size="small"
                    onClick={() => {
                      setReturnedOn(today());
                      setReturning(row);
                    }}
                  >
                    {md.checkIn}
                  </Button>
                ) : (
                  <Tag color="orange">{md.notReturned}</Tag>
                ),
            },
          ]}
        />
        {editable && (
          <Space.Compact className="mt-2 w-full">
            <Input
              value={item.name}
              maxLength={300}
              placeholder={md.equipmentName}
              onChange={(event) =>
                setItem({ ...item, name: event.target.value })
              }
            />
            <Input
              value={item.serial}
              maxLength={200}
              placeholder={md.serial}
              style={{ maxWidth: 180 }}
              onChange={(event) =>
                setItem({ ...item, serial: event.target.value })
              }
            />
            <InputNumber
              value={item.quantity}
              min={1}
              max={1000}
              style={{ width: 80 }}
              aria-label={md.quantity}
              onChange={(value) =>
                setItem({ ...item, quantity: Number(value) || 1 })
              }
            />
            <Input
              value={item.takenBy}
              maxLength={200}
              placeholder={md.takenBy}
              style={{ maxWidth: 160 }}
              onChange={(event) =>
                setItem({ ...item, takenBy: event.target.value })
              }
            />
            <Input
              type="date"
              value={item.outOn}
              style={{ width: 150 }}
              aria-label={md.outOn}
              onChange={(event) =>
                setItem({ ...item, outOn: event.target.value || today() })
              }
            />
            <Button
              icon={<PlusOutlined />}
              disabled={!item.name.trim()}
              loading={busy}
              onClick={() =>
                void run(`${base}/equipment`, {
                  method: "POST",
                  body: JSON.stringify({
                    name: item.name,
                    serial: item.serial,
                    quantity: item.quantity,
                    taken_by: item.takenBy,
                    out_on: item.outOn,
                  }),
                })
              }
            >
              {md.checkOut}
            </Button>
          </Space.Compact>
        )}
      </div>

      <div>
        <Text strong className="block">
          {md.findings}
        </Text>
        {demo.findings.length ? (
          <ol className="m-0 pl-5">
            {demo.findings.map((row) => (
              <li key={row.id} className="mb-1">
                <span className="whitespace-pre-wrap">{row.text}</span>{" "}
                {row.requiresChange &&
                  (row.resolvedVersionNo !== null ? (
                    <Tag color="green">
                      {md.findingResolved(row.resolvedVersionNo)}
                    </Tag>
                  ) : (
                    <Tag color="red">{md.findingOpen}</Tag>
                  ))}
                {solution.can_manage &&
                  row.requiresChange &&
                  row.resolvedVersionNo === null && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setResolveVersion(solution.currentVersionNo);
                        setResolving(row);
                      }}
                    >
                      {md.resolve}
                    </Button>
                  )}
                {solution.can_manage && (
                  <Popconfirm
                    title={md.removeConfirm}
                    onConfirm={() =>
                      void run(`${base}/findings/${row.id}`, {
                        method: "DELETE",
                      })
                    }
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      aria-label={md.remove}
                    />
                  </Popconfirm>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <Text type="secondary">{md.findingsEmpty}</Text>
        )}
        {solution.can_manage && (
          <Space.Compact className="mt-2 w-full">
            <Input
              value={finding.text}
              maxLength={4000}
              placeholder={md.findingPlaceholder}
              onChange={(event) =>
                setFinding({ ...finding, text: event.target.value })
              }
            />
            <Button
              onClick={() =>
                setFinding({
                  ...finding,
                  requiresChange: !finding.requiresChange,
                })
              }
            >
              <Checkbox checked={finding.requiresChange} />
              <span className="ml-1">{md.requiresChange}</span>
            </Button>
            <Button
              icon={<PlusOutlined />}
              disabled={!finding.text.trim()}
              loading={busy}
              onClick={() =>
                void run(`${base}/findings`, {
                  method: "POST",
                  body: JSON.stringify({
                    text: finding.text,
                    requires_change: finding.requiresChange,
                  }),
                })
              }
            >
              {md.addFinding}
            </Button>
          </Space.Compact>
        )}
      </div>

      <Modal
        open={returning !== null}
        title={returning ? `${md.checkIn} · ${returning.name}` : ""}
        okText={md.checkIn}
        okButtonProps={{ loading: busy, disabled: !returnedOn }}
        onOk={() =>
          void run(`${base}/equipment/${returning?.id}/return`, {
            method: "POST",
            body: JSON.stringify({ returned_on: returnedOn }),
          }).then((ok) => ok && setReturning(null))
        }
        onCancel={() => setReturning(null)}
        destroyOnHidden
      >
        <Space>
          <Text>{md.returnedOn}</Text>
          <Input
            type="date"
            value={returnedOn}
            onChange={(event) => setReturnedOn(event.target.value)}
          />
        </Space>
      </Modal>

      <Modal
        open={resolving !== null}
        title={md.resolveTitle}
        okText={md.resolveOk}
        okButtonProps={{ loading: busy, disabled: !resolveVersion }}
        onOk={() =>
          void run(`${base}/findings/${resolving?.id}/resolve`, {
            method: "POST",
            body: JSON.stringify({ version_no: resolveVersion }),
          }).then((ok) => ok && setResolving(null))
        }
        onCancel={() => setResolving(null)}
        destroyOnHidden
      >
        <Space orientation="vertical" className="w-full">
          <Text type="secondary">{md.resolveHint}</Text>
          <Select
            value={resolveVersion}
            style={{ width: "100%" }}
            onChange={(no: number) => setResolveVersion(no)}
            options={solution.versions.map((row) => ({
              value: row.versionNo,
              label: `${mp.version(row.versionNo)} · ${
                mp.versionStatus[row.status] ?? row.status
              }`,
            }))}
          />
        </Space>
      </Modal>
    </Space>
  );
}
