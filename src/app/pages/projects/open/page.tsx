import { redirect } from "next/navigation";
import { ProjectOpen } from "@/components/pm/project-open";
import { getOpenableContracts, getProjectPreview } from "@/lib/api/projects";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/** CD-175 เปิดโครงการ (`pm.project.manage`). `?contract=` picks one. */
export default async function ProjectOpenPage({
  searchParams,
}: {
  searchParams: Promise<{ contract?: string }>;
}) {
  const session = await getSession();
  if (!can(session, "pm.project.manage")) redirect(ROUTES.projects);

  const { contract } = await searchParams;
  const [contracts, preview, users] = await Promise.all([
    getOpenableContracts(),
    contract ? getProjectPreview(contract) : Promise.resolve(null),
    can(session, "user.read") ? getAllDirectoryUsers() : Promise.resolve(null),
  ]);

  return (
    <ProjectOpen
      contracts={contracts.ok ? contracts.data : []}
      preview={preview?.ok ? preview.data : null}
      people={(users?.ok ? users.data : []).map((user) => ({
        id: user.id,
        name: user.displayName,
      }))}
      currentUserId={session?.user.id ?? null}
    />
  );
}
