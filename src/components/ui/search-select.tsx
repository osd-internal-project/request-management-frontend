"use client";

import { Select, TreeSelect } from "antd";
import type { SelectProps, TreeSelectProps } from "antd";

/**
 * An antd `Select` that can be typed into.
 *
 * Every dropdown on every screen should filter as you type, and half of them
 * did not — the request-type picker, the role picker, the scope table, the
 * status filters. The ones that did each set `showSearch` and
 * `optionFilterProp` by hand, which is a prop pair that has to be remembered
 * on every new field and is therefore a prop pair that gets forgotten. Making
 * it a component means the default travels with the control instead.
 *
 * `optionFilterProp="label"` rather than antd's default of `value`: every
 * dropdown here is `{ value: id, label: name }`, so filtering on the value
 * would match ids nobody can see and hide the names they typed.
 *
 * Everything is overridable. A picker that searches on the server sets
 * `filterOption={false}` and its own `onSearch` — the `UserPicker` in
 * `org-admin.tsx` does exactly that, because the directory is longer than one
 * page and filtering the page in the browser would report "not found" for
 * people on the next one.
 */
export function SearchSelect<
  ValueType = unknown,
  OptionType extends object = { value: string; label: string },
>(props: SelectProps<ValueType, OptionType>) {
  return <Select showSearch optionFilterProp="label" {...props} />;
}

/**
 * The same for a `TreeSelect` — the org chart pickers on A1 and A2.
 *
 * `treeNodeFilterProp="title"` is the tree's equivalent of `optionFilterProp`:
 * without it antd filters on `value`, which here is a uuid.
 */
export function SearchTreeSelect(props: TreeSelectProps) {
  return <TreeSelect showSearch treeNodeFilterProp="title" {...props} />;
}
