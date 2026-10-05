import { KbArticleForm } from "@/components/kb/kb-article-form";

type Params = { params: Promise<{ id: string }> };

/** CD-259 — edit an article (its author while a draft, or a knowledge owner). */
export default async function KbEditPage({ params }: Params) {
  const { id } = await params;
  return <KbArticleForm id={id} />;
}
