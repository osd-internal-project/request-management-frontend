import { Alert, Button } from "antd";
import Link from "next/link";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { MyWork } from "@/components/my-work";
import { PendingAssignment } from "@/components/pending-assignment";
import requests from "@/lib/api/requests";
import approvals from "@/lib/api/approvals";

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

  // `GET /approvals/inbox` requires `approval.decide`. This page is the landing
  // page for *every* role, so calling it unconditionally sent a plain employee
  // a guaranteed 403 on every page view — and put the error in the alert below.
  // The menu cannot cover this: it gates links, not the data a shared page fetches.
  const canDecide = can(session, "approval.decide");

  /**
   * The first tab asks for **no `view`**, so `buildScopeWhere` decides which
   * rows come back (SCOPE-02).
   *
   * It used to send `view=mine`, which pins `requesterId` to the caller and
   * therefore overrides the scope entirely: an administrator scoped to the whole
   * company saw an empty page while every one of those rows was already visible
   * to them at the API.
   *
   * Filters go to the server for the same reason — the scope list can run past
   * one page, and narrowing the fetched page in the browser would report
   * "nothing found" for matches sitting on the next one.
   */
  const [mineResult, involvedResult, incomingResult, inboxResult, typesResult] =
    await Promise.all([
      requests.getRequests({
        status: filters.status,
        type_code: filters.typeCode,
        q: filters.q,
        overdue: filters.overdue,
        page_size: 100,
      }),
      requests.getInvolvedRequests(100),
      requests.getIncomingRequests(100),
      canDecide ? approvals.getApprovalsInbox({ page_size: 100 }) : null,
      requests.getRequestTypes(),
    ]);

  const mine = mineResult.ok ? mineResult.data.data : [];

  /**
   * The "รออนุมัติของฉัน" tab means *waiting on me*, which only the approval
   * inbox knows — `view=involved` also returns work further down a chain I am
   * on but not yet responsible for. Intersecting the two keeps the tab honest.
   */
  // Empty for someone who cannot decide, which is the truthful answer rather
  // than a swallowed error: nothing can be waiting on an approval they are not
  // able to give.
  const waitingOnMe = new Set(
    (inboxResult?.ok ? inboxResult.data.data : [])
      .map((approvalCase) => approvalCase.requestId)
      .filter((id): id is string => Boolean(id)),
  );

  // Not named `approvals`: that is the imported API module, and shadowing it
  // here made the module unreachable at the call above.
  const waitingRows = (
    involvedResult.ok ? involvedResult.data.data : []
  ).filter((row) => waitingOnMe.has(row.id));

  // A skipped inbox is not a failure — without this the alert fires for every
  // employee on every load and stops meaning "something went wrong".
  const failed = [mineResult, involvedResult, inboxResult].find(
    (result) => result !== null && !result.ok,
  );

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
            {messages.myWork.scopeNote[session?.scopes.request ?? "own"] ?? ""}
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
        mine={mine}
        approvals={waitingRows}
        showApprovals={canDecide}
        incoming={incomingResult.ok ? incomingResult.data.data : []}
        scope={session?.scopes.request ?? "own"}
        filters={filters}
        types={typesResult.ok ? typesResult.data : []}
      />
    </div>
  );
}
