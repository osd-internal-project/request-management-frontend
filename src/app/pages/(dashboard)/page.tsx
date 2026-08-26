import { Alert, Button } from "antd";
import Link from "next/link";
import Title from "antd/es/typography/Title";
import { MyWork } from "@/components/my-work";
import { PendingAssignment } from "@/components/pending-assignment";
import requests from "@/lib/api/requests";
import approvals from "@/lib/api/approvals";

import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/lib/session";

/**
 * §16 หน้าที่ 2 — งานค้างของฉัน. The landing page after login.
 *
 * Two tabs across every request type (REQ-08). Rows are filtered by data scope
 * at the backend, so this page renders whatever it is given without deciding
 * visibility itself (SCOPE-02).
 */
export default async function MyWorkPage() {
  const session = await getSession();

  // AUTH-04: someone not yet placed in the org chart has no supervisor, so
  // there is no step-1 approver and nothing they submit could route.
  if (session?.user.pending_org_assignment) {
    return <PendingAssignment />;
  }

  const [mineResult, involvedResult, inboxResult, typesResult] =
    await Promise.all([
      requests.getMyRequests(100),
      requests.getInvolvedRequests(100),
      approvals.getApprovalsInbox({ page_size: 100 }),
      requests.getRequestTypes(),
    ]);

  const mine = mineResult.ok ? mineResult.data.data : [];

  /**
   * The "รออนุมัติของฉัน" tab means *waiting on me*, which only the approval
   * inbox knows — `view=involved` also returns work further down a chain I am
   * on but not yet responsible for. Intersecting the two keeps the tab honest.
   */
  const waitingOnMe = new Set(
    (inboxResult.ok ? inboxResult.data.data : [])
      .map((approvalCase) => approvalCase.requestId)
      .filter((id): id is string => Boolean(id)),
  );

  // Not named `approvals`: that is the imported API module, and shadowing it
  // here made the module unreachable at the call above.
  const waitingRows = (
    involvedResult.ok ? involvedResult.data.data : []
  ).filter((row) => waitingOnMe.has(row.id));

  const failed = [mineResult, involvedResult, inboxResult].find(
    (result) => !result.ok,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Title level={4} className="mb-0!">
          {messages.myWork.title}
        </Title>
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
        types={typesResult.ok ? typesResult.data : []}
      />
    </div>
  );
}
