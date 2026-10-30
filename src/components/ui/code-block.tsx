"use client";

import Paragraph from "antd/es/typography/Paragraph";

/** Monospace block with a copy button — the one look for every call example. */
export function CodeBlock({ code }: { readonly code: string }) {
  return (
    <Paragraph
      copyable={{ text: code }}
      className="mb-0! flex items-start gap-2 rounded-lg bg-[var(--app-bg)] p-3"
    >
      <pre className="m-0 min-w-0 flex-1 overflow-x-auto font-mono text-xs">
        {code}
      </pre>
    </Paragraph>
  );
}
