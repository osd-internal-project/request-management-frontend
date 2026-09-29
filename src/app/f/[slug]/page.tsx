import type { Metadata } from "next";
import { Result } from "antd";
import { PublicRequestForm } from "@/components/public/public-request-form";
import { intakeFetch } from "@/lib/public/intake-client";
import type { IntakeFormView } from "@/lib/public/intake-types";
import { messages } from "@/lib/messages";

const m = messages.publicForm;

type Params = { params: Promise<{ slug: string }> };

/** Keep a private link out of search engines. */
export const metadata: Metadata = {
  title: m.pageTitle,
  robots: { index: false, follow: false },
};

/**
 * CD-66 — the public request form behind a company's web-form link. Read on
 * the server with the intake key; an unknown, disabled or other-company link
 * reads the same "not found".
 */
export default async function PublicFormPage({ params }: Params) {
  const { slug } = await params;
  const result = await intakeFetch<IntakeFormView>(
    `web-forms/${encodeURIComponent(slug)}`,
  );
  if (!result.ok) {
    // 404 is "no such form"; anything else (not configured, backend down)
    // says what went wrong rather than blaming the link.
    return result.status === 404 ? (
      <Result status="404" title={m.notFound} subTitle={m.notFoundHint} />
    ) : (
      <Result status="warning" title={result.message} />
    );
  }
  return <PublicRequestForm slug={slug} form={result.data} />;
}
