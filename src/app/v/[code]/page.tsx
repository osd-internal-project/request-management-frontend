import { VerifyDocument } from "@/components/esign/verify-document";

type Props = { params: Promise<{ code: string }> };

/** CD-173 — the verification page a signed document points to. */
export default async function VerifyPage({ params }: Props) {
  const { code } = await params;
  return <VerifyDocument code={decodeURIComponent(code)} />;
}
