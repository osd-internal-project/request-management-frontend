/**
 * The org chart as antd `TreeSelect` wants it.
 *
 * Three screens pick groups from the chart — the BI dashboard audience, the
 * groups allowed to raise a request type (A2), and the approval levels that
 * resolve through a group (A1) — and they must all draw the same tree. Kept
 * here rather than beside any one of them so the second and third could not
 * quietly grow their own shape.
 *
 * A plain module, not a client component: a value exported from a `"use
 * client"` module and imported by a server component arrives as a client
 * *reference* rather than the function itself (see `lib/org-tabs.ts`).
 */

/** The minimum a unit has to carry to be placed in the tree. */
export interface TreeUnit {
  id: string;
  name: string;
  parentId: string | null;
}

export interface UnitTreeNode {
  value: string;
  title: string;
  children: UnitTreeNode[];
  /**
   * Shown but not choosable.
   *
   * Disabling beats filtering for a unit that may not be picked: removing it
   * would re-hang its children at the root, and a chart whose shape changes
   * with the reason you opened the picker is a chart you cannot read.
   */
  disabled?: boolean;
}

/** How a caller labels and gates the nodes it is offering. */
export interface TreeOptions<T extends TreeUnit> {
  /** Defaults to the unit's name. */
  readonly title?: (unit: T) => string;
  /** Nodes this picker may show but not accept. */
  readonly disabled?: (unit: T) => boolean;
}

/**
 * Nests a flat unit list.
 *
 * A unit whose parent is missing from the list is hung at the root rather than
 * dropped: the list can legitimately be partial — an inactive parent, a filter
 * applied upstream — and silently losing a whole branch from a picker is worse
 * than showing it one level too high.
 */
export function buildUnitTree<T extends TreeUnit>(
  units: readonly T[],
  options: TreeOptions<T> = {},
): UnitTreeNode[] {
  const nodes = new Map<string, UnitTreeNode>(
    units.map((unit) => [
      unit.id,
      {
        value: unit.id,
        title: options.title?.(unit) ?? unit.name,
        children: [],
        ...(options.disabled?.(unit) ? { disabled: true } : {}),
      },
    ]),
  );

  const roots: UnitTreeNode[] = [];

  for (const unit of units) {
    const node = nodes.get(unit.id);
    if (!node) continue;

    const parent = unit.parentId ? nodes.get(unit.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}
