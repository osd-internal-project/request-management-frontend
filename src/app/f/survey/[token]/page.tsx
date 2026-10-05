import { PublicSurvey } from "@/components/service/public-survey";

type Props = { params: Promise<{ token: string }> };

/** CD-248 — the page a customer's survey link opens (no session). */
export default async function PublicSurveyPage({ params }: Props) {
  const { token } = await params;
  return <PublicSurvey token={token} />;
}
