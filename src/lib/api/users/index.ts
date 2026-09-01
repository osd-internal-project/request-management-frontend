/**
 * Users API (Keycloak)
 * 
 * Database: keycloak
 * Services: user-service
 */

import { apiGet, type ApiResult } from "../core";
import { type Paginated, type KeycloakUser } from "../types";

/** Get Keycloak users with optional search */
export async function getKeycloakUsers(options?: {
  page?: number;
  page_size?: number;
  q?: string;
}): Promise<ApiResult<Paginated<KeycloakUser>>> {
  const params = new URLSearchParams();
  params.set("page", String(options?.page ?? 1));
  params.set("page_size", String(options?.page_size ?? 50));
  if (options?.q) params.set("q", options.q);
  return apiGet<Paginated<KeycloakUser>>(`/users/keycloak?${params.toString()}`);
}


/** Grouped for `import usersApi from …` at call sites. */
const usersApi = {
  getKeycloakUsers,
};

export default usersApi;
