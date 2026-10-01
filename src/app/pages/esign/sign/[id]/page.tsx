import { notFound } from "next/navigation";
import { InternalSign } from "@/components/esign/internal-sign";
import { getSignerView } from "@/lib/api/esign";

type Props = { params: Promise<{ id: string }> };

/**
 * CD-14 — a document an employee is asked to sign. Anyone signed in may
 * open it; the backend answers 404 unless they are the signer named.
 */
export default async function EsignSignPage({ params }: Props) {
  const { id } = await params;
  const result = await getSignerView(id);
  if (!result.ok) notFound();
  return <InternalSign signerId={id} view={result.data} />;
}
