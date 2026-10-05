import { KbArticleForm } from "@/components/kb/kb-article-form";
import { KbRevisionReview } from "@/components/kb/kb-revision-review";

type Params = { params: Promise<{ id: string; revisionId: string }> };

/** CD-260 — a revision of a published article: write it, or review it. */
export default async function KbRevisionPage({ params }: Params) {
  const { id, revisionId } = await params;
  return (
    <div className="space-y-3">
      <KbRevisionReview id={id} revisionId={revisionId} />
      <KbArticleForm id={id} revisionId={revisionId} />
    </div>
  );
}
