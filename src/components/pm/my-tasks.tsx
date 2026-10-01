"use client";

import Link from "next/link";
import { Card, Empty, Tag } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import type { MyTask } from "@/lib/api/projects";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const m = messages.projects.work;

/**
 * CD-181 — งานโครงการของฉัน: the tasks handed to me across projects,
 * soonest due first, one card each so it reads on a phone on site.
 */
export function MyTasks({ tasks }: { readonly tasks: MyTask[] }) {
  const today = dayjs().format("YYYY-MM-DD");
  return (
    <div className="space-y-3">
      <div>
        <Title level={4} className="mb-0!">
          {m.mineTitle}
        </Title>
        <Text type="secondary">{m.mineSubtitle}</Text>
      </div>
      {tasks.length ? (
        tasks.map((task) => {
          const late = Boolean(task.finish && task.finish < today);
          return (
            <Link
              key={task.id}
              href={ROUTES.projectTask(task.project.id, task.id)}
              className="block"
            >
              <Card size="small" hoverable>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{task.title}</div>
                    <Text type="secondary" className="block text-xs">
                      {task.project.projectNo} · {task.project.name}
                    </Text>
                  </div>
                  <Tag color={m.statusColor[task.status]}>
                    {m.status[task.status]}
                  </Tag>
                </div>
                {task.finish && (
                  <Text
                    type={late ? "danger" : "secondary"}
                    className="mt-1 block text-xs"
                  >
                    {m.due(dayjs(task.finish).format("D MMM YYYY"))}
                    {late && ` · ${m.overdue}`}
                  </Text>
                )}
              </Card>
            </Link>
          );
        })
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={m.mineEmpty} />
      )}
    </div>
  );
}
