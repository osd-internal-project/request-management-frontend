# request-management frontend

Next.js (App Router, TypeScript, Ant Design, Tailwind v4) frontend for the
**CTD Foundation Sprint**. The requirement index lives in the backend repo at
`../request-management-backend/docs/ctd-foundation-spec.md`; screens here are
named after its §16 mockups.

## Setup

```bash
yarn install
cp .env.local.example .env.local   # USER_SERVICE_URL → the backend user-service
yarn dev
```

> **yarn only.** `packageManager` is pinned to `yarn@1.22.19`; mixing package
> managers corrupts `node_modules`.

> **`nvm use` first.** `.nvmrc` pins Node 22.13.0. The native modules here
> (lightningcss, @tailwindcss/oxide, next-swc) are installed for the *architecture
> of the Node that ran `yarn install`* — on Apple silicon that is arm64. Falling
> back to an x64 Node (Homebrew's, say) makes `next dev` fail to compile
> `globals.css` with `Cannot find module '../lightningcss.darwin-x64.node'`, and
> Turbopack caches that failure: `rm -rf .next` is required even after switching
> back to the right Node.

The backend `user-service` must be running (`:3001`) — this app has no data of
its own.

## Authentication (AUTH-01, AUTH-03)

**OIDC Authorization Code + PKCE.** There is no password field anywhere in this
application: credentials are typed into Keycloak's own login page.

```
/login                     one SSO button, no form
  └─▶ GET /api/auth/login       BFF asks the backend for an authorize URL,
                                stores state + verifier in httpOnly cookies,
                                302s the browser to Keycloak
       └─▶ Keycloak login
            └─▶ GET /api/auth/callback   checks state, has the backend trade
                                         code + verifier for tokens, stores
                                         them in httpOnly cookies, 302s to /pages
```

Logout (`/api/auth/logout`) revokes the refresh token **and** redirects through
Keycloak's end-session endpoint — clearing local cookies alone would leave the
SSO session alive, so the next login would silently skip the password prompt.

Tokens live only in httpOnly cookies and are never readable from client
JavaScript. The PKCE verifier and CSRF state are httpOnly too, and cleared as
soon as the callback runs.

## Structure

| Path | Purpose |
|---|---|
| `src/app/login/` | Screen 1 — SSO button, error messages, first-login help |
| `src/app/api/auth/{login,callback,logout}/` | the BFF: the only place tokens are handled |
| `src/proxy.ts` | route protection (Next 16's `proxy`, formerly `middleware`) |
| `src/app/pages/layout.tsx` | server component: resolves the session, builds the menu, renders the shell |
| `src/components/app-shell.tsx` | client shell — antd `Layout`, sider, header, avatar menu |
| `src/app/configs/menu.tsx` | the navigation map, each entry tagged with the permission that reveals it |
| `src/lib/session.ts` | typed `GET /auth/me` — identity, permissions, scope |
| `src/lib/api.ts` | server-side authenticated fetch; returns errors instead of throwing |
| `src/lib/messages.ts` | all UI copy, Thai first (NFR-06) |
| `src/lib/routes.ts` | the full screen map |

### Menu filtering is not access control

`accessMenuItems(session)` hides what the user cannot use, purely for
usability. The backend re-checks the same permission on every call, so a
hand-typed admin URL returns 403 regardless of what the menu showed. Never
treat a hidden item as a security boundary. (ROLE-06)

### Screen status

| Screen | Route | Status |
|---|---|---|
| 1 · เข้าสู่ระบบ | `/login` | ✅ |
| 2 · งานค้างของฉัน | `/pages/requests` | 🟡 S3 |
| 3 · ยื่นคำขอใหม่ | `/pages/requests/new` | 🟡 S3 |
| 4 · รายละเอียดคำขอ | `/pages/requests/[id]` | 🟡 S3 |
| 5 · รออนุมัติของฉัน | `/pages/approvals` | 🟡 S2 |
| รายงานคอขวด | `/pages/reports/bottleneck` | 🟡 S3 |
| A1 · ตารางอำนาจอนุมัติ | `/pages/admin/approval-matrix` | 🟡 S2 |
| A2 · ประเภทคำขอ | `/pages/admin/request-types` | 🟡 S3 |
| A3 · ผังทีมและสิทธิ์ | `/pages/admin/org` | ✅ read-only |
| Audit Log | `/pages/admin/audit` | ✅ |

🟡 screens render a `SprintPlaceholder` naming the sprint and requirement — the
route, permission, and navigation are settled; only the contents are pending.

## Ant Design v6 gotchas

Two of these cost real debugging time:

- **Never destructure Typography sub-components.**
  `const { Title, Text, Paragraph } = Typography` yields **`undefined`** in a
  server component — antd is a client module, and its static sub-properties do
  not survive the client-reference boundary. The symptom is a 500 with
  *"Element type is invalid … got: undefined"*. Import them directly instead:

  ```ts
  import Title from "antd/es/typography/Title";
  import Paragraph from "antd/es/typography/Paragraph";
  ```

- **`Alert` uses `title`, not `message`.** `message` is deprecated in v6.

- **Never pass a function to an antd component from a server component.**
  antd is a client module, so `Table`'s `columns[].render`, `List`'s
  `renderItem`, and any `onClick` fail at render with *"Functions cannot be
  passed directly to Client Components"*. Put the component in its own
  `"use client"` file and pass plain data — see
  `src/components/audit-table.tsx`.

  This one hides: `{items.length ? <List renderItem={…}/> : <Empty/>}` works
  perfectly until the list is non-empty, then 500s.

## Notes

- The sandboxed build environment blocks `fonts.googleapis.com`, so the layout
  does not use `next/font/google`. Swap in a self-hosted font later if wanted.
- Thai copy lives in `src/lib/messages.ts` rather than inline, so a second
  locale is another object with the same shape. No i18n library is pulled in
  for that.

## Deploying to labs

`.github/workflows/deploy-labs.yml` builds the image, pushes it to
`swr.ap-southeast-2.myhuaweicloud.com`, and restarts the labs stack — on every push to
`deploys/labs`. It needs two **repository** secrets (Settings → Secrets and variables →
Actions), set on this repo rather than at the organisation level:

| Secret | Value |
|---|---|
| `HUAWEI_REGISTRY_USERNAME` | `ap-southeast-2@<ACCESS_KEY>` |
| `HUAWEI_REGISTRY_PASSWORD` | the login key SWR issues, not the raw Secret Access Key |

Both come from *SWR console → My Images → Client Upload → Generate Login Command*. A login key
is derived per region, so a key issued for another region answers 401 here.

The organisation defaults to `osd-internal`; set the `HUAWEI_SWR_ORG` repository *variable*
(a different tab from secrets) to override it without editing the workflow.

Images are tagged `<package.json version>-<short sha>`, which is never pushed over.

The deploy half runs on a self-hosted runner on the labs VM. That machine has to be prepared
first — runner, Docker, the shared `rm-net` network, `/etc/request-management/.frontend.env`
(see `.env.labs.example`), and the Keycloak redirect URIs. The full procedure lives in the
backend repo at `docs/labs-server-setup.md`. **With no self-hosted runner online for this repo,
the deploy job sits in `Queued` indefinitely without erroring.**
