"use client";

import { useState } from "react";
import { Alert, App, Avatar, Button, Card, Popconfirm } from "antd";
import Text from "antd/es/typography/Text";
import { useRouter } from "next/navigation";
import {
  startLineLink,
  unlinkLine,
  type LineLinkStatus,
} from "@/lib/api/line";
import { messages } from "@/lib/messages";

const ml = messages.notifications.line;
/** LINE's own green, used only on the button that leaves for LINE Login. */
const LINE_GREEN = "#06C755";

function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The user's own LINE in the active company: link through LINE Login, see
 * which LINE it is, add the OA if they have not, unlink. `result` is the
 * `?line=` the callback route redirected back with.
 */
export function LineLinkCard({
  status,
  result,
}: {
  readonly status: LineLinkStatus;
  readonly result: string | null;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const [busy, setBusy] = useState<"link" | "unlink" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function link() {
    setBusy("link");
    setError(null);
    const response = await startLineLink();
    if (!response.ok) {
      setBusy(null);
      setError(response.message);
      return;
    }
    window.location.href = response.data.url;
  }

  async function unlink() {
    setBusy("unlink");
    const response = await unlinkLine();
    setBusy(null);
    if (!response.ok) return setError(response.message);
    message.success(ml.unlinked);
    router.replace("?");
    router.refresh();
  }

  const linked = status.linked;
  const oa = status.oa_basic_id;

  return (
    <Card size="small" title={ml.title} className="self-start">
      <div className="flex flex-col gap-3 text-sm">
        {result && (
          <Alert
            type={result === "ok" ? "success" : "warning"}
            showIcon
            title={ml.results[result] ?? ml.results.LINE_ERROR}
          />
        )}
        {error && <Alert type="error" showIcon title={error} />}

        {!status.configured && !linked && (
          <Text type="secondary" className="block text-xs">
            {ml.notConfigured}
          </Text>
        )}

        {status.configured && !linked && (
          <>
            <Text type="secondary" className="block text-xs">
              {ml.intro}
            </Text>
            <Button
              block
              type="primary"
              loading={busy === "link"}
              onClick={() => void link()}
              style={{ background: LINE_GREEN, borderColor: LINE_GREEN }}
            >
              {busy === "link" ? ml.linking : ml.link}
            </Button>
          </>
        )}

        {linked && (
          <>
            <div className="flex items-center gap-3">
              <Avatar size={40} src={linked.picture_url ?? undefined}>
                {linked.display_name.slice(0, 1)}
              </Avatar>
              <div className="min-w-0">
                <Text strong className="block truncate">
                  {linked.display_name}
                </Text>
                <Text type="secondary" className="block text-xs">
                  {ml.linkedAt(dateTime(linked.linked_at))}
                </Text>
              </div>
            </div>
            {!linked.is_friend && (
              <Alert
                type="warning"
                showIcon
                title={ml.notFriend(oa)}
                action={
                  oa ? (
                    <Button
                      size="small"
                      href={`https://line.me/R/ti/p/${encodeURIComponent(oa)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {ml.addFriend}
                    </Button>
                  ) : undefined
                }
              />
            )}
            <Popconfirm
              title={ml.unlinkConfirm}
              okText={ml.unlink}
              okButtonProps={{ danger: true }}
              onConfirm={() => void unlink()}
            >
              <Button size="small" danger loading={busy === "unlink"}>
                {ml.unlink}
              </Button>
            </Popconfirm>
          </>
        )}
      </div>
    </Card>
  );
}
