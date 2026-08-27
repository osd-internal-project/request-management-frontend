<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!--
  Everything below sits outside the managed block above. `next dev` upserts only
  the text between its markers (`upsertAgentRulesBlock` keeps what comes before
  and after), so these rules survive a regeneration.
-->

# request-management frontend — working rules

The block above is not decoration. Five screens were written without opening
`node_modules/next/dist/docs/`, and the cost was real: antd `Table` columns carry
`render` functions, a function cannot cross the server→client boundary, and the
page 500s at serialisation with the data already fetched. Read the App Router
guide before touching a screen. `src/components/bottleneck-table.tsx` is the
worked example of the fix — a `"use client"` component the server page renders.

## Working to the plan

Multi-phase work is tracked in two files: the plan (under `~/.claude/plans/`) and
[`../PROGRESS.md`](../PROGRESS.md). Both are authoritative; memory of them is not.
These rules exist because all four were broken in the same sprint.

- Open the plan file and quote the phase heading before starting that phase. Never
  work from a remembered plan — the file has been rewritten mid-sprint before.
- Work phases in the written order. Reordering or skipping needs saying so first,
  with the reason. Phase 6 was built before Phase 1, and the screens that stalled
  were exactly the ones Phase 1 was supposed to supply.
- A phase is not done while an unchecked `- [ ]` remains under it in `PROGRESS.md`.
- Tick `PROGRESS.md` **before** reporting, not after.
- Report closed/outstanding counts. "Done" without a count is how 9/11 got
  reported as 11.

## Screens

Screens are specified in §16 of
[`../request-management-backend/docs/ctd-foundation-spec.md`](../request-management-backend/docs/ctd-foundation-spec.md).
There are exactly 8 mockups (หน้าที่ 1–5, A1, A2, A3) — there is no A4. Compare
line by line against §16 before calling a screen finished; where no mockup exists,
match §16's house style rather than inventing a new one.

All user-facing text lives in `src/lib/messages.ts`. No Thai string literals in
components.
