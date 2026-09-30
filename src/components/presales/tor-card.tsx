"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Table,
  Tag,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { appApi } from "@/lib/api/client";
import type {
  SolutionDetail,
  TorClause,
  TorCompliance,
} from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const mt = messages.presales.tor;

const COMPLIANCE_COLOR: Record<string, string> = {
  unanswered: "default",
  comply: "green",
  partial: "gold",
  not_comply: "red",
};
const COMPLIANCES = Object.keys(mt.compliances) as TorCompliance[];

/** `YYYY-MM-DDTHH:mm` in the viewer's zone, for a datetime-local input. */
function localInput(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

const isGap = (row: TorClause) =>
  row.mandatory &&
  (row.compliance === "unanswered" || row.compliance === "not_comply");

/**
 * CD-138 — ตอบ TOR / RFP: the TOR's facts and original files, and its
 * clauses one by one with how the offer complies. A mandatory clause
 * unanswered or "not comply" keeps the Solution from going for approval.
 */
export function TorCard({ solution }: { solution: SolutionDetail }) {
  const router = useRouter();
  const { message } = App.useApp();
  const base = `presales/solutions/${solution.id}/tor`;
  const counts = solution.tor_counts;
  const facts = solution.tor.facts;
  const editable = solution.can_manage;
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    buyer: facts?.buyer ?? "",
    projectNo: facts?.projectNo ?? "",
    submissionDeadline: localInput(facts?.submissionDeadline ?? null),
    bidBond: facts?.bidBond ?? "",
    note: facts?.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    clauseNo: "",
    text: "",
    mandatory: true,
  });
  const [answering, setAnswering] = useState<TorClause | null>(null);

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

  const saveFacts = () =>
    run(
      base,
      {
        method: "PUT",
        body: JSON.stringify({
          buyer: form.buyer,
          project_no: form.projectNo,
          submission_deadline: form.submissionDeadline
            ? new Date(form.submissionDeadline).toISOString()
            : "",
          bid_bond: form.bidBond,
          note: form.note,
        }),
      },
      mt.saved,
    );

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    await run(`${base}/files`, { method: "POST", body });
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <Card
      size="small"
      title={`${mt.title} · ${counts.total}`}
      extra={
        counts.mandatory > 0 ? (
          <Text
            type={counts.mandatory_gaps ? "danger" : "secondary"}
            className="text-xs"
          >
            {mt.summary(
              counts.mandatory_answered,
              counts.mandatory,
              counts.partial,
            )}
          </Text>
        ) : null
      }
    >
      <Text type="secondary" className="mb-3 block text-xs">
        {mt.hint}
      </Text>

      <Text strong className="block">
        {mt.facts}
      </Text>
      <div className="mt-1 grid gap-2 md:grid-cols-2">
        {(
          [
            ["buyer", mt.buyer, 300],
            ["projectNo", mt.projectNo, 100],
            ["bidBond", mt.bidBond, 300],
          ] as const
        ).map(([key, label, max]) => (
          <div key={key}>
            <Text className="block text-xs">{label}</Text>
            <Input
              value={form[key]}
              maxLength={max}
              disabled={!editable}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
            />
          </div>
        ))}
        <div>
          <Text className="block text-xs">{mt.submissionDeadline}</Text>
          <Input
            type="datetime-local"
            value={form.submissionDeadline}
            disabled={!editable}
            onChange={(event) =>
              setForm({ ...form, submissionDeadline: event.target.value })
            }
          />
        </div>
      </div>
      <Input.TextArea
        className="mt-2"
        value={form.note}
        maxLength={4000}
        disabled={!editable}
        autoSize={{ minRows: 1, maxRows: 4 }}
        placeholder={mt.note}
        onChange={(event) => setForm({ ...form, note: event.target.value })}
      />
      {editable && (
        <Button
          className="mt-2"
          size="small"
          loading={busy}
          onClick={() => void saveFacts()}
        >
          {mt.saveFacts}
        </Button>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Text strong>
          {mt.files} · {solution.tor.files.length}
        </Text>
        {editable && (
          <>
            <input
              ref={fileInput}
              type="file"
              hidden
              onChange={(event) => void upload(event.target.files)}
            />
            <Button
              size="small"
              icon={<UploadOutlined />}
              loading={busy}
              onClick={() => fileInput.current?.click()}
            >
              {mt.upload}
            </Button>
          </>
        )}
      </div>
      {solution.tor.files.length ? (
        <ul className="m-0 list-none p-0">
          {solution.tor.files.map((file) => (
            <li key={file.id} className="flex items-center gap-2">
              <a
                href={`/api/app/${base}/files/${file.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {file.fileName}
              </a>
              {editable && (
                <Popconfirm
                  title={mt.removeFile}
                  onConfirm={() =>
                    void run(`${base}/files/${file.id}`, { method: "DELETE" })
                  }
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    aria-label={mt.removeFile}
                  />
                </Popconfirm>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Text type="secondary" className="block">
          {mt.filesEmpty}
        </Text>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Text strong>
          {mt.clauses} · {solution.tor.clauses.length}
        </Text>
        {editable && (
          <Space>
            <Button size="small" onClick={() => setPasting(true)}>
              {mt.paste}
            </Button>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setDraft({ clauseNo: "", text: "", mandatory: true });
                setAdding(true);
              }}
            >
              {mt.addClause}
            </Button>
          </Space>
        )}
      </div>
      {solution.tor.clauses.length ? (
        <Table<TorClause>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={solution.tor.clauses}
          className="mt-1"
          columns={[
            {
              title: mt.clauseNo,
              key: "no",
              width: 90,
              render: (_: unknown, row) => row.clauseNo || row.seq,
            },
            {
              title: mt.text,
              dataIndex: "text",
              render: (text: string, row) => (
                <>
                  <span className="whitespace-pre-wrap">{text}</span>
                  <div>
                    <Tag color={row.mandatory ? "blue" : "default"}>
                      {row.mandatory ? mt.mandatory : mt.optional}
                    </Tag>
                  </div>
                </>
              ),
            },
            {
              title: mt.compliance,
              key: "compliance",
              render: (_: unknown, row) => (
                <>
                  <Tag color={COMPLIANCE_COLOR[row.compliance]}>
                    {mt.compliances[row.compliance]}
                  </Tag>
                  {isGap(row) && <Tag color="red">{mt.gap}</Tag>}
                  {row.response && (
                    <div className="text-xs whitespace-pre-wrap">
                      {row.response}
                    </div>
                  )}
                  {row.reference && (
                    <Text type="secondary" className="block text-xs">
                      {row.reference}
                    </Text>
                  )}
                </>
              ),
            },
            ...(editable
              ? [
                  {
                    key: "actions",
                    width: 110,
                    render: (_: unknown, row: TorClause) => (
                      <Space size={0}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setAnswering({ ...row })}
                        >
                          {mt.answer}
                        </Button>
                        <Popconfirm
                          title={mt.removeConfirm}
                          onConfirm={() =>
                            void run(`${base}/clauses/${row.id}`, {
                              method: "DELETE",
                            })
                          }
                        >
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            aria-label={mt.remove}
                          />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]
              : []),
          ]}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={mt.clausesEmpty}
        />
      )}

      <Modal
        open={pasting}
        title={mt.paste}
        okText={mt.pasteOk}
        okButtonProps={{ loading: busy, disabled: !pasted.trim() }}
        onOk={() =>
          void run(`${base}/clauses/bulk`, {
            method: "POST",
            body: JSON.stringify({ text: pasted }),
          }).then((ok) => {
            if (ok) {
              setPasting(false);
              setPasted("");
            }
          })
        }
        onCancel={() => setPasting(false)}
        destroyOnHidden
      >
        <Text type="secondary" className="mb-2 block text-xs">
          {mt.pasteHint}
        </Text>
        <Input.TextArea
          value={pasted}
          autoSize={{ minRows: 8, maxRows: 20 }}
          onChange={(event) => setPasted(event.target.value)}
        />
      </Modal>

      <Modal
        open={adding}
        title={mt.addClause}
        okText={mt.save}
        okButtonProps={{ loading: busy, disabled: !draft.text.trim() }}
        onOk={() =>
          void run(`${base}/clauses`, {
            method: "POST",
            body: JSON.stringify({
              clause_no: draft.clauseNo,
              text: draft.text,
              mandatory: draft.mandatory,
            }),
          }).then((ok) => ok && setAdding(false))
        }
        onCancel={() => setAdding(false)}
        destroyOnHidden
      >
        <Space orientation="vertical" className="w-full">
          <Input
            value={draft.clauseNo}
            maxLength={40}
            placeholder={mt.clauseNo}
            onChange={(event) =>
              setDraft({ ...draft, clauseNo: event.target.value })
            }
          />
          <Input.TextArea
            value={draft.text}
            maxLength={8000}
            autoSize={{ minRows: 2 }}
            placeholder={mt.text}
            onChange={(event) =>
              setDraft({ ...draft, text: event.target.value })
            }
          />
          <Checkbox
            checked={draft.mandatory}
            onChange={(event) =>
              setDraft({ ...draft, mandatory: event.target.checked })
            }
          >
            {mt.mandatory}
          </Checkbox>
        </Space>
      </Modal>

      <Modal
        open={answering !== null}
        title={
          answering ? `${mt.answer} ${answering.clauseNo || answering.seq}` : ""
        }
        okText={mt.save}
        okButtonProps={{ loading: busy, disabled: !answering?.text.trim() }}
        onOk={() => {
          if (!answering) return;
          void run(`${base}/clauses/${answering.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              clause_no: answering.clauseNo,
              text: answering.text,
              mandatory: answering.mandatory,
              compliance: answering.compliance,
              response: answering.response,
              reference: answering.reference,
            }),
          }).then((ok) => ok && setAnswering(null));
        }}
        onCancel={() => setAnswering(null)}
        destroyOnHidden
      >
        {answering && (
          <Space orientation="vertical" className="w-full">
            <Space.Compact className="w-full">
              <Input
                value={answering.clauseNo}
                maxLength={40}
                style={{ width: 110 }}
                placeholder={mt.clauseNo}
                onChange={(event) =>
                  setAnswering({ ...answering, clauseNo: event.target.value })
                }
              />
              <Input.TextArea
                value={answering.text}
                maxLength={8000}
                autoSize={{ minRows: 1, maxRows: 6 }}
                onChange={(event) =>
                  setAnswering({ ...answering, text: event.target.value })
                }
              />
            </Space.Compact>
            <Checkbox
              checked={answering.mandatory}
              onChange={(event) =>
                setAnswering({ ...answering, mandatory: event.target.checked })
              }
            >
              {mt.mandatory}
            </Checkbox>
            <Radio.Group
              value={answering.compliance}
              optionType="button"
              onChange={(event) =>
                setAnswering({
                  ...answering,
                  compliance: event.target.value as TorCompliance,
                })
              }
              options={COMPLIANCES.map((value) => ({
                value,
                label: mt.compliances[value],
              }))}
            />
            <Input.TextArea
              value={answering.response}
              maxLength={8000}
              autoSize={{ minRows: 2, maxRows: 8 }}
              placeholder={mt.response}
              onChange={(event) =>
                setAnswering({ ...answering, response: event.target.value })
              }
            />
            <Input
              value={answering.reference}
              maxLength={300}
              placeholder={mt.reference}
              onChange={(event) =>
                setAnswering({ ...answering, reference: event.target.value })
              }
            />
          </Space>
        )}
      </Modal>
    </Card>
  );
}
