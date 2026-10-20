/**
 * API layer — organized by entity/domain (database tables)
 *
 * Usage:
 *   import requests from "@/lib/api/requests";
 *   await requests.getMyRequests();
 *
 *   import approvals from "@/lib/api/approvals";
 *   await approvals.getApprovalsInbox();
 *
 *   import users from "@/lib/api/users";
 *   await users.getKeycloakUsers();
 */

// Re-export common utilities
export { apiGet, type ApiError, type ApiResult } from "./core";
export * from "./types";

// Entity-specific exports
export { default as requests } from "./requests";
export { default as approvals } from "./approvals";
export { default as users } from "./users";
export { default as orgUnits } from "./org-units";
export { default as audit } from "./audit";
export { default as admin } from "./admin";
export { default as notifications } from "./notifications";
export { default as bi } from "./bi";
export { default as apiKeys } from "./api-keys";
export { default as webhooks } from "./webhooks";
export { default as erpSync } from "./erp-sync";
export { default as products } from "./products";
export { default as customers } from "./customers";
