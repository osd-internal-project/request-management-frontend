"use client";

import { Button, Card, Empty, Input, Space, Tag } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import type { SolutionDeliverable } from "@/lib/api/presales";
import { messages } from "@/lib/messages";

const ms = messages.presales.sow;

export interface ScopeOfWork {
  inScope: string[];
  outOfScope: string[];
  deliverables: SolutionDeliverable[];
}

/** One editable list of lines — in scope, out of scope, or a deliverable's criteria. */
function Lines({
  lines,
  editable,
  placeholder,
  addLabel,
  empty,
  onChange,
}: {
  lines: string[];
  editable: boolean;
  placeholder: string;
  addLabel: string;
  empty: string;
  onChange: (lines: string[]) => void;
}) {
  if (!editable) {
    return lines.length ? (
      <ol className="m-0 space-y-1 pl-5">
        {lines.map((line, index) => (
          <li key={index} className="whitespace-pre-wrap">
            {line}
          </li>
        ))}
      </ol>
    ) : (
      <Text type="secondary">{empty}</Text>
    );
  }
  return (
    <Space orientation="vertical" className="w-full" size={4}>
      {lines.map((line, index) => (
        <Space.Compact key={index} className="w-full">
          <Input
            value={line}
            maxLength={1000}
            placeholder={placeholder}
            prefix={<Text type="secondary">{index + 1}.</Text>}
            onChange={(event) =>
              onChange(
                lines.map((value, at) =>
                  at === index ? event.target.value : value,
                ),
              )
            }
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            aria-label={ms.remove}
            onClick={() => onChange(lines.filter((_, at) => at !== index))}
          />
        </Space.Compact>
      ))}
      <Button
        size="small"
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => onChange([...lines, ""])}
      >
        {addLabel}
      </Button>
    </Space>
  );
}

/**
 * CD-134 — ขอบเขตงาน (SOW), part of the version and locked with it: in scope
 * and out of scope as separate lists, and each deliverable with the criteria
 * the customer accepts it by.
 */
export function ScopeOfWorkCard({
  value,
  editable,
  onChange,
}: {
  value: ScopeOfWork;
  editable: boolean;
  onChange: (value: ScopeOfWork) => void;
}) {
  const setDeliverable = (index: number, patch: Partial<SolutionDeliverable>) =>
    onChange({
      ...value,
      deliverables: value.deliverables.map((item, at) =>
        at === index ? { ...item, ...patch } : item,
      ),
    });

  return (
    <Card size="small" title={ms.title}>
      <Text type="secondary" className="mb-3 block text-xs">
        {ms.hint}
      </Text>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Text strong className="mb-1 block">
            {ms.inScope} · {value.inScope.filter((line) => line.trim()).length}
          </Text>
          <Lines
            lines={value.inScope}
            editable={editable}
            placeholder={ms.inScopePlaceholder}
            addLabel={ms.addLine}
            empty={ms.none}
            onChange={(inScope) => onChange({ ...value, inScope })}
          />
        </div>
        <div>
          <Text strong className="mb-1 block">
            {ms.outOfScope} ·{" "}
            {value.outOfScope.filter((line) => line.trim()).length}
          </Text>
          <Lines
            lines={value.outOfScope}
            editable={editable}
            placeholder={ms.outOfScopePlaceholder}
            addLabel={ms.addLine}
            empty={ms.none}
            onChange={(outOfScope) => onChange({ ...value, outOfScope })}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Text strong>
          {ms.deliverables} · {value.deliverables.length}
        </Text>
        {editable && (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              onChange({
                ...value,
                deliverables: [
                  ...value.deliverables,
                  { title: "", description: "", criteria: [""] },
                ],
              })
            }
          >
            {ms.addDeliverable}
          </Button>
        )}
      </div>
      {value.deliverables.length ? (
        <Space orientation="vertical" className="mt-2 w-full">
          {value.deliverables.map((item, index) => (
            <Card
              key={index}
              size="small"
              type="inner"
              title={
                editable ? (
                  <Input
                    value={item.title}
                    maxLength={1000}
                    placeholder={ms.deliverableTitle}
                    prefix={<Text type="secondary">{index + 1}.</Text>}
                    onChange={(event) =>
                      setDeliverable(index, { title: event.target.value })
                    }
                  />
                ) : (
                  `${index + 1}. ${item.title}`
                )
              }
              extra={
                editable ? (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    aria-label={ms.remove}
                    onClick={() =>
                      onChange({
                        ...value,
                        deliverables: value.deliverables.filter(
                          (_, at) => at !== index,
                        ),
                      })
                    }
                  />
                ) : !item.criteria.length ? (
                  <Tag color="orange">{ms.noCriteria}</Tag>
                ) : null
              }
            >
              {editable ? (
                <Input.TextArea
                  value={item.description}
                  maxLength={4000}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  placeholder={ms.deliverableDescription}
                  className="mb-2"
                  onChange={(event) =>
                    setDeliverable(index, { description: event.target.value })
                  }
                />
              ) : (
                item.description && (
                  <div className="mb-2 whitespace-pre-wrap">
                    {item.description}
                  </div>
                )
              )}
              <Text type="secondary" className="mb-1 block text-xs">
                {ms.criteria}
              </Text>
              <Lines
                lines={item.criteria}
                editable={editable}
                placeholder={ms.criterionPlaceholder}
                addLabel={ms.addCriterion}
                empty={ms.noCriteria}
                onChange={(criteria) => setDeliverable(index, { criteria })}
              />
            </Card>
          ))}
        </Space>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={ms.noDeliverables}
        />
      )}
    </Card>
  );
}
