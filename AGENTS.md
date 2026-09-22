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
guide before touching a screen. `src/components/reports/bottleneck-table.tsx` is
the worked example of the fix — a `"use client"` component the server page
renders.

## Where a component goes

`src/components/` is grouped by who uses it, not by what the file is called:
`layout/`, `requests/`, `crm/{customers,leads,opportunities,quotations}/`,
`admin/` (with `admin/org/` for the six parts of `/pages/admin/org`),
`notifications/`, `reports/`. `ui/` is only for components used across groups —
`search-select.tsx` earns its place there with 22 importers; a "generic-sounding"
name does not.

## Working to the plan

**The plan lives under `~/.claude/plans/`.** It is authoritative; memory of it is not.

There is deliberately **no progress file**. What a screen actually covers is established by
running `yarn spec:check` in the backend repo: it compares every §16 screen against
`docs/screen-checklist.json` and writes `docs/spec-coverage.md`. It reads this repo's
sources directly, so a screen that is half-built shows as `8/16`, not as done.

The rules for working a plan and reporting a checklist are in `~/.claude/AGENTS.md`; the
incidents that produced them are recorded once, in
[`../request-management-backend/AGENTS.md`](../request-management-backend/AGENTS.md).
Neither is repeated here.

## Screens

Screens are specified in §16 of
[`../request-management-backend/docs/ctd-foundation-spec.md`](../request-management-backend/docs/ctd-foundation-spec.md).
There are exactly 8 mockups (หน้าที่ 1–5, A1, A2, A3) — there is no A4. Compare
line by line against §16 before calling a screen finished; where no mockup exists,
match §16's house style rather than inventing a new one.

All user-facing text lives in `src/lib/messages.ts`. No Thai string literals in
components.

## A page must not fetch what its viewer cannot read

Gate every call with `can()` / `canAny()` from `@/lib/session` before making it.
The menu gates *links*; it does nothing for the data a shared page fetches on
the server.

The landing page `/pages` is the one every role opens, and it called
`GET /approvals/inbox` — `@Permissions('approval.decide')` — for everybody. A
plain employee got a guaranteed 403 per page view, a red "โหลดข้อมูลไม่สำเร็จ"
alert on a page where nothing was wrong, and one FORBIDDEN line in the
core-service log each time, burying the real ones.

Skipping the call, not hiding the error, is the fix: an empty result for
someone who cannot decide is the truthful answer. And hide the UI it feeds —
a tab that can only ever read `· 0` looks like a page that failed to load.
