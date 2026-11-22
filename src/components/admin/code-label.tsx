import { Tag } from "antd";

/** A system code shown the way a person reads it: its name on top, the code small beneath. No name → the code alone. */
export function CodeLabel({ code, label }: { code: string; label?: string }) {
  if (!label) return <Tag>{code}</Tag>;
  return (
    <span className="inline-flex flex-col leading-tight">
      <span>{label}</span>
      <span className="text-xs text-[var(--app-text-secondary)]">{code}</span>
    </span>
  );
}
