# API Layer Documentation

## Overview

The API layer is organized by **entity/domain** (database tables), making it easy to find and use API functions. Each entity has its own namespace with related functions.

## Structure

```
src/lib/api/
├── core.ts                      # Base utilities (apiGet, error types)
├── types.ts                     # Shared type definitions
├── index.ts                     # Main export
├── README.md                    # This file
├── requests/                    # Request entity
│   └── index.ts                 # getMyRequests(), getInvolvedRequests(), etc.
├── approvals/                   # Approval entity
│   └── index.ts                 # getApprovalsInbox(), getApproval()
├── users/                       # Keycloak users entity
│   └── index.ts                 # getKeycloakUsers()
├── org-units/                   # Organization units entity
│   └── index.ts                 # getOrgUnits(), getOrgUnitMembers(), getUnassignedUsers()
├── audit/                       # Audit logs entity
│   └── index.ts                 # getAuditLogs()
├── admin/                       # Admin features (matrix, types, SLA)
│   └── index.ts                 # getApprovalMatrix(), getAdminRequestTypes(), etc.
└── notifications/               # Notifications entity
    └── index.ts                 # getNotifications(), getNotification()
```

## Usage

### Import Namespace

Import the entity namespace (default export):

```typescript
import requests from "@/lib/api/requests";
import approvals from "@/lib/api/approvals";
import users from "@/lib/api/users";
import orgUnits from "@/lib/api/org-units";
import audit from "@/lib/api/audit";
import admin from "@/lib/api/admin";
import notifications from "@/lib/api/notifications";
```

### Call Functions

Call functions from the namespace:

```typescript
const result = await requests.getMyRequests(100);
const inbox = await approvals.getApprovalsInbox();
const keycloakUsers = await users.getKeycloakUsers({ page: 1 });
const orgTree = await orgUnits.getOrgUnits();
const logs = await audit.getAuditLogs();
const matrix = await admin.getApprovalMatrix();
```

## Entities

### Requests
**Module**: `@/lib/api/requests`

```typescript
import requests from "@/lib/api/requests";

// Get requests with view filter
await requests.getRequests({ view: "mine", page: 1, page_size: 100 });

// Convenience functions
await requests.getMyRequests(100);           // view: "mine"
await requests.getInvolvedRequests(100);     // view: "involved"

// Single request
await requests.getRequest(requestId);

// Request types
await requests.getRequestTypes();
```

### Approvals
**Module**: `@/lib/api/approvals`

```typescript
import approvals from "@/lib/api/approvals";

// Approval inbox
await approvals.getApprovalsInbox({ page: 1, page_size: 50 });

// Single approval
await approvals.getApproval(approvalId);
```

### Users (Keycloak)
**Module**: `@/lib/api/users`

```typescript
import users from "@/lib/api/users";

// Get Keycloak users with optional search
await users.getKeycloakUsers({
  page: 1,
  page_size: 50,
  q: "search term"
});
```

### Organization Units
**Module**: `@/lib/api/org-units`

```typescript
import orgUnits from "@/lib/api/org-units";

// Get org chart tree
await orgUnits.getOrgUnits();

// Get members of a unit
await orgUnits.getOrgUnitMembers(unitId);

// Get unassigned users
await orgUnits.getUnassignedUsers();
```

### Audit Logs
**Module**: `@/lib/api/audit`

```typescript
import audit from "@/lib/api/audit";

// Get audit logs
await audit.getAuditLogs({ page: 1, page_size: 50 });
```

### Admin Features
**Module**: `@/lib/api/admin`

```typescript
import admin from "@/lib/api/admin";

// Approval matrix
await admin.getApprovalMatrix();
await admin.getApprovalMatrixVersion(id);

// Request types (admin)
await admin.getAdminRequestTypes();

// SLA config
await admin.getSLAConfig();
```

### Notifications
**Module**: `@/lib/api/notifications`

```typescript
import notifications from "@/lib/api/notifications";

// Get all notifications
await notifications.getNotifications();

// Single notification
await notifications.getNotification(notificationId);
```

## Shared Types

Common types are exported from `@/lib/api/types`:

```typescript
import type {
  Paginated,
  KeycloakUser,
  OrgUnitNode,
  OrgMember,
  RequestRow,
  RequestType,
  ApprovalCase,
  ApprovalMatrixVersion,
  AuditLogRow,
  UnassignedUser,
} from "@/lib/api/types";
```

## Error Handling

All API functions return `ApiResult<T>`:

```typescript
import type { ApiResult } from "@/lib/api/core";

const result = await requests.getMyRequests();

if (result.ok) {
  // Use result.data
  console.log(result.data);
} else {
  // Handle error
  console.error(result.error.code, result.error.message);
}
```

## Base API Function

Direct API access if needed:

```typescript
import { apiGet, type ApiResult } from "@/lib/api/core";

const result = await apiGet<T>("/path/to/endpoint");
```

## Example Page

```typescript
import requests from "@/lib/api/requests";
import approvals from "@/lib/api/approvals";

export default async function MyPage() {
  const [myRequestsResult, inboxResult] = await Promise.all([
    requests.getMyRequests(100),
    approvals.getApprovalsInbox({ page_size: 100 }),
  ]);

  if (!myRequestsResult.ok) {
    return <div>Error: {myRequestsResult.error.message}</div>;
  }

  return (
    <div>
      <h1>My Requests: {myRequestsResult.data.total}</h1>
      {/* render list */}
    </div>
  );
}
```

## Benefits

✅ **Better Organization** — APIs grouped by entity/domain
✅ **Easy Discovery** — `import requests from ...` makes intent clear
✅ **Type Safety** — Full TypeScript support
✅ **Simple Imports** — Namespace pattern is intuitive
✅ **Maintainability** — Changes are isolated to single file per entity
✅ **Reusability** — Each function can be called independently
