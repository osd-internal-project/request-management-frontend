import { notFound, redirect } from "next/navigation";
import { ProjectDetailView } from "@/components/pm/project-detail";
import {
  getProject,
  getProjectMilestones,
  getProjectPlan,
  getProjectProgress,
  getProjectBudget,
  getProjectChanges,
  getProjectRisks,
  getProjectIssues,
  getCustomerLogs,
  getProjectPayments,
  getProjectCloseout,
  getStatusReports,
  getProjectTests,
  getProjectReadiness,
  getProjectAsBuilt,
  getProjectAcceptances,
  getProjectUat,
  getProjectInstallations,
  getProjectDesigns,
  getProjectTechPlan,
  getProjectSurveys,
  getProjectDevPlan,
  getProjectDefects,
  getProjectReleases,
  getProjectSoftwareDocs,
  getProjectConfigs,
  getProjectIntegrations,
  getProjectTechChanges,
  getProjectCosts,
  getProjectResources,
} from "@/lib/api/projects";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { HOME_PATH } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * CD-175 — one project. One the viewer may not see answers 404, the same as
 * one that does not exist (SCOPE-03).
 */
export default async function ProjectPage({ params }: Params) {
  const session = await getSession();
  if (!can(session, "notification.read")) redirect(HOME_PATH);

  const { id } = await params;
  const result = await getProject(id);
  if (!result.ok) notFound();
  const project = result.data;
  // CD-182 — whoever sees the project sees its milestones
  // CD-177 — and its plan
  const [
    milestones,
    plan,
    progress,
    budget,
    changes,
    risks,
    issues,
    logs,
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
  ] = await Promise.all([
    getProjectMilestones(id),
    getProjectPlan(id),
    // CD-188
    getProjectProgress(id),
    // CD-179
    getProjectBudget(id),
    // CD-185
    getProjectChanges(id),
    // CD-183
    getProjectRisks(id),
    // CD-184
    getProjectIssues(id),
    // CD-186
    getCustomerLogs(id),
    // CD-193
    getProjectPayments(id),
    // CD-191
    getProjectCloseout(id),
    // CD-192
    getStatusReports(id),
    // CD-221
    getProjectTests(id),
    // CD-225
    getProjectReadiness(id),
    // CD-226
    getProjectAsBuilt(id),
    // CD-189
    getProjectAcceptances(id),
    // CD-222
    getProjectUat(id),
    // CD-216
    getProjectInstallations(id),
    // CD-211
    getProjectDesigns(id),
    // CD-209
    getProjectTechPlan(id),
    // CD-210
    getProjectSurveys(id),
    // CD-212
    getProjectDevPlan(id),
    // CD-213
    getProjectDefects(id),
    // CD-214
    getProjectReleases(id),
    // CD-215
    getProjectSoftwareDocs(id),
    // CD-217
    getProjectConfigs(id),
    // CD-219
    getProjectIntegrations(id),
    // CD-224
    getProjectTechChanges(id),
    // CD-190
    getProjectCosts(id),
    // CD-180
    getProjectResources(id),
  ]);
  // the pickers only for who may change the manager or the team
  const users =
    (project.canManage || project.canEditTeam) && can(session, "user.read")
      ? await getAllDirectoryUsers()
      : null;

  return (
    <ProjectDetailView
      project={project}
      milestones={milestones.ok ? milestones.data : null}
      plan={plan.ok ? plan.data : null}
      progress={progress.ok ? progress.data : null}
      budget={budget.ok ? budget.data : null}
      changes={changes.ok ? changes.data : null}
      risks={risks.ok ? risks.data : null}
      issues={issues.ok ? issues.data : null}
      customerLogs={logs.ok ? logs.data : null}
      payments={payments.ok ? payments.data : null}
      closeout={closeout.ok ? closeout.data : null}
      statusReports={statusReports.ok ? statusReports.data : null}
      tests={tests.ok ? tests.data : null}
      readiness={readiness.ok ? readiness.data : null}
      asBuilt={asBuilt.ok ? asBuilt.data : null}
      acceptances={acceptances.ok ? acceptances.data : null}
      uat={uat.ok ? uat.data : null}
      installations={installations.ok ? installations.data : null}
      designs={designs.ok ? designs.data : null}
      techPlan={techPlan.ok ? techPlan.data : null}
      surveys={surveys.ok ? surveys.data : null}
      devPlan={devPlan.ok ? devPlan.data : null}
      defects={defects.ok ? defects.data : null}
      releases={releases.ok ? releases.data : null}
      softwareDocs={softwareDocs.ok ? softwareDocs.data : null}
      configs={configs.ok ? configs.data : null}
      integrations={integrations.ok ? integrations.data : null}
      techChanges={techChanges.ok ? techChanges.data : null}
      costs={costs.ok ? costs.data : null}
      resources={resources.ok ? resources.data : null}
      currentUserId={session?.user.id ?? null}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
    />
  );
}
