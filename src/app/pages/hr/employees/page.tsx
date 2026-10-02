import { redirect } from "next/navigation";
import { EmployeesRegister } from "@/components/hr/employees-register";
import { HOME_PATH } from "@/lib/routes";
import { can, canAny, getSession } from "@/lib/session";

/** CD-229 — ทะเบียนพนักงาน. */
export default async function EmployeesPage() {
  const session = await getSession();
  if (!canAny(session, ["hr.employee.read", "hr.employee.manage"])) {
    redirect(HOME_PATH);
  }
  return <EmployeesRegister canManage={can(session, "hr.employee.manage")} />;
}
