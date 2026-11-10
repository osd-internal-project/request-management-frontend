"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App, Button } from "antd";
import { useExternalDatabase } from "@D-Callcenter/softphone-provider";
import { appApi } from "@/lib/api/client";
import { messages } from "@/lib/messages";
import { HOME_PATH, ROUTES } from "@/lib/routes";

const m = messages.softphone;

interface AnsweredCall {
  callId: string;
  phone: string;
  answeredAt: string;
}

interface CallLogResult {
  id: string;
  created: boolean;
}

/**
 * After an answered inbound call hangs up, writes its CALL_LOG request and
 * opens it. The vendor reports an answer as a recent-call row with status
 * `received` and a hang-up as a bare `Hangup` status (sent more than once,
 * from a `callManager` rebuilt every render), so the call is remembered at
 * answer and cleared on the first hang-up.
 */
export function useCallLogOnHangup() {
  const { message, notification } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const database = useExternalDatabase();
  const answered = useRef<AnsweredCall | null>(null);
  const callData = database?.callData;

  useEffect(() => {
    // The vendor's `CallStatus` type omits `received`, which it does send.
    if (!callData || String(callData.name.status) !== "received") return;
    if (answered.current?.callId === callData.id) return;
    answered.current = {
      callId: callData.id,
      phone: callData.target,
      answeredAt: new Date().toISOString(),
    };
  }, [callData]);

  async function report(call: AnsweredCall, endedAt: string) {
      const result = await appApi<CallLogResult>("softphone/call-logs", {
        method: "POST",
        headers: { "Idempotency-Key": `call-log:${call.callId}` },
        body: JSON.stringify({
          call_id: call.callId,
          phone: call.phone,
          answered_at: call.answeredAt,
          ended_at: endedAt,
        }),
      });
      if (!result.ok) {
        const key = `call-log-${call.callId}`;
        notification.error({
          key,
          title: m.callLogFailed,
          description: result.message,
          duration: 0,
          actions: (
            <Button
              size="small"
              onClick={() => {
                notification.destroy(key);
                void report(call, endedAt);
              }}
            >
              {m.retry}
            </Button>
          ),
        });
        return;
      }
      const href = ROUTES.requestDetail(result.data.id);
      // Someone mid-way through a request keeps their page; the log waits a click.
      if (pathname.startsWith(`${HOME_PATH}/requests`)) {
        const key = `call-log-${call.callId}`;
        notification.success({
          key,
          title: m.callLogged,
          description: m.callLoggedDetail(call.phone),
          duration: 0,
          actions: (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                notification.destroy(key);
                router.push(href);
              }}
            >
              {m.openCallLog}
            </Button>
          ),
        });
        return;
      }
      message.success(m.callLogged);
      router.push(href);
  }

  useEffect(() => {
    // Re-registered every render: the vendor builds a new callManager each time.
    database?.callManager.onSessionStatusUpdate(({ status }) => {
      if (status !== "Hangup") return;
      const call = answered.current;
      if (!call) return;
      answered.current = null;
      void report(call, new Date().toISOString());
    });
  });
}
