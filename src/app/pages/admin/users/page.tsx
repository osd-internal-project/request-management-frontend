import { Alert, Card, Empty } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import users from "@/lib/api/users";
import type { KeycloakUser } from "@/lib/api/types";
import { messages } from "@/lib/messages";

function displayName(user: KeycloakUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
}

/** Read-only Keycloak user directory, guarded by `user.read` in the API. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const result = await users.getKeycloakUsers({
    page: 1,
    page_size: 50,
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
        <form className="mb-4 flex max-w-xl gap-2" action="/pages/admin/users">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={messages.users.searchPlaceholder}
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-[#ff6600]"
          />
          <button
            type="submit"
            className="rounded-md bg-[#ff6600] px-4 py-2 font-medium text-white hover:bg-[#e65c00]"
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
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="border-y border-gray-200 bg-gray-50 text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.username}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.name}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.email}</th>
                  <th className="px-4 py-3 font-medium">{messages.users.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {result.data.data.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium">{user.username}</td>
                    <td className="px-4 py-3">{displayName(user)}</td>
                    <td className="px-4 py-3">{user.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={user.enabled ? "text-green-700" : "text-gray-500"}>
                        {user.enabled ? messages.users.active : messages.users.inactive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
