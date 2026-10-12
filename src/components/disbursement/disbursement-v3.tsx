"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Card, Col, Descriptions, Row, Space, Steps } from "antd";
import type { DisbursementDetail } from "@/lib/api/disbursement";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";
import type { DisbursementViewer } from "./disbursement-detail";
import { EvidenceFiles } from "./evidence-files";
import { thaiDateTime, v3StepIndex } from "./format";
import { LinesTable } from "./lines-table";
import { SummaryCard } from "./summary-card";
import {
  ClearingCard,
  CloseCard,
  PayCard,
  PaymentsCard,
  PettyCloseCard,
  VerifyCard,
} from "./work-cards";

const m = messages.disbursement;
const FILE_KINDS = [
  "PAYMENT_SLIP",
  "TAX_INVOICE",
  "RECEIPT_VOUCHER",
  "TRAVEL_SLIP",
  "RECEIPT",
  "REFUND_PROOF",
  "OTHER",
] as const;

export interface SourceRequest {
  readonly requestNo: string | null;
  readonly status: string | null;
  readonly verifierName: string | null;
}

/** A disbursement created after its request was approved: its own steps, the money work only. */
export function DisbursementV3View({
  view,
  viewer,
  source,
  requesterName,
}: {
  readonly view: DisbursementDetail;
  readonly viewer: DisbursementViewer;
  readonly source: SourceRequest;
  readonly requesterName: string | null;
}) {
  const router = useRouter();
  const onFiles = () => router.refresh();
  const advance = view.kind === "ADVANCE";
  const steps = advance ? m.v3Steps : m.v3PettySteps;
  const current = v3StepIndex(view.kind, view.status);
  const accounting = viewer.canPay && !viewer.isRequester;

  return (
    <Space direction="vertical" className="w-full" size="large">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{m.detailTitle(view.kind)}</h2>
        <Steps
          size="small"
          current={Math.min(current, steps.length - 1)}
          status={
            view.status === "CANCELLED" ? "error" : current >= steps.length ? "finish" : "process"
          }
          items={steps.map((step) => ({ title: step.title, description: step.sub }))}
        />
      </Card>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Space direction="vertical" className="w-full" size="middle">
            {view.status === "CANCELLED" && (
              <Alert type="warning" showIcon title={m.statuses.CANCELLED} />
            )}

            <Card title={m.source.title}>
              <Alert type="info" showIcon className="mb-3" title={m.source.hint} />
              <Descriptions
                size="small"
                column={{ xs: 1, md: 2 }}
                items={[
                  {
                    label: m.source.requestNo,
                    children: (
                      <Link href={ROUTES.requestDetail(view.requestId)}>
                        {source.requestNo ?? view.requestNo ?? m.source.open}
                      </Link>
                    ),
                  },
                  { label: m.source.status, children: source.status ?? "-" },
                  { label: m.source.approvedAt, children: thaiDateTime(view.approvedAt) },
                  { label: m.source.verifiedBy, children: source.verifierName ?? "-" },
                ]}
              />
            </Card>

            <Card title={m.lines.estimateTitle}>
              <LinesTable lines={view.estimate} />
            </Card>

            {view.status === "PENDING_VERIFY" &&
              (viewer.canVerify && !viewer.isRequester ? (
                <VerifyCard view={view} onFiles={onFiles} />
              ) : (
                <Alert type="info" showIcon title={m.statuses.PENDING_VERIFY} />
              ))}

            {view.verify && (
              <Alert type="success" showIcon title={m.verify.done} description={view.verify.note} />
            )}

            <PaymentsCard view={view} viewerId={viewer.viewerId} canPay={viewer.canPay} />

            {["APPROVED", "PARTIALLY_PAID"].includes(view.status) &&
              (viewer.canPay ? (
                <PayCard view={view} onFiles={onFiles} isRequester={viewer.isRequester} />
              ) : (
                <Alert type="info" showIcon title={m.statuses[view.status]} />
              ))}

            {advance && view.status === "PAID" &&
              (viewer.isRequester ? (
                <ClearingCard view={view} onFiles={onFiles} />
              ) : (
                <Alert type="info" showIcon title={m.clearing.waiting} />
              ))}

            {advance && view.status === "CLEARING" &&
              (accounting ? (
                <CloseCard view={view} onFiles={onFiles} />
              ) : (
                <Card title={m.lines.actualTitle}>
                  <LinesTable lines={view.actual} />
                </Card>
              ))}

            {!advance && view.status === "PAID" &&
              (accounting ? (
                <PettyCloseCard view={view} />
              ) : (
                <Alert type="info" showIcon title={m.close.pettyWaiting} />
              ))}

            {view.status === "CLOSED" && (
              <Card title={m.close.closed}>
                {view.actual.length > 0 && <LinesTable lines={view.actual} />}
              </Card>
            )}

            {view.files.length > 0 && (
              <Card>
                <Space direction="vertical" className="w-full">
                  {FILE_KINDS.filter((kind) => view.files.some((f) => f.kind === kind)).map(
                    (kind) => (
                      <EvidenceFiles
                        key={kind}
                        docNo={view.docNo}
                        files={view.files}
                        kind={kind}
                        editable={false}
                        onChanged={onFiles}
                      />
                    ),
                  )}
                </Space>
              </Card>
            )}
          </Space>
        </Col>
        <Col xs={24} lg={8}>
          <SummaryCard view={view} requesterName={requesterName} nextActor={null} />
        </Col>
      </Row>
    </Space>
  );
}
