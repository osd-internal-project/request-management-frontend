/** CD-21 Service & Support — the installed base (CD-236). */

export interface ServiceAssetRow {
  id: string;
  kind: "equipment" | "software";
  source: "project" | "manual" | "import";
  customer: { id: string; code: string; name: string } | null;
  project: { id: string; label: string } | null;
  productCode: string | null;
  name: string;
  model: string | null;
  serialNo: string | null;
  location: string | null;
  version: string | null;
  versionDeployedAt: string | null;
  installedOn: string | null;
  acceptedOn: string | null;
  status: "active" | "replaced" | "removed";
  note: string | null;
  updatedAt: string;
  /** CD-237 — the cover in force today (list rows only). */
  coverage?: {
    kind: string;
    title: string;
    endOn: string;
    coverage: string | null;
  } | null;
}

export interface ServiceAssetDetail extends ServiceAssetRow {
  /** CD-237 — what covers it now, and every entitlement it has had. */
  coverage: Entitlement | null;
  entitlements: Entitlement[];
  history: {
    id: string;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    reason: string | null;
    actorName: string | null;
    at: string;
  }[];
}

export interface ServiceAssetList {
  total: number;
  limited: boolean;
  items: ServiceAssetRow[];
}

export interface AssetImportResult {
  importId: string;
  mode: "dry_run" | "commit";
  summary: { create: number; skip: number; error: number };
  results: {
    rowNo: number;
    action: "create" | "skip_duplicate" | "error";
    reasons: string[];
    assetId?: string;
  }[];
}

/** CD-237 — what covers an asset. */
export interface Entitlement {
  id: string;
  kind: "warranty" | "service_contract";
  title: string;
  contractId: string | null;
  projectId: string | null;
  startOn: string;
  endOn: string;
  state: "upcoming" | "active" | "expired" | "cancelled";
  coverage: "H24X7" | "H8X7" | "H8X5" | null;
  severityTargets: Record<
    string,
    { responseHours: number; resolutionHours: number }
  > | null;
  correctiveQuota: number | null;
  preventiveQuota: number | null;
  correctiveUsed: number;
  preventiveUsed: number;
  correctiveLeft: number | null;
  preventiveLeft: number | null;
  source: string | null;
}

export interface EntitlementListRow extends Entitlement {
  customer: { id: string; code: string; name: string } | null;
  assetCount: number;
}

export interface EntitlementDetail extends Entitlement {
  customer: { id: string; code: string; name: string } | null;
  contract: { id: string; contractNo: string; title: string } | null;
  note: string | null;
  cancelReason: string | null;
  assets: {
    id: string;
    name: string;
    model: string | null;
    serialNo: string | null;
    location: string | null;
    status: string;
  }[];
}

/** CD-239 — the service side of a case. */
export interface WorkOrder {
  id: string;
  requestId: string;
  request: {
    requestNo: string | null;
    status: string;
    severity: string | null;
    subject: string | null;
  } | null;
  customer: { id: string; code: string; name: string } | null;
  asset: {
    id: string;
    name: string;
    serialNo: string | null;
    location: string | null;
  } | null;
  workKind: "corrective" | "preventive";
  suggestedBilling: "in_contract" | "billable";
  suggestedEntitlement: { id: string; title: string | null } | null;
  suggestionNote: string | null;
  billing: "in_contract" | "billable" | null;
  entitlement: { id: string; title: string | null } | null;
  billingReason: string | null;
  confirmedAt: string | null;
  ack: {
    name: string | null;
    on: string | null;
    estimate: number | null;
  } | null;
  cause: string | null;
  resolution: string | null;
  startBlocker: string | null;
  closeBlocker: string | null;
  createdAt: string;
  cover?: Entitlement[];
}
