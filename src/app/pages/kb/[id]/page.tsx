import { KbArticleView } from "@/components/kb/kb-article-view";

type Params = { params: Promise<{ id: string }> };

/** CD-259 — read an article. */
export default async function KbArticlePage({ params }: Params) {
  const { id } = await params;
  return <KbArticleView id={id} />;
}
