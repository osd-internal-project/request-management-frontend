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

/** CD-241 — a span of the out-of-hours rota. */
export interface OnCallShift {
  id: string;
  startOn: string;
  endOn: string;
  primaryUserId: string;
  primaryName: string;
  backupUserId: string | null;
  backupName: string | null;
  note: string | null;
}

export interface OnCallRota {
  from: string;
  to: string;
  now: {
    outOfHours: boolean;
    date: string;
    shift: OnCallShift | null;
    onCall: {
      userId: string;
      level: "primary" | "backup";
      name: string;
    } | null;
  };
  items: OnCallShift[];
}

/** CD-241 — a case's trip to the rota. */
export interface OnCallDispatch {
  userId: string;
  name: string;
  level: "primary" | "backup";
  sentAt: string;
  escalatedAt: string | null;
  escalatedFromName: string | null;
  watching: boolean;
}

/** CD-242 — a billed service job's charge, and where it stands in SAP. */
export interface ServiceBilling {
  id: string;
  workOrderId: string;
  requestId: string;
  reference: string;
  status: "draft" | "confirmed" | "cancelled";
  currency: string;
  netTotal: number;
  note: string | null;
  request: { requestNo: string | null; status: string; subject: string } | null;
  customer: { id: string; code: string; name: string } | null;
  lines: {
    lineNo: number;
    productCode: string | null;
    description: string;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    discountPct: number;
    lineTotal: number;
    source: string;
  }[];
  confirmedAt: string | null;
  confirmedByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  erp: {
    status: string;
    draftNo: string | null;
    lastError: string | null;
    syncedAt: string | null;
    invoiceStatus: string | null;
    invoiceNo: string | null;
    invoiceTotal: number | null;
    paid: number | null;
    checkedAt: string | null;
  };
  createdAt: string;
}

/** CD-243 — a service job's time (timesheets), materials and their charge. */
export interface TimeMaterials {
  workOrderId: string;
  billing: string | null;
  locked: boolean;
  canEdit: boolean;
  time: {
    approved: number;
    pending: number;
    billable: number;
    people: {
      name: string;
      workType: string;
      approved: number;
      pending: number;
      billable: boolean;
    }[];
  };
  materials: {
    id: string;
    productCode: string;
    description: string;
    quantity: number;
    unit: string | null;
    serialNo: string | null;
    billable: boolean;
    unitPrice: number | null;
    priceSource: string | null;
    unitCost: number | null;
    usedOn: string;
    note: string | null;
    createdByName: string;
  }[];
  charge: {
    lines: {
      productCode: string | null;
      description: string;
      quantity: number;
      unit: string | null;
      unitPrice: number;
      source: string;
    }[];
    unratedWorkTypes: string[];
    unpricedMaterials: string[];
  };
  costs: {
    revenue: number;
    labour: { cost: number; unpricedHours: number };
    materials: { cost: number; unknownCost: number };
    cost: number;
    profit: number;
    marginPct: number | null;
  } | null;
}

/** CD-243 — a work type's selling rate per hour. */
export interface LabourRateRow {
  workTypeId: string;
  code: string;
  name: string;
  rateId: string | null;
  hourlyRate: number | null;
  productCode: string | null;
  note: string | null;
}

/** CD-244 — one PM round. */
export interface PmRound {
  id: string;
  entitlementId: string;
  entitlementTitle: string;
  customer: { id: string; code: string; name: string } | null;
  roundNo: number;
  dueOn: string;
  status: "planned" | "opening" | "opened" | "done" | "skipped" | "failed";
  overdue: boolean;
  workOrderId: string | null;
  requestId: string | null;
  request: { requestNo: string | null; status: string } | null;
  openedAt: string | null;
  openError: string | null;
  doneAt: string | null;
  skippedReason: string | null;
}

/** CD-244 — a service contract's PM plan and rounds. */
export interface PmPlanView {
  entitlementId: string;
  plan: {
    interval: string;
    leadDays: number;
    ownerUserId: string;
    ownerName: string;
    active: boolean;
  } | null;
  rounds: PmRound[];
}
