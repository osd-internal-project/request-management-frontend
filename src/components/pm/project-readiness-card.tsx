"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Tag,
} from "antd";
import { CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs, { type Dayjs } from "dayjs";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type {
  ProjectReadinessView,
  ReadinessLineView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.readiness;

interface LineDraft {
  id?: string;
  text: string;
  inspectorUserId: string | null;
}

interface Check {
  line: ReadinessLineView;
  result: "pass" | "fail";
  on: Dayjs | null;
  note: string;
}

/**
 * CD-225 — the last look before handover: the company checklist copied in,
 * each line checked by its inspector, and what the system checks itself.
 */
export function ProjectReadinessCard({
  projectId,
  view,
  people,
}: {
  readonly projectId: string;
  readonly view: ProjectReadinessView;
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [draft, setDraft] = useState<LineDraft | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `projects/${projectId}/readiness`;
  const { readiness } = view;
  const pickable = [
    ...people,
    ...view.lines
      .filter(
        (line) =>
          line.inspectorUserId &&
          !people.some((person) => person.id === line.inspectorUserId),
      )
      .map((line) => ({
        id: line.inspectorUserId!,
        name: line.inspectorName ?? "",
      })),
  ].filter(
    (person, index, all) => all.findIndex((p) => p.id === person.id) === index,
  );

  async function call(path: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const response = await appApi(path, init);
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return false;
    }
    message.success(m.saved);
    router.refresh();
    return true;
  }

  return (
    <Card
      size="small"
      title={
        <Space size={4} wrap>
          {m.title}
          {view.started && (
            <Tag color={readiness.ready ? "success" : "warning"}>
              {readiness.ready
                ? m.ready
                : m.notReady(readiness.blockers.length)}
            </Tag>
          )}
        </Space>
      }
      extra={
        view.canEdit && view.started ? (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              setError(null);
              setDraft({ text: "", inspectorUserId: null });
            }}
          >
            {m.add}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" className="mb-2 block text-xs">
        {m.hint}
      </Text>
      {error && !draft && !check && (
        <Alert className="mb-2" type="error" showIcon title={error} />
      )}

      <div className="mb-2">
        <Text strong className="text-xs">
          {m.system}
        </Text>
        {view.checks.map((item) => (
          <div key={item.key} className="flex items-start gap-2 text-sm">
            {item.ok ? (
              <CheckCircleTwoTone twoToneColor="#52c41a" />
            ) : (
              <CloseCircleTwoTone twoToneColor="#ff4d4f" />
            )}
            <span>
              {item.label}
              {item.detail && (
                <Text type="danger" className="ml-1 text-xs">
                  ({item.detail})
                </Text>
              )}
            </span>
          </div>
        ))}
      </div>

      {!view.started ? (
        view.canEdit ? (
          <Button
            size="small"
            loading={busy}
            onClick={() => void call(`${base}/start`, { method: "POST" })}
          >
            {m.start}
          </Button>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={m.notStarted}
          />
        )
      ) : (
        <>
          <Text strong className="text-xs">
            {m.lines(readiness.passed, readiness.total)}
          </Text>
          <div className="divide-y">
            {view.lines.map((line) => (
              <div key={line.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Tag color={m.resultColor[line.result ?? "none"]}>
                      {m.result[line.result ?? "none"]}
                    </Tag>
                    {line.text}
                  </div>
                  <Space size={0} wrap>
                    {line.mayCheck && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => {
                          setError(null);
                          setCheck({
                            line,
                            result: line.result === "fail" ? "fail" : "pass",
                            on: dayjs(),
                            note: "",
                          });
                        }}
                      >
                        {m.check}
                      </Button>
                    )}
                    {view.canEdit && (
                      <>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => {
                            setError(null);
                            setDraft({
                              id: line.id,
                              text: line.text,
                              inspectorUserId: line.inspectorUserId,
                            });
                          }}
                        >
                          {m.edit}
                        </Button>
                        <Popconfirm
                          title={m.removeConfirm}
                          onConfirm={() =>
                            void call(`${base}/${line.id}`, {
                              method: "DELETE",
                            })
                          }
                        >
                          <Button size="small" type="link" danger>
                            {m.remove}
                          </Button>
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                </div>
                <Text type="secondary" className="block text-xs">
                  {line.inspectorName
                    ? m.inspector(line.inspectorName)
                    : m.noInspector}
                  {line.checkedOn &&
                    ` · ${m.checked(
                      line.checkedByName ?? "",
                      dayjs(line.checkedOn).format("D MMM YY"),
                    )}`}
                </Text>
                {line.note && (
                  <div className="text-xs whitespace-pre-line">{line.note}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={draft !== null}
        title={draft?.id ? m.form.editTitle : m.form.addTitle}
        onCancel={() => setDraft(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={async () => {
          if (!draft) return;
          const ok = await call(draft.id ? `${base}/${draft.id}` : base, {
            method: draft.id ? "PATCH" : "POST",
            body: JSON.stringify({
              text: draft.text,
              inspector_user_id: draft.inspectorUserId ?? "",
            }),
          });
          if (ok) setDraft(null);
        }}
        destroyOnHidden
      >
        {draft && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <label className="block text-xs">
              {m.form.text}
              <Input.TextArea
                rows={2}
                maxLength={1000}
                value={draft.text}
                onChange={(event) =>
                  setDraft({ ...draft, text: event.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              {m.form.inspector}
              <SearchSelect
                className="w-full"
                allowClear
                value={draft.inspectorUserId ?? undefined}
                onChange={(value?: string) =>
                  setDraft({ ...draft, inspectorUserId: value ?? null })
                }
                options={pickable.map((person) => ({
                  value: person.id,
                  label: person.name,
                }))}
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={check !== null}
        title={m.form.checkTitle(check?.line.text ?? "")}
        onCancel={() => setCheck(null)}
        okText={m.form.save}
        cancelText={m.form.close}
        confirmLoading={busy}
        onOk={async () => {
          if (!check) return;
          const ok = await call(`${base}/${check.line.id}/check`, {
            method: "POST",
            body: JSON.stringify({
              result: check.result,
              checked_on: check.on?.format("YYYY-MM-DD"),
              note: check.note,
            }),
          });
          if (ok) setCheck(null);
        }}
        destroyOnHidden
      >
        {check && (
          <div className="space-y-3">
            {error && <Alert type="error" showIcon title={error} />}
            <Radio.Group
              value={check.result}
              onChange={(event) =>
                setCheck({
                  ...check,
                  result: event.target.value as "pass" | "fail",
                })
              }
              options={[
                { value: "pass", label: m.result.pass },
                { value: "fail", label: m.result.fail },
              ]}
            />
            <label className="block text-xs">
              {m.form.on}
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY"
                value={check.on}
                disabledDate={(value) => value.isAfter(dayjs(), "day")}
                onChange={(value) => setCheck({ ...check, on: value })}
              />
            </label>
            <label className="block text-xs">
              {m.form.note}
              <Input.TextArea
                rows={3}
                maxLength={2000}
                value={check.note}
                onChange={(event) =>
                  setCheck({ ...check, note: event.target.value })
                }
              />
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}
