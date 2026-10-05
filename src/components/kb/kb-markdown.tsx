"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * CD-259 — an article's Markdown. Raw HTML is not rendered (react-markdown
 * drops it), and the article's own files (`kb/articles/…`) are fetched
 * through the app's API proxy.
 */
export function KbMarkdown({ body }: { body: string }) {
  return (
    <div className="kb-markdown max-w-none text-[15px] leading-7 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/5 [&_pre]:p-3 [&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_th]:border [&_th]:bg-black/5 [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-black/60">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) =>
          url.startsWith("kb/articles/") ? `/api/app/${url}` : url
        }
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
