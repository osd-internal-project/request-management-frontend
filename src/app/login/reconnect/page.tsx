import { Alert } from "antd";
import { Info, RefreshCw } from "lucide-react";
import { loginErrorMessage, messages } from "@/lib/messages";
import { AUTH_LOGIN_PATH } from "@/lib/routes";

/**
 * The one screen shown in place of Keycloak's login form.
 *
 * The application has no login page: `proxy.ts` sends every unauthenticated
 * request to `/api/auth/login`, which forwards it to the identity provider.
 * This page exists for the state that redirect cannot express — the BFF's
 * `fetch` to the backend threw, so bouncing again would repeat a call that
 * cannot succeed until something outside this application comes back up.
 *
 * `lib/auth-redirects.ts` decides what lands here; nothing else should link to
 * it. The retry is a plain link to the same BFF route, so it works before any
 * JavaScript has hydrated.
 */
export default async function ReconnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  const retryHref = from
    ? `${AUTH_LOGIN_PATH}?from=${encodeURIComponent(from)}`
    : AUTH_LOGIN_PATH;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-6 py-12 text-[14px] text-[#26323e]">
      <div className="w-full max-w-[546px]">
        <header className="mb-8 text-left">
          <h1 className="text-[32px] leading-tight font-bold tracking-[-0.035em] text-[#28323c]">
            {messages.login.reconnect.title}
          </h1>
          <p className="mt-4 text-[18px] leading-7 text-[#5a6875]">
            {messages.login.reconnect.subtitle}
          </p>
        </header>

        {errorMessage && (
          <Alert
            type="error"
            showIcon
            title={errorMessage}
            className="mb-5! rounded-xl!"
          />
        )}

        <a
          href={retryHref}
          className="flex min-h-[58px] w-full items-center justify-center gap-4 rounded-xl bg-[#3B82F6] px-6 text-[18px] font-bold text-white transition-colors hover:bg-[#2563EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
        >
          <RefreshCw className="size-6" strokeWidth={2.25} aria-hidden="true" />
          <span>{messages.login.reconnect.retryButton}</span>
        </a>

        <div className="mt-5 flex gap-4 rounded-xl bg-[#e7eef4] px-5 py-5 text-[#3d5a70]">
          <Info className="mt-0.5 size-6 shrink-0" strokeWidth={2} aria-hidden="true" />
          <p className="text-[16px] leading-7">{messages.login.reconnect.hint}</p>
        </div>

        <div className="mt-9 border-t border-[#ddd8d2] pt-6 text-[16px] leading-7 text-[#7b8792]">
          <p>
            {messages.login.reconnect.contactPrefix}{" "}
            <a
              href="mailto:it-support@company.co.th"
              className="font-medium text-[#3d5d77] underline underline-offset-2"
            >
              it-support@company.co.th
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
