import type { OrgUnitNode } from "@/lib/api/types";

/**
 * The five levels of the org chart, widest first.
 *
 *   บริษัท → ฝ่าย → แผนก → ทีม → ตำแหน่ง
 *
 * A mirror of `libs/share/src/org/org-levels.ts` in the backend, which is the
 * authority — the backend refuses a write that breaks either rule below, and
 * these helpers only keep the screen from offering choices it knows will be
 * refused. Note that the order is *not* the `OrgUnitKind` enum's declaration
 * order: `TEAM` was added before ฝ่าย and ตำแหน่ง existed and still sits last
 * in the enum.
 *
 *   1. A unit's parent is the level immediately above it — no level is skipped.
 *   2. People sit at แผนก or below. ทีม and ตำแหน่ง are optional.
 */
export const ORG_UNIT_LEVELS = [
  "COMPANY",
  "DIVISION",
  "DEPARTMENT",
  "TEAM",
  "POSITION",
] as const satisfies readonly OrgUnitNode["kind"][];

type Level = OrgUnitNode["kind"];

/** The shallowest level a person may be placed in. */
const MEMBER_LEVEL_FROM: Level = "DEPARTMENT";

/** The levels a user may be assigned to, widest first. */
export const MEMBER_LEVELS: readonly Level[] = ORG_UNIT_LEVELS.slice(
  ORG_UNIT_LEVELS.indexOf(MEMBER_LEVEL_FROM as (typeof ORG_UNIT_LEVELS)[number]),
);

function levelIndex(kind: Level): number {
  return ORG_UNIT_LEVELS.indexOf(kind as (typeof ORG_UNIT_LEVELS)[number]);
}

/** The level a unit of this kind must hang under, `null` for the root level. */
export function parentKindOf(kind: Level): Level | null {
  const index = levelIndex(kind);
  return index > 0 ? ORG_UNIT_LEVELS[index - 1] : null;
}

/** The only level allowed directly under this one, `null` at the deepest. */
export function childKindOf(kind: Level): Level | null {
  const index = levelIndex(kind);
  return index >= 0 && index < ORG_UNIT_LEVELS.length - 1
    ? ORG_UNIT_LEVELS[index + 1]
    : null;
}

/** Whether a unit of this kind may hold people. */
export function canHoldMembers(kind: Level): boolean {
  return levelIndex(kind) >= levelIndex(MEMBER_LEVEL_FROM);
}

/**
 * The level a new or edited unit takes under `parent` — บริษัท at the root.
 * `null` means the parent is already the deepest level and can hold no
 * sub-units at all.
 */
export function kindUnder(parent: OrgUnitNode | null | undefined): Level | null {
  return parent ? childKindOf(parent.kind) : "COMPANY";
}
