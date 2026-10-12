"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Input, Skeleton, Space, Tag } from "antd";
import { CheckCircleTwoTone, CloseCircleTwoTone } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";

const m = messages.delivery.handover.tech;

export interface TechPackage {
  complete: boolean;
  gaps: string[];
  canWrite: boolean;
  asBuilt: {
    complete: boolean;
    missingDocuments: string[];
    openDeviations: string[];
  };
  configs: { count: number; systems: string[] };
  integrations: {
    label: string;
    name: string;
    targetSystem: string;
    hasContact: boolean;
  }[];
  cautions: {
    text: string;
    updatedAt: string;
    updatedByName: string | null;
  } | null;
}

/** What a handover kept of the package when it was sent. */
export interface TechSnapshot {
  configItems: number;
  systems: string[];
  integrations: string[];
  cautions: string;
}

const Mark = ({ ok }: { ok: boolean }) =>
  ok ? (
    <CheckCircleTwoTone twoToneColor="#52c41a" />
  ) : (
    <CloseCircleTwoTone twoToneColor="#ff4d4f" />
  );

/**
 * CD-227 — the engineers' part of the handover to service: as-built,
 * configuration, integrations and the cautions the project team writes.
 * Reports whether it is complete, so the handover can wait for it.
 */
export function TechPackageSection({
  projectId,
  onLoaded,
}: {
  projectId: string;
  onLoaded: (pack: TechPackage | null) => void;
}) {
  const { message } = App.useApp();
  const [pack, setPack] = useState<TechPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `delivery/projects/${projectId}/tech-package`;

  useEffect(() => {
    let live = true;
    void appApi<TechPackage>(base).then((result) => {
      if (!live) return;
      if (result.ok) {
        setPack(result.data);
        onLoaded(result.data);
      } else {
        setError(result.message);
        onLoaded(null);
      }
    });
    return () => {
      live = false;
    };
  }, [base, onLoaded]);

  async function save() {
    if (draft === null) return;
    setBusy(true);
    const result = await appApi<TechPackage>(`${base}/cautions`, {
      method: "PUT",
      body: JSON.stringify({ cautions: draft }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setPack(result.data);
    onLoaded(result.data);
    setDraft(null);
    void message.success(m.saved);
  }

  if (!pack && !error) return <Skeleton active paragraph={{ rows: 2 }} />;

  return (
    <div className="mb-3 rounded border border-gray-200 p-2">
      <Space size={4} wrap className="mb-1">
        <Text strong>{m.title}</Text>
        {pack && (
          <Tag color={pack.complete ? "success" : "warning"}>
            {pack.complete ? m.complete : m.incomplete(pack.gaps.length)}
          </Tag>
        )}
      </Space>
      {error && <Alert className="mb-2" type="error" showIcon title={error} />}
      {pack && (
        <>
          <div className="space-y-0.5 text-sm">
            <div className="flex items-start gap-2">
              <Mark ok={pack.asBuilt.complete} />
              <span>
                {m.asBuilt}
                {pack.asBuilt.complete && (
                  <Text type="secondary" className="ml-1 text-xs">
                    {m.asBuiltOk}
                  </Text>
                )}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Mark ok={pack.configs.count > 0} />
              <span>
                {m.configs(pack.configs.count, pack.configs.systems.join(", "))}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Mark ok={pack.integrations.every((row) => row.hasContact)} />
              <span>
                {pack.integrations.length
                  ? m.integrations(pack.integrations.length)
                  : m.noIntegrations}
                {pack.integrations
                  .filter((row) => !row.hasContact)
                  .map((row) => (
                    <Tag key={row.label} color="red" className="ml-1">
                      {row.label} {row.name}: {m.noContact}
                    </Tag>
                  ))}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Mark ok={Boolean(pack.cautions?.text.trim())} />
              <span className="min-w-0 flex-1">
                {m.cautions}
                {pack.cautions ? (
                  <>
                    <div className="text-xs whitespace-pre-line">
                      {pack.cautions.text}
                    </div>
                    <Text type="secondary" className="block text-xs">
                      {m.cautionsBy(
                        pack.cautions.updatedByName ?? "—",
                        dayjs(pack.cautions.updatedAt).format("D MMM YY HH:mm"),
                      )}
                    </Text>
                  </>
                ) : (
                  <Text type="secondary" className="ml-1 text-xs">
                    {m.cautionsEmpty}
                  </Text>
                )}
              </span>
              {pack.canWrite && draft === null && (
                <Button
                  size="small"
                  type="link"
                  onClick={() => setDraft(pack.cautions?.text ?? "")}
                >
                  {m.edit}
                </Button>
              )}
            </div>
          </div>
          {draft !== null && (
            <div className="mt-2">
              <Text type="secondary" className="mb-1 block text-xs">
                {m.cautionsHint}
              </Text>
              <Input.TextArea
                autoSize={{ minRows: 3 }}
                maxLength={4000}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Space className="mt-1">
                <Button
                  size="small"
                  type="primary"
                  loading={busy}
                  disabled={!draft.trim()}
                  onClick={() => void save()}
                >
                  {m.save}
                </Button>
                <Button size="small" onClick={() => setDraft(null)}>
                  {m.cancel}
                </Button>
              </Space>
            </div>
          )}
          {pack.gaps.length > 0 && (
            <Alert
              className="mt-2"
              type="warning"
              showIcon
              title={m.gapsTitle}
              description={
                <ul className="mb-0 list-disc pl-5 text-xs">
                  {pack.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              }
            />
          )}
        </>
      )}
    </div>
  );
}

/** The package as it was sent, for whoever reads the handover. */
export function TechSnapshotView({ snapshot }: { snapshot: TechSnapshot }) {
  return (
    <div className="text-xs">
      <Text strong className="block text-xs">
        {m.sentTitle}
      </Text>
      <div>{m.configs(snapshot.configItems, snapshot.systems.join(", "))}</div>
      {snapshot.integrations.length > 0 && (
        <div>{snapshot.integrations.join(" · ")}</div>
      )}
      {snapshot.cautions && (
        <div className="whitespace-pre-line">
          {m.cautions}: {snapshot.cautions}
        </div>
      )}
    </div>
  );
}
