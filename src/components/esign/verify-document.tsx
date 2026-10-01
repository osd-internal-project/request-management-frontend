"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Descriptions, Result, Spin } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { messages } from "@/lib/messages";

const m = messages.esign.verify;

interface Info {
  title: string;
  completedAt: string;
  signedHash: string;
  signers: { role: string; name: string; signedAt: string }[];
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * CD-173 หน้าตรวจสอบเอกสาร — who signed what, and whether the file the
 * holder has is that very file. The file stays in the browser: its SHA-256
 * is computed here and only that is sent.
 */
export function VerifyDocument({ code }: { readonly code: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void fetch(`/api/public/esign/verify/${encodeURIComponent(code)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const json = (await response.json().catch(() => ({}))) as Info & {
          message?: string;
        };
        if (response.ok) setInfo(json);
        else setError(json.message ?? m.notFound);
      })
      .catch(() => setError(messages.esign.public.unavailable));
  }, [code]);

  if (error) return <Result status="warning" title={m.title} subTitle={error} />;
  if (!info) return <Spin className="mt-16 block" />;

  return (
    <Card>
      <Title level={4}>{m.title}</Title>
      <Text type="secondary" className="mb-3 block text-sm">
        {m.subtitle}
      </Text>
      <Descriptions
        size="small"
        column={1}
        items={[
          { key: "code", label: m.code, children: code },
          { key: "doc", label: m.document, children: info.title },
          {
            key: "done",
            label: m.signers,
            children: (
              <div>
                {info.signers.map((signer) => (
                  <div key={signer.role + signer.name}>
                    {signer.role}: {signer.name}{" "}
                    <Text type="secondary" className="text-xs">
                      {dayjs(signer.signedAt).format("D MMM YYYY HH:mm")}
                    </Text>
                  </div>
                ))}
                <Text type="secondary" className="text-xs">
                  {m.completedAt(dayjs(info.completedAt).format("D MMM YYYY HH:mm"))}
                </Text>
              </div>
            ),
          },
        ]}
      />
      <div className="mt-4">
        <Text className="mb-1 block">{m.pick}</Text>
        <input
          type="file"
          accept="application/pdf"
          aria-label={m.pick}
          disabled={checking}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setChecking(true);
            setMatch(null);
            const hash = await sha256(file);
            const response = await fetch(
              `/api/public/esign/verify/${encodeURIComponent(code)}/check`,
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ sha256: hash }),
              },
            ).catch(() => null);
            const json = (await response?.json().catch(() => null)) as {
              match?: boolean;
            } | null;
            setMatch(Boolean(json?.match));
            setChecking(false);
          }}
        />
        {checking && <Spin size="small" className="ml-2" />}
        {match !== null && (
          <Alert
            className="mt-3"
            showIcon
            type={match ? "success" : "error"}
            title={match ? m.match : m.mismatch}
          />
        )}
        <Text type="secondary" className="mt-3 block break-all text-xs">
          {m.hash(info.signedHash)}
        </Text>
      </div>
    </Card>
  );
}
