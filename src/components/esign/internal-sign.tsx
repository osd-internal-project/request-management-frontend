"use client";

import { useRouter } from "next/navigation";
import { App } from "antd";
import { appApi } from "@/lib/api/client";
import type { EsignSignerView } from "@/lib/api/esign";
import { messages } from "@/lib/messages";
import { SignPanel } from "./sign-panel";

const m = messages.esign.sign;

/** CD-167 — an employee signs as themselves: the login is the identity. */
export function InternalSign({
  signerId,
  view,
}: {
  readonly signerId: string;
  readonly view: EsignSignerView;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  return (
    <SignPanel
      view={view}
      documentUrl={`/api/app/esign/signers/${signerId}/document`}
      onSign={async (value) => {
        const result = await appApi(`esign/signers/${signerId}/sign`, {
          method: "POST",
          body: JSON.stringify({ ...value, consent: true }),
        });
        if (!result.ok) return result.message;
        message.success(m.signed);
        router.refresh();
        return null;
      }}
      onDecline={async (reason) => {
        const result = await appApi(`esign/signers/${signerId}/decline`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        if (!result.ok) return result.message;
        message.success(m.declined);
        router.refresh();
        return null;
      }}
    />
  );
}
