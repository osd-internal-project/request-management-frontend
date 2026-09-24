import { useState } from "react";

/**
 * Which entry of a list its dialog is editing: an index, `-1` for a new entry,
 * or `null` while closed. `dialogKey` remounts the dialog so its draft reseeds.
 */
export function useIndexedEditing<T>(
  entries: readonly T[],
  onChange: (next: T[]) => void,
) {
  const [editing, setEditing] = useState<number | null>(null);
  const existing = editing !== null && editing >= 0 ? editing : null;

  function close() {
    setEditing(null);
  }

  return {
    open: editing !== null,
    dialogKey: editing ?? "closed",
    current: existing === null ? null : entries[existing],
    openNew: () => setEditing(-1),
    openAt: (index: number) => setEditing(index),
    close,
    save(entry: T) {
      onChange(
        existing === null
          ? [...entries, entry]
          : entries.map((row, index) => (index === existing ? entry : row)),
      );
      close();
    },
    /** Undefined for a new entry: there is nothing yet to remove. */
    remove:
      existing === null
        ? undefined
        : () => {
            onChange(entries.filter((_, index) => index !== existing));
            close();
          },
  };
}
