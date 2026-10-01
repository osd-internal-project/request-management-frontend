import { PublicSign } from "@/components/esign/public-sign";

type Props = { params: Promise<{ token: string }> };

/** CD-14 — the page an external signer's link opens. */
export default async function PublicSignPage({ params }: Props) {
  const { token } = await params;
  return <PublicSign token={token} />;
}
