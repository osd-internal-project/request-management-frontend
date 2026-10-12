import type { Session } from "@/lib/session-shape";
import { can } from "@/lib/session-shape";

/**
 * The route permission behind each action, matching `ACTION_PERMISSIONS` on the
 * backend. `available_actions` answers authority over the row; this answers the role.
 */
export const ACTION_PERMISSION: Readonly<Record<string, string>> = {
  submit: "request.create",
  resubmit: "request.create",
  close: "request.create",
  create_child: "request.create",
  receive: "request.complete",
  assign: "request.complete",
  complete: "request.complete",
  // Missing until 12 ต.ค. 2569: every v2 step's forward button was filtered out here.
  advance: "request.complete",
  comment: "request.read",
  hold: "request.hold",
  resume: "request.hold",
  return: "request.return",
  approve: "approval.decide",
  reject: "approval.decide",
  send_back: "approval.decide",
  cancel: "request.cancel.own",
};

/** The actions this person may both perform (role) and perform here (authority). */
export function offeredActions(
  available: readonly string[] | undefined,
  session: Session | null,
): ReadonlySet<string> {
  return new Set(
    (available ?? []).filter((action) => {
      const permission = ACTION_PERMISSION[action];
      return permission !== undefined && can(session, permission);
    }),
  );
}
