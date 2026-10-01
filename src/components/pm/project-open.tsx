"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Input } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type { OpenableContract, ProjectPreview } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ProjectBaselineView } from "./project-baseline";
import {
  ProjectTeamFields,
  teamPayload,
  type TeamRow,
} from "./project-team-fields";

const m = messages.projects.openPage;

/**
 * CD-175 เปิดโครงการ — pick a signed contract, see what will be copied in
 * (and what is missing), name the manager and the team, open.
 */
export function ProjectOpen({
  contracts,
  preview,
  people,
  currentUserId,
}: {
  readonly contracts: OpenableContract[];
  /** The chosen contract's preview; null when none is chosen. */
  readonly preview: ProjectPreview | null;
  readonly people: { id: string; name: string }[];
  readonly currentUserId: string | null;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState<string | undefined>(
    currentUserId ?? undefined,
  );
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = preview?.contract.id;
  // the chosen contract may not be in the list (already opened, not signed)
  const options = [
    ...contracts.map((row) => ({
      value: row.id,
      label: `${row.contractNo} · ${row.title} · ${row.party}`,
    })),
    ...(preview && !contracts.some((row) => row.id === chosen)
      ? [
          {
            value: preview.contract.id,
            label: `${preview.contract.contractNo} · ${preview.contract.title}`,
          },
        ]
      : []),
  ];

  async function open() {
    if (!preview) return;
    if (!managerId) {
      setError(m.managerRequired);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await appApi<{ id: string; projectNo: string }>("projects", {
      method: "POST",
      body: JSON.stringify({
        contract_id: preview.contract.id,
        manager_user_id: managerId,
        name: name.trim() || undefined,
        members: teamPayload(team),
        note: note.trim() || undefined,
      }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(m.opened(result.data.projectNo));
    router.push(ROUTES.projectDetail(result.data.id));
  }

  return (
    <div className="space-y-4">
      <Link href={ROUTES.projects} className="text-sm">
        ← {m.back}
      </Link>
      <div>
        <Title level={4} className="mb-0!">
          {m.title}
        </Title>
        <Text type="secondary">{m.subtitle}</Text>
      </div>

      <Card size="small">
        <label className="block text-xs">
          {m.contract}
          <SearchSelect
            className="w-full"
            placeholder={m.contractPlaceholder}
            value={chosen}
            onChange={(id: string) => router.push(ROUTES.projectOpen(id))}
            options={options}
            notFoundContent={m.noContracts}
          />
        </label>
        {!contracts.length && !preview && (
          <Alert className="mt-3" type="info" showIcon title={m.noContracts} />
        )}
      </Card>

      {preview && (
        <>
          {!preview.canOpen && (
            <Alert
              type="error"
              showIcon
              title={m.cannotOpen}
              description={
                <ul className="mb-0 list-disc pl-5">
                  {preview.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              }
              action={
                preview.project ? (
                  <Link href={ROUTES.projectDetail(preview.project.id)}>
                    {preview.project.projectNo}
                  </Link>
                ) : undefined
              }
            />
          )}
          {preview.canOpen && preview.missing.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title={m.missingTitle}
              description={
                <ul className="mb-0 list-disc pl-5">
                  {preview.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              }
            />
          )}

          <Card size="small" title={m.preview}>
            <div className="mb-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                {preview.baseline.contract.contractNo} ·{" "}
                {preview.baseline.contract.party}
              </span>
              <span>
                {formatAmount(preview.baseline.contract.value)}{" "}
                {preview.baseline.contract.currency}
              </span>
              {preview.baseline.contract.signedOn && (
                <span>
                  {messages.contracts.signed.signedOn(
                    dayjs(preview.baseline.contract.signedOn).format(
                      "D MMM YYYY",
                    ),
                  )}
                </span>
              )}
              {preview.baseline.solution && (
                <span>
                  {messages.projects.detail.solution(
                    preview.baseline.solution.title,
                    preview.baseline.solution.versionNo,
                  )}
                </span>
              )}
            </div>
            <ProjectBaselineView baseline={preview.baseline} />
          </Card>

          {preview.canOpen && (
            <Card size="small">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block text-xs">
                  {m.name}
                  <Input
                    value={name}
                    maxLength={255}
                    placeholder={`${m.namePlaceholder}: ${preview.contract.title}`}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="block text-xs">
                  {m.manager}
                  <SearchSelect
                    className="w-full"
                    value={managerId}
                    onChange={(id: string) => {
                      setManagerId(id);
                      setTeam(team.filter((row) => row.userId !== id));
                    }}
                    options={people.map((person) => ({
                      value: person.id,
                      label: person.name,
                    }))}
                  />
                </label>
              </div>
              <div className="mt-3 text-xs">{m.team}</div>
              <ProjectTeamFields
                rows={team}
                onChange={setTeam}
                people={people}
                exclude={managerId}
              />
              <label className="mt-3 block text-xs">
                {m.note}
                <Input.TextArea
                  rows={2}
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              {error && (
                <Alert className="mt-3" type="error" showIcon title={error} />
              )}
              <div className="mt-3 flex justify-end">
                <Button
                  type="primary"
                  loading={busy}
                  onClick={() => void open()}
                >
                  {m.submit}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
