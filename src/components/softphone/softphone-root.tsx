"use client";

import { useEffect, useState } from "react";
import {
  SoftPhoneProvider,
  useSoftPhoneUser,
} from "@D-Callcenter/softphone-provider";
import { appApi } from "@/lib/api/client";
import { useCallLogOnHangup } from "./use-call-log-on-hangup";

type Runtime =
  | { enabled: false }
  | {
      enabled: true;
      extension: string;
      password: string;
      wss_url: string;
      sip_server: string;
    };

type Line = Extract<Runtime, { enabled: true }>;

/**
 * The D-Callcenter softphone, for users an admin gave a line. Loaded only in
 * the browser (see app-shell.tsx): the vendor touches `document` and
 * `indexedDB` during render. Without a line nothing of the vendor mounts.
 */
export default function SoftphoneRoot() {
  const [line, setLine] = useState<Line | null>(null);

  useEffect(() => {
    let cancelled = false;
    void appApi<Runtime>("softphone/runtime").then((result) => {
      if (!cancelled && result.ok && result.data.enabled) setLine(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!line) return null;
  return (
    <SoftPhoneProvider>
      <SoftphoneBridge line={line} />
    </SoftPhoneProvider>
  );
}

/** Hands the line to the vendor and logs answered calls; renders nothing. */
function SoftphoneBridge({ line }: { line: Line }) {
  const auth = useSoftPhoneUser();
  const set = auth?.set;

  useEffect(() => {
    set?.((previous) => ({
      ...previous,
      socketServer: line.wss_url,
      username: line.extension,
      password: line.password,
      ipServer: line.sip_server,
      displayName: line.extension,
      // Contacts and favourites live in this system's CRM, not the phone.
      isUserFavoriteVisible: false,
      isUserContactVisible: false,
    }));
  }, [line, set]);

  useCallLogOnHangup();
  return null;
}
