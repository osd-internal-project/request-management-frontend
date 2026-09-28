/** Tag colour per `RequestStatus` — the one map every request screen reads. */
export const STATUS_COLOR: Record<string, string> = {
  draft: "default",
  submitted: "blue",
  pending_approval: "gold",
  returned: "orange",
  approved: "green",
  rejected: "red",
  in_progress: "cyan",
  on_hold: "purple",
  completed: "green",
  closed: "geekblue",
  cancelled: "default",
};
