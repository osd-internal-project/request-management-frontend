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
}

export interface ServiceAssetDetail extends ServiceAssetRow {
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
