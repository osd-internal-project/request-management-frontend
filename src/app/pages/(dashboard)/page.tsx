import { Alert, Button } from "antd";
import Link from "next/link";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { MyWork, type WorkTab } from "@/components/my-work";
import { PendingAssignment } from "@/components/pending-assignment";
import requests from "@/lib/api/requests";

import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { can, getSession } from "@/lib/session";

/**
 * §16 หน้าที่ 2 — งานค้างของฉัน. The landing page after login.
 *
 * Two tabs across every request type (REQ-08). Rows are filtered by data scope
 * at the backend, so this page renders whatever it is given without deciding
 * visibility itself (SCOPE-02).
 */
/**
 * One tab, from one result.
 *
 * The count comes from the envelope's `total`, not from how many rows arrived:
 * the page asks for 100, and a queue longer than that would otherwise label
 * itself `100` for ever.
 *
 * A failed call yields an empty tab reading zero — the error banner above the
 * tabs is what says the page is broken, and a tab that renders nothing at all
 * would make three working tabs look like a crash.
 */
function toTab(
  result: Awaited<ReturnType<typeof requests.getRequests>>,
): WorkTab {
  return result.ok
    ? { rows: result.data.data, total: result.data.total }
    : { rows: [], total: 0 };
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    type_code?: string;
    q?: string;
    overdue?: string;
  }>;
}) {
  const session = await getSession();
  const query = await searchParams;

  const filters = {
    status: query.status,
    typeCode: query.type_code,
    q: query.q,
    overdue: query.overdue === "true",
  };

  // AUTH-04: someone not yet placed in the org chart has no supervisor, so
  // there is no step-1 approver and nothing they submit could route.
  if (session?.user.pending_org_assignment) {
    return <PendingAssignment />;
  }

  /**
   * Four tabs, four queries, each narrowing what the caller may already see.
   *
   * `involved` rather than no view at all: the default also covers the groups
   * this person heads, and a head's own queue should not fill with their
   * department's work — that is what "งานทั้งหมด" is for.
   *
   * Filters go to the server rather than being applied to the fetched page:
   * a list can run past one page, and narrowing it in the browser would report
   * "nothing found" for matches sitting on the next one.
   */
  const filterArgs = {
    status: filters.status,
    type_code: filters.typeCode,
    q: filters.q,
    overdue: filters.overdue,
    page_size: 100,
  };

  /*
    "A page must not fetch what its viewer cannot read." Somebody without
    `approval.decide` can never be named on a step, so the อนุมัติ query is a
    guaranteed empty result and the tab a guaranteed `· 0` — which reads as a
    page that failed to load. Skipped, and the tab hidden with it.
  */
  const decides = can(session, "approval.decide");

  const [
    involvedResult,
    createdResult,
    incomingResult,
    approverResult,
    typesResult,
    awaitingResult,
  ] =
    await Promise.all([
      requests.getRequests({ ...filterArgs, view: "involved" }),
      requests.getRequests({ ...filterArgs, view: "created" }),
      requests.getRequests({ ...filterArgs, view: "incoming" }),
      decides ? requests.getRequests({ ...filterArgs, view: "approver" }) : null,
      requests.getRequestTypes(),
      /*
        The badge count, unfiltered on purpose: "you owe three decisions" must
        not change because somebody narrowed the table to one request type.
      */
      decides ? requests.myWorkViews.awaiting() : null,
    ]);

  const failed = [
    involvedResult,
    createdResult,
    incomingResult,
    approverResult,
  ].find((result) => result !== null && !result.ok);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Title level={4} className="mb-0!">
            {messages.myWork.title}
          </Title>
          {/* SCOPE-02: the row set is the backend's decision. Said here so a
              short list reads as the truth rather than as a broken page. */}
          <Text type="secondary" className="text-xs">
            {messages.myWork.scopeNote}
          </Text>
        </div>
        <Link href={ROUTES.newRequest}>
          <Button type="primary">{messages.myWork.newRequest}</Button>
        </Link>
      </div>

      {failed && !failed.ok && (
        <Alert
          type="error"
          showIcon
          title={messages.common.loadError}
          description={failed.error.message}
        />
      )}

      <MyWork
        involved={toTab(involvedResult)}
        created={toTab(createdResult)}
        incoming={toTab(incomingResult)}
        approver={approverResult ? toTab(approverResult) : null}
        awaiting={awaitingResult?.ok ? awaitingResult.data.total : 0}
        filters={filters}
        types={typesResult.ok ? typesResult.data : []}
        session={session}
      />
    </div>
  );
}
