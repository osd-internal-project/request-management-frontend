import { Alert, Card, Empty, Tag } from "antd";
import Link from "next/link";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import users from "@/lib/api/users";
import type { KeycloakUser } from "@/lib/api/types";
import { messages } from "@/lib/messages";
import { ROUTES } from "@/lib/routes";

const PAGE_SIZE = 25;

/**
 * Prefer the stored display name — it carries the Thai courtesy title that
 * `firstName`/`lastName` do not, and it is what every other screen shows.
 */
function displayName(user: KeycloakUser): string {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "—"
  );
}

/** Only the date part of `startWork` carries meaning; the time is always 00:00. */
function startWork(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

/** Read-only user directory from this database, guarded by `user.read`. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = q?.trim() ?? "";
  const current = Math.max(Number(page) || 1, 1);

  const result = await users.getKeycloakUsers({
    page: current,
    page_size: PAGE_SIZE,
    q: query || undefined,
  });

  return (
    <div className="space-y-4">
      <div>
        <Title level={4} className="mb-0!">
          {messages.users.title}
        </Title>
        <Text type="secondary">{messages.users.subtitle}</Text>
      </div>

      <Card>
        {/* No `page` field: a new search starts at the first page, which is
            what dropping the parameter means. */}
        <form className="mb-4 flex max-w-xl gap-2" action={ROUTES.adminUsers}>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={messages.users.searchPlaceholder}
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-[#ff6600]"
          />
          <button
            type="submit"
            // className="rounded-md bg-[#ff6600] px-4 py-2 font-medium text-white hover:bg-[#e65c00]"
          >
            {messages.users.search}
          </button>
        </form>

        {!result.ok ? (
          <Alert
            type="error"
            showIcon
            title={messages.common.loadError}
            description={result.error.message}
          />
        ) : result.data.data.length === 0 ? (
          <Empty description={messages.users.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] border-collapse text-left">
              <thead className="border-y border-gray-200 bg-gray-50 text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.username}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.name}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.employeeId}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.position}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.team}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.leads}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.roles}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.email}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.extension}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.phone}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.startWork}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {result.data.data.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium">{user.username}</td>
                    <td className="px-4 py-3">{displayName(user)}</td>
                    <td className="px-4 py-3">{user.employeeId ?? "—"}</td>
                    <td className="px-4 py-3">{user.position ?? "—"}</td>
                    <td className="px-4 py-3">{user.orgUnitName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {user.managedUnitNames.length ? (
                        <span className="flex flex-wrap gap-1">
                          {user.managedUnitNames.map((unit) => (
                            <Tag key={unit} color="gold" className="m-0!">
                              {unit}
                            </Tag>
                          ))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.roles.length ? (
                        <span className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Tag key={role} className="m-0!">
                              {role}
                            </Tag>
                          ))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{user.email ?? "—"}</td>
                    <td className="px-4 py-3">{user.extension ?? "—"}</td>
                    <td className="px-4 py-3">{user.phone ?? "—"}</td>
                    <td className="px-4 py-3">{startWork(user.startWork)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          user.status === "ACTIVE" ? "text-green-700" : "text-gray-500"
                        }
                      >
                        {user.status === "ACTIVE"
                          ? messages.users.active
                          : messages.users.inactive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.ok && result.data.total > PAGE_SIZE && (
          <Pagination
            query={query}
            page={current}
            total={result.data.total}
            shown={result.data.data.length}
          />
        )}
      </Card>
    </div>
  );
}

/**
 * Links rather than buttons: the page is a server component and the whole
 * screen is addressable, so a page of the directory can be bookmarked and
 * opened in a new tab like anything else.
 *
 * Before this the screen asked for page 1 of 50 and nothing else — the
 * hundred-and-first account in the realm could not be reached at all.
 */
function Pagination({
  query,
  page,
  total,
  shown,
}: {
  query: string;
  page: number;
  total: number;
  shown: number;
}) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const last = page * PAGE_SIZE >= total;

  const href = (next: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (next > 1) params.set("page", String(next));

    return params.size
      ? `${ROUTES.adminUsers}?${params.toString()}`
      : ROUTES.adminUsers;
  };

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Text type="secondary" className="text-xs">
        {messages.users.page(from, from + shown - 1, total)}
      </Text>

      <span className="flex gap-2">
        {page > 1 && (
          <Link
            href={href(page - 1)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:border-[#ff6600]"
          >
            {messages.users.prev}
          </Link>
        )}
        {!last && (
          <Link
            href={href(page + 1)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:border-[#ff6600]"
          >
            {messages.users.next}
          </Link>
        )}
      </span>
    </div>
  );
}
