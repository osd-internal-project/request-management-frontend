"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Empty, Skeleton, Tag } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { appApi } from "@/lib/api/client";
import type { CustomerVersionsRow } from "@/lib/api/projects";
import { messages } from "@/lib/messages";

const m = messages.projects.releases;

const kindColor: Record<string, string> = {
  dev: "default",
  uat: "processing",
  production: "success",
};

/**
 * CD-214 — on the customer's 360° page: the version each of the customer's
 * projects runs, environment by environment (only projects the viewer may
 * see).
 */
export function CustomerVersionsTab({
  customerId,
}: {
  readonly customerId: string;
}) {
  const [loaded, setLoaded] = useState<{
    customerId: string;
    rows: CustomerVersionsRow[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let live = true;
    void appApi<CustomerVersionsRow[]>(
      `project-releases?customer_id=${encodeURIComponent(customerId)}`,
    ).then((result) => {
      if (!live) return;
      setLoaded(
        result.ok
          ? { customerId, rows: result.data, error: null }
          : { customerId, rows: [], error: result.message },
      );
    });
    return () => {
      live = false;
    };
  }, [customerId]);

  if (!loaded || loaded.customerId !== customerId) {
    return <Skeleton active />;
  }
  if (loaded.error) return <Alert type="error" showIcon title={loaded.error} />;
  if (!loaded.rows.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={m.customerEmpty}
      />
    );
  }
  return (
    <div className="divide-y">
      {loaded.rows.map((project) => (
        <div key={project.projectId} className="py-2 text-sm">
          <Link
            className="font-medium"
            href={`/pages/projects/${project.projectId}`}
          >
            {project.projectNo} · {project.name}
          </Link>
          {project.environments.map((env) => (
            <div
              key={`${env.kind}-${env.name}`}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <Tag color={kindColor[env.kind]}>{m.kinds[env.kind]}</Tag>
              <span>
                {env.url ? (
                  <a href={env.url} target="_blank" rel="noreferrer">
                    {env.name}
                  </a>
                ) : (
                  env.name
                )}
              </span>
              <Text strong className="text-xs">
                {env.version ?? m.nothing}
              </Text>
              {env.deployedAt && (
                <Text type="secondary" className="text-xs">
                  {dayjs(env.deployedAt).format("D MMM YY HH:mm")}
                </Text>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
