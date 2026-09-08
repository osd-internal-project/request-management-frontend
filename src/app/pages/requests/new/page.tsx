import { Alert, Breadcrumb } from "antd";
import Link from "next/link";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { RequestForm } from "@/components/request-form";
import { getRequestTypes } from "@/lib/api/requests";
import { getAllDirectoryUsers } from "@/lib/api/users";
import { getOrgUnitShapes } from "@/lib/api/org-units";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import { getSession } from "@/lib/session";

/**
 * Screen §16 หน้าที่ 3 — ยื่นคำขอ.
 *
 * The types (and therefore the whole form) are loaded server-side so the first
 * paint already knows what can be raised; only the answers are client state.
 */
export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{
    parent?: string;
    type?: string;
    ref_type?: string;
    ref_id?: string;
  }>;
}) {
  const session = await getSession();
  const { parent, type, ref_type, ref_id } = await searchParams;

  /**
   * The directory feeds the `ผู้รับเรื่อง` selector.
   *
   * A request is handed to a person, so the form cannot be filled in without
   * one — fetched here rather than on demand so the field is usable on first
   * paint like every other part of the form.
   */
  const [typesResult, users, units] = await Promise.all([
    getRequestTypes(),
    getAllDirectoryUsers(),
    // The chart, so ทีมผู้รับ can be a tree and the receiver list can follow a
    // whole branch rather than one exact unit.
    getOrgUnitShapes(),
  ]);

  const activeCompany = session?.companies.find(
    (company) => company.id === session.active_company_id,
  );

  if (!typesResult.ok) {
    return (
      <Alert
        type="error"
        showIcon
        title={messages.common.loadError}
        description={typesResult.error.message}
      />
    );
  }

  /*
    A failed read is said out loud, not folded into an empty list.

    `users.ok ? users.data : []` is what made a permission problem look like a
    dropdown bug on 2 ก.ย. 2569: a plain employee got 403 from both of these,
    the receiver picker came back with no options, and the pre-selected team
    rendered as a raw id because the tree it should have been named from was
    empty. Nothing on screen said why.
  */
  const blocked: string[] = [
    ...(users.ok ? [] : [messages.requestForm.peopleUnavailable]),
    ...(units.ok ? [] : [messages.requestForm.unitsUnavailable]),
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          {
            title: (
              <Link href={ROUTES.myWork}>{messages.nav.myWork}</Link>
            ),
          },
          { title: messages.requestForm.pageTitle },
        ]}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Title level={4} className="mb-0!">
            {messages.requestForm.pageTitle}
          </Title>
          {/* §16 puts the draft status beside the heading. It was an info Alert
              across the full width, which spent the loudest element on the page
              on a line that never changes — and left a real error looking the
              same as the standing state. */}
          <Text type="secondary">{messages.requestForm.draftBanner}</Text>
        </div>
        {activeCompany && (
          <Text type="secondary">
            {messages.nav.company}: {activeCompany.name}
          </Text>
        )}
      </div>

      {blocked.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={messages.requestForm.loadPartial}
          description={blocked.join(" · ")}
        />
      )}

      <RequestForm
        types={typesResult.data}
        people={users.ok ? users.data : []}
        units={units.ok ? units.data : []}
        parentRequestId={parent ?? null}
        initialRef={
        ref_type && ref_id ? { type: ref_type, id: ref_id } : undefined
      }
      initialTypeCode={type}
    />
    </div>
  );
}
