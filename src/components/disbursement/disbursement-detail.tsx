"use client";

import { useRouter } from "next/navigation";
import { Alert, Card, Col, Row, Space, Steps } from "antd";
import type { DisbursementDetail } from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";
import { ApprovalCard } from "./approval-card";
import { EvidenceFiles } from "./evidence-files";
import { baht, stepIndex } from "./format";
import { LinesTable } from "./lines-table";
import { SummaryCard } from "./summary-card";
import { DisbursementV3View, type SourceRequest } from "./disbursement-v3";
import { ClearingCard, CloseCard, PayCard, VerifyCard } from "./work-cards";

const m = messages.disbursement;

export interface DisbursementViewer {
  readonly viewerId: string;
  readonly isRequester: boolean;
  readonly holdsTicket: boolean;
  readonly canVerify: boolean;
  readonly canPay: boolean;
  readonly canDecide: boolean;
}

/** Screens 1–7 for a disbursement on the old flow; one created after approval has its own view. */
export function DisbursementDetailView({
  view,
  viewer,
  source,
  requesterName,
  nextActor,
  approvalCaseId,
}: {
  readonly view: DisbursementDetail;
  readonly viewer: DisbursementViewer;
  readonly source: SourceRequest;
  readonly requesterName: string | null;
  readonly nextActor: string | null;
  readonly approvalCaseId: string | null;
}) {
  const router = useRouter();
  if (!view.legacy) {
    return (
      <DisbursementV3View view={view} viewer={viewer} source={source} requesterName={requesterName} />
    );
  }
  const onFiles = () => router.refresh();
  const steps = view.kind === "PETTY_CASH" ? m.pettySteps : m.steps;
  const current = stepIndex(view.kind, view.status);
  const atVerifyStep =
    !view.workSteps?.verify || view.ticket?.stepCode === view.workSteps.verify;

  return (
    <Space direction="vertical" className="w-full" size="large">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{m.detailTitle(view.kind)}</h2>
        <Steps
          size="small"
          current={Math.min(current, steps.length - 1)}
          status={
            view.status === "REJECTED" || view.status === "CANCELLED"
              ? "error"
              : current >= steps.length
                ? "finish"
                : "process"
          }
          items={steps.map((step) => ({
            title: step.title,
            description: step.sub,
          }))}
        />
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Space direction="vertical" className="w-full" size="middle">
            {(view.status === "REJECTED" ||
              view.status === "CANCELLED" ||
              view.status === "RETURNED") && (
              <Alert type="warning" showIcon title={m.statuses[view.status]} />
            )}
            <Card title={m.lines.estimateTitle}>
              <LinesTable lines={view.estimate} />
            </Card>

            {view.status === "PENDING_HEAD" && view.ticket && (
              <ApprovalCard
                title={m.approval.headTitle}
                requestId={view.ticket.requestId}
                caseId={approvalCaseId}
                waitingOn={nextActor}
                canDecide={viewer.canDecide}
              />
            )}

            {view.status === "PENDING_VERIFY" &&
              (viewer.canVerify && viewer.holdsTicket && atVerifyStep ? (
                <VerifyCard view={view} onFiles={onFiles} />
              ) : (
                <Alert type="info" showIcon title={m.verify.notHolder} />
              ))}

            {view.verify && (
              <Alert
                type="success"
                showIcon
                title={m.verify.done}
                description={view.verify.note}
              />
            )}

            {view.status === "PENDING_EXEC" && view.ticket && (
              <ApprovalCard
                title={m.approval.execTitle}
                requestId={view.ticket.requestId}
                caseId={approvalCaseId}
                waitingOn={nextActor}
                canDecide={viewer.canDecide}
              />
            )}

            {view.status === "APPROVED" && viewer.canPay && (
              <PayCard view={view} onFiles={onFiles} isRequester={viewer.isRequester} />
            )}

            {view.paidAt && (
              <Alert
                type="success"
                showIcon
                title={m.pay.done(baht(view.paidAmount))}
              />
            )}

            {view.status === "PAID" &&
              (viewer.isRequester ? (
                <ClearingCard view={view} onFiles={onFiles} />
              ) : (
                <Alert type="info" showIcon title={m.clearing.waiting} />
              ))}

            {view.status === "CLEARING" &&
              (viewer.canPay || viewer.canVerify ? (
                <CloseCard view={view} onFiles={onFiles} />
              ) : (
                <Card title={m.lines.actualTitle}>
                  <LinesTable lines={view.actual} />
                </Card>
              ))}

            {view.status === "CLOSED" && (
              <Card title={m.close.closed}>
                {view.actual.length > 0 && <LinesTable lines={view.actual} />}
              </Card>
            )}

            {view.files.length > 0 && (
              <Card>
                <Space direction="vertical" className="w-full">
                  {(["PAYMENT_SLIP", "RECEIPT", "REFUND_PROOF", "OTHER"] as const)
                    .filter((kind) => view.files.some((f) => f.kind === kind))
                    .map((kind) => (
                      <EvidenceFiles
                        key={kind}
                        docNo={view.docNo}
                        files={view.files}
                        kind={kind}
                        editable={false}
                        onChanged={onFiles}
                      />
                    ))}
                </Space>
              </Card>
            )}
          </Space>
        </Col>
        <Col xs={24} lg={8}>
          <SummaryCard
            view={view}
            requesterName={requesterName}
            nextActor={nextActor}
          />
        </Col>
      </Row>
    </Space>
  );
}
