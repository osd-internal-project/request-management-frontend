import type { Metadata } from "next";
import { Result } from "antd";
import {
  CampaignLeadForm,
  type LeadFormView,
} from "@/components/public/campaign-lead-form";
import { leadIntakeFetch } from "@/lib/public/intake-client";
import { messages } from "@/lib/messages";

const m = messages.leadForm;

type Params = { params: Promise<{ token: string }> };

/** A campaign link is shared on purpose, but it is no page to index. */
export const metadata: Metadata = {
  title: m.pageTitle,
  robots: { index: false, follow: false },
};

/**
 * CD-269 — a campaign's public registration form. Read on the server with the
 * lead intake key; a link that is unknown, switched off or of a closed
 * campaign reads the same "not found".
 */
export default async function CampaignLeadFormPage({ params }: Params) {
  const { token } = await params;
  const result = await leadIntakeFetch<LeadFormView>(
    `forms/${encodeURIComponent(token)}`,
  );
  if (!result.ok) {
    return result.status === 404 ? (
      <Result status="404" title={m.notFound} subTitle={m.notFoundHint} />
    ) : (
      <Result status="warning" title={result.message} />
    );
  }
  return <CampaignLeadForm token={token} form={result.data} />;
}
