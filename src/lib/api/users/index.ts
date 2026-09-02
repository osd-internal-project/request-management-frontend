/**
 * Users API (Keycloak)
 * 
 * Database: keycloak
 * Services: user-service
 */

import { apiGet, type ApiResult } from "../core";
import {
  type DirectoryUser,
  type Paginated,
  type KeycloakUser,
} from "../types";

/**
 * The ceiling `PageQueryDto` enforces on every list endpoint
 * (`libs/share/src/http/pagination.ts`). Asking for more is a 422, not a
 * larger page — which is how the ยื่นคำขอ screen ended up with an empty
 * ผู้รับเรื่อง list after requesting 200 in one go.
 */
const MAX_PAGE_SIZE = 100;

/** Stops a wrong `total` from turning one screen load into a hundred calls. */
const MAX_DIRECTORY_PAGES = 20;

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


/** One page of `GET /users` (§11.2) — the local directory, not the realm. */
function getDirectoryUsers(page: number) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(MAX_PAGE_SIZE),
  });

  return apiGet<Paginated<DirectoryUser>>(`/users?${params.toString()}`);
}

/**
 * Every colleague the caller may see, across as many pages as it takes.
 *
 * A picker that has to offer "anyone in the company" cannot be served by one
 * request: the shared page ceiling is 100, so a company of 140 people silently
 * loses 40 of them — or, if the caller asks for 200 to dodge that, loses all
 * 140 to a validation error.
 *
 * A page that fails mid-way returns what was already collected rather than
 * nothing: a short list is a usable picker, an empty one is a dead form.
 */
export async function getAllDirectoryUsers(): Promise<
  ApiResult<DirectoryUser[]>
> {
  const first = await getDirectoryUsers(1);
  if (!first.ok) return first;

  const pages = Math.min(
    Math.ceil(first.data.total / MAX_PAGE_SIZE),
    MAX_DIRECTORY_PAGES,
  );

  if (pages <= 1) return { ok: true, data: first.data.data };

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      getDirectoryUsers(index + 2),
    ),
  );

  return {
    ok: true,
    data: rest.reduce(
      (all, result) => (result.ok ? [...all, ...result.data.data] : all),
      first.data.data,
    ),
  };
}

/** Grouped for `import usersApi from …` at call sites. */
const usersApi = {
  getKeycloakUsers,
  getAllDirectoryUsers,
};

export default usersApi;
