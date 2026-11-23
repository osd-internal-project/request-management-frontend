"use client";

import { Button, Result } from "antd";
import { messages } from "@/lib/messages";

// `retry` (not `reset`) is this Next version's prop — node_modules/next/dist/docs, error.md.
export default function PageError({ retry }: { retry: () => void }) {
  return (
    <Result
      status="error"
      title={messages.common.loadError}
      extra={
        <Button type="primary" onClick={() => retry()}>
          {messages.common.retry}
        </Button>
      }
    />
  );
}
