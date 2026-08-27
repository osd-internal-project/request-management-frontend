import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/routes";

/**
 * `/pages/requests` is not a screen.
 *
 * §16 has "งานค้างของฉัน" as the landing page and the menu points at
 * `HOME_PATH`; this route existed only as a placeholder and showed an empty
 * shell to anyone who reached it from a bookmark or a pasted link.
 */
export default function RequestsIndexPage() {
  redirect(HOME_PATH);
}
