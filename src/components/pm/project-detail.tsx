"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Tag,
} from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { formatAmount } from "@/components/crm/opportunities/opportunity-list";
import { SearchSelect } from "@/components/ui/search-select";
import { appApi } from "@/lib/api/client";
import type {
  ProjectDetail,
  ProjectMilestonesView,
  ProjectPlanView,
  ProjectProgressView,
  ProjectBudgetView,
  ProjectChangesView,
  ProjectRisksView,
  ProjectIssuesView,
  CustomerLogsView,
  ProjectPaymentsView,
  ProjectCloseoutView,
  StatusReportsView,
  ProjectTestsView,
  ProjectReadinessView,
  ProjectAsBuiltView,
  ProjectAcceptancesView,
  ProjectUatView,
  ProjectInstallationsView,
  ProjectDesignsView,
  ProjectTechPlanView,
  ProjectSurveysView,
  ProjectDevPlanView,
  ProjectDefectsView,
  ProjectReleasesView,
  ProjectSoftwareDocsView,
  ProjectConfigsView,
  ProjectIntegrationsView,
  ProjectTechChangesView,
  ProjectCostsView,
  ProjectResourcesView,
} from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { ProjectBaselineView } from "./project-baseline";
import { ProjectMilestonesCard } from "./project-milestones-card";
import { ProjectPlanCard } from "./project-plan-card";
import { ProjectProgressCard } from "./project-progress-card";
import { ProjectBudgetCard } from "./project-budget-card";
import { ProjectChangesCard } from "./project-changes-card";
import { ProjectRisksCard } from "./project-risks-card";
import { ProjectIssuesCard } from "./project-issues-card";
import { CustomerLogsCard } from "./customer-logs-card";
import { ProjectPaymentsCard } from "./project-payments-card";
import { ProjectCloseoutCard } from "./project-closeout-card";
import { ProjectStatusCard } from "./project-status-card";
import { ProjectTestsCard } from "./project-tests-card";
import { ProjectReadinessCard } from "./project-readiness-card";
import { ProjectDeliveryCard } from "@/components/delivery/project-delivery-card";
import { DeliveryDocsCard } from "@/components/delivery/delivery-docs-card";
import { ProjectAsBuiltCard } from "./project-as-built-card";
import { ProjectAcceptanceCard } from "./project-acceptance-card";
import { ProjectUatCard } from "./project-uat-card";
import { ProjectInstallationsCard } from "./project-installations-card";
import { ProjectDesignsCard } from "./project-designs-card";
import { ProjectTechPlanCard } from "./project-tech-plan-card";
import { ProjectSurveysCard } from "./project-surveys-card";
import { ProjectDevPlanCard } from "./project-dev-plan-card";
import { ProjectDefectsCard } from "./project-defects-card";
import { ProjectReleasesCard } from "./project-releases-card";
import { ProjectSoftwareDocsCard } from "./project-software-docs-card";
import { ProjectConfigsCard } from "./project-configs-card";
import { ProjectIntegrationsCard } from "./project-integrations-card";
import { ProjectTechChangesCard } from "./project-tech-changes-card";
import { ProjectCostsCard } from "./project-costs-card";
import { ProjectResourcesCard } from "./project-resources-card";
import {
  ProjectTeamFields,
  teamPayload,
  type TeamRow,
} from "./project-team-fields";

const m = messages.projects;
const md = m.detail;

/**
 * CD-175 — one project: where it came from, who runs it and who is on it,
 * and what was sold (the baseline copied when it opened).
 */
