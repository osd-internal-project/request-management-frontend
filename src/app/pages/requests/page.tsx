import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/routes";

/**
 * `/pages/requests` is not a screen.
 *
 * §16 has "งานค้างของฉัน" as the landing page and the menu points at
 * `HOME_PATH`; this route existed only as a placeholder and showed an empty
 * shell to anyone who reached it from a bookmark or a pasted link.
 *
 * It briefly held a scope-wide request list. That list now lives in the landing
 * page's first tab, which shows exactly what the viewer's data scope allows —
 * two screens answering the same question was one too many. `/pages/requests/[id]`
 * is a separate route and is unaffected.
 */
export default function RequestsIndexPage() {
  redirect(HOME_PATH);
}
