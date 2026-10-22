import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** กุญแจ API ย้ายไปอยู่ใต้ระบบภายนอกแต่ละระบบ (22 ต.ค. 2569). */
export default function AdminApiKeysPage() {
  redirect(ROUTES.adminIntegrations);
}
