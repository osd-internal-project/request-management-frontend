"use client";

import Link from "next/link";
import { Collapse, Descriptions, Tag } from "antd";
import Text from "antd/es/typography/Text";
import type { HandoverTechnicalPackage } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const mt = messages.handover.technical;
const mp = messages.presales;

function List({ lines }: { lines: string[] }) {
  return lines.length ? (
    <ol className="m-0 pl-5">
      {lines.map((line, index) => (
        <li key={index} className="whitespace-pre-wrap">
          {line}
        </li>
      ))}
    </ol>
  ) : (
    <Text type="secondary">{mt.none}</Text>
  );
}

function fileSize(bytes: number): string {
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`;
}

/**
 * CD-144 — the technical package a handover carries: the approved Solution
 * version, read-only. The receiving team reads it here without any Pre-Sales
 * permission; files download through the handover when it has been sent.
 */
export function TechnicalPackage({
  pkg,
  handoverId,
  note,
  showSolutionLink = false,
}: {
  pkg: HandoverTechnicalPackage;
  /** Set once the handover carries it — files download through it. */
  handoverId?: string | null;
  note?: string;
  /** The Solution page is Pre-Sales' and the deal's — not the receiving team's. */
  showSolutionLink?: boolean;
}) {
  return (
    <Collapse
      size="small"
      items={[
        {
          key: "package",
          label: (
            <span>
              {mt.title(pkg.title, pkg.versionNo)}
              {note && (
                <Text type="secondary" className="ml-2 text-xs">
                  {note}
                </Text>
              )}
            </span>
          ),
          children: (
            <Descriptions
              size="small"
              column={1}
              bordered
              items={[
                {
                  key: "summary",
                  label: mt.summary,
                  children: (
                    <span className="whitespace-pre-wrap">
                      {pkg.summary || mt.none}
                    </span>
                  ),
                },
                {
                  key: "design",
                  label: mt.design,
                  children: (
                    <span className="whitespace-pre-wrap">
                      {pkg.design || mt.none}
                    </span>
                  ),
                },
                {
                  key: "feasibility",
                  label: mp.feasibility.title,
                  children: (
                    <span className="whitespace-pre-wrap">
                      {mp.feasibility.verdicts[pkg.feasibility] ??
                        pkg.feasibility}
                      {pkg.feasibilityNote && ` — ${pkg.feasibilityNote}`}
                    </span>
                  ),
                },
                {
                  key: "in",
                  label: mt.inScope,
                  children: <List lines={pkg.inScope} />,
                },
                {
                  key: "out",
                  label: mt.outOfScope,
                  children: <List lines={pkg.outOfScope} />,
                },
                {
                  key: "deliverables",
                  label: mt.deliverables,
                  children: pkg.deliverables.length ? (
                    <ol className="m-0 pl-5">
                      {pkg.deliverables.map((item, index) => (
                        <li key={index}>
                          <Text strong>{item.title}</Text>
                          {item.description && (
                            <div className="whitespace-pre-wrap">
                              {item.description}
                            </div>
                          )}
                          <ul className="m-0 pl-4">
                            {item.criteria.map((criterion, at) => (
                              <li key={at}>
                                {mt.criterion}: {criterion}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Text type="secondary">{mt.none}</Text>
                  ),
                },
                {
                  key: "assumptions",
                  label: mt.assumptions,
                  children: pkg.assumptions.length ? (
                    <ol className="m-0 pl-5">
                      {pkg.assumptions.map((item, index) => (
                        <li key={index}>
                          <Tag>
                            {mp.categories[item.category] ?? item.category}
                          </Tag>
                          {item.text}
                          {(item.owner || item.neededBy) && (
                            <div className="text-xs text-gray-500">
                              {[
                                item.owner &&
                                  `${mp.assumptionOwner}: ${item.owner}`,
                                item.neededBy &&
                                  `${mp.assumptionNeededBy} ${item.neededBy}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Text type="secondary">{mt.none}</Text>
                  ),
                },
                {
                  key: "requirements",
                  label: mt.requirements,
                  children: pkg.requirements.length ? (
                    <ol className="m-0 pl-5">
                      {pkg.requirements.map((item) => (
                        <li key={item.seq}>
                          <Tag>{mp.analysis.kinds[item.kind] ?? item.kind}</Tag>
                          {item.text} —{" "}
                          {mp.analysis.assessments[item.assessment] ??
                            item.assessment}
                          {item.note && (
                            <div className="text-xs text-gray-500">
                              {item.note}
                            </div>
                          )}
                          {item.customerAnswer && (
                            <div className="text-xs">
                              {mt.customerAnswer}: {item.customerAnswer}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Text type="secondary">{mt.none}</Text>
                  ),
                },
                {
                  key: "clarifications",
                  label: mp.clarifications.title,
                  children: pkg.clarifications.length ? (
                    <ol className="m-0 pl-5">
                      {pkg.clarifications.map((item) => (
                        <li key={item.seq}>
                          {item.question}
                          <div className="text-xs">
                            {item.answer
                              ? `${mp.clarifications.answer}: ${item.answer}${
                                  item.respondent ? ` (${item.respondent})` : ""
                                }`
                              : mp.clarifications.awaiting}
                            {item.affectsScope && (
                              <Tag className="ml-1">
                                {mp.clarifications.scope}
                              </Tag>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Text type="secondary">{mt.none}</Text>
                  ),
                },
                {
                  key: "files",
                  label: mt.files,
                  children: pkg.files.length ? (
                    <ul className="m-0 pl-5">
                      {pkg.files.map((file) => (
                        <li key={file.id}>
                          {handoverId ? (
                            <a
                              href={`/api/app/handovers/${handoverId}/solution-files/${file.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {file.fileName}
                            </a>
                          ) : (
                            file.fileName
                          )}{" "}
                          <Text type="secondary" className="text-xs">
                            {fileSize(file.sizeBytes)}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text type="secondary">{mt.none}</Text>
                  ),
                },
              ]}
            />
          ),
          extra: showSolutionLink ? (
            <Link
              href={`${ROUTES.solutionDetail(pkg.solutionId)}?v=${pkg.versionNo}`}
              onClick={(event) => event.stopPropagation()}
            >
              {mt.openSolution}
            </Link>
          ) : null,
        },
      ]}
    />
  );
}