export function ProjectDetailView({
  project,
  milestones,
  plan,
  progress,
  budget,
  changes,
  risks,
  issues,
  customerLogs,
  payments,
  closeout,
  statusReports,
  tests,
  readiness,
  asBuilt,
  acceptances,
  uat,
  installations,
  designs,
  techPlan,
  surveys,
  devPlan,
  defects,
  releases,
  softwareDocs,
  configs,
  integrations,
  techChanges,
  costs,
  resources,
  currentUserId,
  people,
}: {
  readonly project: ProjectDetail;
  /** CD-182 — null = could not load. */
  readonly milestones: ProjectMilestonesView | null;
  /** CD-177 — null = could not load. */
  readonly plan: ProjectPlanView | null;
  /** CD-188 — null = could not load. */
  readonly progress: ProjectProgressView | null;
  /** CD-179 — null = could not load. */
  readonly budget: ProjectBudgetView | null;
  /** CD-185 — null = could not load. */
  readonly changes: ProjectChangesView | null;
  /** CD-183 — null = could not load. */
  readonly risks: ProjectRisksView | null;
  /** CD-184 — null = could not load. */
  readonly issues: ProjectIssuesView | null;
  /** CD-186 — null = could not load. */
  readonly customerLogs: CustomerLogsView | null;
  /** CD-193 — null = could not load. */
  readonly payments: ProjectPaymentsView | null;
  /** CD-191 — null = could not load. */
  readonly closeout: ProjectCloseoutView | null;
  /** CD-192 — null = could not load. */
  readonly statusReports: StatusReportsView | null;
  /** CD-221 — null = could not load. */
  readonly tests: ProjectTestsView | null;
  /** CD-225 — null = could not load. */
  readonly readiness: ProjectReadinessView | null;
  /** CD-226 — null = could not load. */
  readonly asBuilt: ProjectAsBuiltView | null;
  /** CD-189 — null = could not load. */
  readonly acceptances: ProjectAcceptancesView | null;
  /** CD-222 — null = could not load. */
  readonly uat: ProjectUatView | null;
  /** CD-216 — null = could not load. */
  readonly installations: ProjectInstallationsView | null;
  /** CD-211 — null = could not load. */
  readonly designs: ProjectDesignsView | null;
  /** CD-209 — null = could not load. */
  readonly techPlan: ProjectTechPlanView | null;
  readonly surveys: ProjectSurveysView | null;
  readonly devPlan: ProjectDevPlanView | null;
  readonly defects: ProjectDefectsView | null;
  readonly releases: ProjectReleasesView | null;
  readonly softwareDocs: ProjectSoftwareDocsView | null;
  readonly configs: ProjectConfigsView | null;
  readonly integrations: ProjectIntegrationsView | null;
  readonly techChanges: ProjectTechChangesView | null;
  readonly costs: ProjectCostsView | null;
  readonly resources: ProjectResourcesView | null;
  readonly currentUserId: string | null;
  /** The company's people, for the manager and team pickers. */
  readonly people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [managerId, setManagerId] = useState(project.managerUserId);
  const [note, setNote] = useState(project.note ?? "");
  const [teamOpen, setTeamOpen] = useState(false);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = project.status === "active" || project.status === "on_hold";
  // the pickers need the current people even when the directory is not loaded
  const pickable = [
    ...people,
    ...[
      { id: project.managerUserId, name: project.managerName ?? "" },
      ...project.members.map((member) => ({
        id: member.userId,
        name: member.displayName,
      })),
    ].filter((known) => !people.some((person) => person.id === known.id)),
  ];

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const result = await appApi(`projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    message.success(md.saved);
    router.refresh();
    return true;
  }

  async function saveTeam() {
    setBusy(true);
    setError(null);
    const result = await appApi(`projects/${project.id}/members`, {
      method: "PUT",
      body: JSON.stringify({ members: teamPayload(team) }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    message.success(md.teamSaved);
    setTeamOpen(false);
    router.refresh();
  }

  const contract = project.contract;
  const party = contract.customer ? (
    <Link href={ROUTES.customerDetail(contract.customer.id)}>
      {contract.customer.customerCode} · {contract.customer.nameTh}
    </Link>
  ) : (
    contract.counterpartyName
  );
  const baseline = project.baseline;

  return (
    <div className="space-y-4">
      <Link href={ROUTES.projects} className="text-sm">
        ← {md.back}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Title level={4} className="mb-1!">
            {project.projectNo} · {project.name}
          </Title>
          <Space size={6} wrap>
            <Tag color={m.statusColor[project.status]}>
              {m.status[project.status]}
            </Tag>
            <Text type="secondary" className="text-xs">
              {md.openedBy(
                project.openedByName ?? "—",
                dayjs(project.openedAt).format("D MMM YYYY HH:mm"),
              )}
            </Text>
          </Space>
        </div>
        {project.canManage && running && (
          <Space wrap>
            <Button
              disabled={busy}
              onClick={() =>
                void patch({
                  status: project.status === "active" ? "on_hold" : "active",
                })
              }
            >
              {project.status === "active" ? md.pause : md.resume}
            </Button>
            <Button
              onClick={() => {
                setName(project.name);
                setManagerId(project.managerUserId);
                setNote(project.note ?? "");
                setError(null);
                setEditing(true);
              }}
            >
              {md.edit}
            </Button>
          </Space>
        )}
      </div>

      {error && !editing && !teamOpen && (
        <Alert type="error" showIcon title={error} />
      )}

      <Card size="small">
        <Descriptions
          size="small"
          column={{ xs: 1, md: 2 }}
          items={[
            {
              key: "contract",
              label: md.contract,
              children: (
                <Link href={ROUTES.contractDetail(contract.id)}>
                  {contract.contractNo} · {contract.title}
                </Link>
              ),
            },
            { key: "party", label: md.party, children: party },
            {
              key: "manager",
              label: md.manager,
              children: project.managerName ?? "—",
            },
            {
              key: "period",
              label: md.period,
              children: `${
                project.startOn
                  ? `${dayjs(project.startOn).format("D MMM YYYY")} – `
                  : ""
              }${dayjs(project.endOn).format("D MMM YYYY")}`,
            },
            {
              key: "value",
              label: md.value,
              children: `${formatAmount(project.contractValue)} ${project.currency}`,
            },
            {
              key: "signed",
              label: md.signedOn,
              children: contract.signedOn
                ? `${dayjs(contract.signedOn).format("D MMM YYYY")} · ${
                    messages.contracts.signed.via[contract.signedVia ?? ""] ??
                    ""
                  }`
                : "—",
            },
            ...(project.note
              ? [
                  {
                    key: "note",
                    label: md.note,
                    children: (
                      <span className="whitespace-pre-line">
                        {project.note}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {project.missing.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={md.missing}
          description={
            <ul className="mb-0 list-disc pl-5">
              {project.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          }
        />
      )}

      <Card
        size="small"
        title={`${md.team} · ${project.members.length + 1}`}
        extra={
          project.canEditTeam && running ? (
            <Button
              size="small"
              onClick={() => {
                setTeam(
                  project.members.map((member) => ({
                    userId: member.userId,
                    role: member.role ?? "",
                  })),
                );
                setError(null);
                setTeamOpen(true);
              }}
            >
              {md.editTeam}
            </Button>
          ) : undefined
        }
      >
        <div className="divide-y">
          <div className="flex flex-wrap justify-between gap-2 py-1.5">
            <span className="font-medium">{project.managerName ?? "—"}</span>
            <Tag color="blue">{md.manager}</Tag>
          </div>
          {project.members.map((member) => (
            <div
              key={member.userId}
              className="flex flex-wrap justify-between gap-2 py-1.5"
            >
              <span>{member.displayName}</span>
              <Text type="secondary" className="text-sm">
                {member.role ?? ""}
              </Text>
            </div>
          ))}
        </div>
        {!project.members.length && (
          <Text type="secondary" className="text-sm">
            {md.teamEmpty}
          </Text>
        )}
      </Card>

      {statusReports && (
        <ProjectStatusCard
          key={statusReports.reports
            .map((row) => `${row.id}${row.status}`)
            .join()}
          projectId={project.id}
          view={statusReports}
        />
      )}

      {progress && (
        <ProjectProgressCard projectId={project.id} view={progress} />
      )}

      {milestones && (
        <ProjectMilestonesCard projectId={project.id} view={milestones} />
      )}

      {plan && (
        <ProjectPlanCard
          projectId={project.id}
          view={plan}
          people={pickable}
          changeOptions={(changes?.changes ?? [])
            .filter((row) =>
              ["draft", "submitted", "approved"].includes(row.status),
            )
            .map((row) => ({
              id: row.id,
              label: `${row.label} · ${row.title}`,
            }))}
        />
      )}

      {budget && (
        <ProjectBudgetCard
          key={`${budget.current?.id ?? "none"}-${budget.current?.status ?? ""}`}
          projectId={project.id}
          view={budget}
        />
      )}

      {/* CD-180 — who works on it and when, checked across projects */}
      {resources && (
        <ProjectResourcesCard
          projectId={project.id}
          view={resources}
          people={pickable}
        />
      )}

      {/* CD-190 — actual against the budget above */}
      {costs && <ProjectCostsCard projectId={project.id} view={costs} />}

      {payments && (
        <ProjectPaymentsCard projectId={project.id} view={payments} />
      )}

      {tests && (
        <ProjectTestsCard
          projectId={project.id}
          view={tests}
          people={pickable}
        />
      )}

      {techPlan && (
        <ProjectTechPlanCard
          projectId={project.id}
          view={techPlan}
          people={pickable}
        />
      )}

      {devPlan && (
        <ProjectDevPlanCard
          projectId={project.id}
          view={devPlan}
          people={pickable}
        />
      )}

      {defects && (defects.lines.length > 0 || defects.defects.length > 0) && (
        <ProjectDefectsCard
          projectId={project.id}
          view={defects}
          people={pickable}
        />
      )}

      {/* CD-214 — software projects: once it has environments, or a dev plan */}
      {releases &&
        (releases.environments.length > 0 ||
          (devPlan?.iterations.length ?? 0) > 0) && (
          <ProjectReleasesCard projectId={project.id} view={releases} />
        )}

      {/* CD-215 — the software's as-built, software projects only */}
      {softwareDocs?.software && (
        <ProjectSoftwareDocsCard projectId={project.id} view={softwareDocs} />
      )}

      {/* CD-224 — technical changes, their BOQ, cost and scope impact */}
      {techChanges &&
        (techChanges.changes.length > 0 || techChanges.canWrite) && (
          <ProjectTechChangesCard projectId={project.id} view={techChanges} />
        )}

      {/* CD-219 — the customer's systems the delivery connects to */}
      {integrations &&
        (integrations.integrations.length > 0 || integrations.canWrite) && (
          <ProjectIntegrationsCard projectId={project.id} view={integrations} />
        )}

      {/* CD-217 — configuration as data; shown once there is any, or to the team */}
      {configs && (configs.items.length > 0 || configs.canWrite) && (
        <ProjectConfigsCard projectId={project.id} view={configs} />
      )}

      {surveys && <ProjectSurveysCard projectId={project.id} view={surveys} />}

      {designs && (
        <ProjectDesignsCard
          key={`${designs.openId ?? "none"}-${designs.versions.length}`}
          projectId={project.id}
          view={designs}
        />
      )}

      {installations && (
        <ProjectInstallationsCard projectId={project.id} view={installations} />
      )}

      {uat && (
        <ProjectUatCard projectId={project.id} view={uat} people={pickable} />
      )}

      {asBuilt && <ProjectAsBuiltCard projectId={project.id} view={asBuilt} />}

      {/* CD-250 — the delivery plan (loads itself) */}
      <ProjectDeliveryCard projectId={project.id} />
      {/* CD-251 — each phase's delivery documents (loads itself) */}
      <DeliveryDocsCard projectId={project.id} />

      {readiness && (
        <ProjectReadinessCard
          projectId={project.id}
          view={readiness}
          people={pickable}
        />
      )}

      {acceptances && (
        <ProjectAcceptanceCard
          projectId={project.id}
          view={acceptances}
          people={pickable}
        />
      )}

      {customerLogs && (
        <CustomerLogsCard projectId={project.id} view={customerLogs} />
      )}

      {issues && (
        <ProjectIssuesCard
          projectId={project.id}
          view={issues}
          people={pickable}
          tasks={(plan?.tasks ?? [])
            .filter((task) => !task.summary)
            .map((task) => ({
              id: task.id,
              label: `${task.wbs} ${task.title}`,
            }))}
          currentUserId={currentUserId}
        />
      )}

      {risks && (
        <ProjectRisksCard
          projectId={project.id}
          view={risks}
          people={pickable}
          currentUserId={currentUserId}
        />
      )}

      {changes && <ProjectChangesCard projectId={project.id} view={changes} />}

      {closeout && (
        <ProjectCloseoutCard
          key={`${closeout.closeout?.status ?? "none"}-${closeout.closeout?.summary ?? ""}`}
          projectId={project.id}
          view={closeout}
          currentUserId={currentUserId}
        />
      )}

      <Card size="small" title={md.baseline}>
        <Text type="secondary" className="mb-2 block text-xs">
          {md.baselineHint(
            dayjs(baseline.capturedAt).format("D MMM YYYY HH:mm"),
          )}
        </Text>
        {baseline.solution && (
          <Text className="mb-2 block text-sm">
            {md.solution(baseline.solution.title, baseline.solution.versionNo)}
          </Text>
        )}
        <ProjectBaselineView baseline={baseline} />
      </Card>

      <Modal
        open={editing}
        title={md.editTitle}
        onCancel={() => setEditing(false)}
        okText={md.save}
        cancelText={md.cancel}
        confirmLoading={busy}
        onOk={async () => {
          const ok = await patch({
            name: name.trim(),
            ...(managerId !== project.managerUserId
              ? { manager_user_id: managerId }
              : {}),
            note,
          });
          if (ok) setEditing(false);
        }}
        destroyOnHidden
      >
        <div className="space-y-3">
          {error && <Alert type="error" showIcon title={error} />}
          <label className="block text-xs">
            {m.openPage.name}
            <Input
              value={name}
              maxLength={255}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-xs">
            {md.manager}
            <SearchSelect
              className="w-full"
              value={managerId}
              onChange={(id: string) => setManagerId(id)}
              options={pickable.map((person) => ({
                value: person.id,
                label: person.name,
              }))}
            />
          </label>
          <label className="block text-xs">
            {md.note}
            <Input.TextArea
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={teamOpen}
        title={md.editTeam}
        width={640}
        onCancel={() => setTeamOpen(false)}
        okText={md.save}
        cancelText={md.cancel}
        confirmLoading={busy}
        onOk={() => void saveTeam()}
        destroyOnHidden
      >
        {error && (
          <Alert className="mb-3" type="error" showIcon title={error} />
        )}
        <ProjectTeamFields
          rows={team}
          onChange={setTeam}
          people={pickable}
          exclude={project.managerUserId}
        />
      </Modal>
    </div>
  );
}
