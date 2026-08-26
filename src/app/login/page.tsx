import { Alert } from "antd";
import { Check, Info, LockKeyhole } from "lucide-react";
import { loginErrorMessage, messages } from "@/lib/messages";

/**
 * Screen 1 — เข้าสู่ระบบ (AUTH-01).
 *
 * A single SSO button and no password field: credentials are typed into
 * Keycloak's own page, so this application never sees them. The button is a
 * plain link to the BFF route, which means login works before any JavaScript
 * has hydrated.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const { error, from } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  const loginHref = from
    ? `/api/auth/login?from=${encodeURIComponent(from)}`
    : "/api/auth/login";

  return (
    <main className="min-h-screen bg-[#fdfcfb] text-[14px] text-[#26323e]">
      <div className="grid min-h-screen lg:grid-cols-[40.7%_59.3%]">
        <aside className="relative hidden min-h-screen flex-col bg-[#24313d] px-[52px] py-16 text-white lg:flex">
          <div className="flex items-center gap-4 text-[18px] font-bold tracking-tight">
            <span className="size-[14px] rounded-full bg-[#e99855]" aria-hidden="true" />
            <span>{messages.app.name}</span>
          </div>

          <div className="login-marketing-content absolute right-[52px] left-[52px] max-w-[430px]">
            <h1 className="max-w-[430px] text-[36px] leading-[1.25] font-bold tracking-[-0.04em]">
              {messages.app.tagline}
            </h1>
            <p className="mt-9 max-w-[430px] text-[14px] leading-[1.65] font-medium text-[#c4cbd2]">
              {messages.login.marketingDescription}
            </p>
            <ul className="mt-10 space-y-5 text-[14px] font-medium text-[#d6dbe0]">
              {messages.login.highlights.map((highlight) => (
                <li key={highlight} className="flex items-center gap-4">
                  <Check className="size-5 shrink-0 text-[#e99855]" strokeWidth={2.5} aria-hidden="true" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="absolute bottom-12 left-[52px] text-[14px] text-[#9ba6b0]">
            {messages.app.version}
          </p>
        </aside>

        <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[546px]">
            <header className="mb-10 text-left">
              <h2 className="text-[32px] leading-tight font-bold tracking-[-0.035em] text-[#28323c]">
                {messages.login.title}
              </h2>
              <p className="mt-4 text-[18px] leading-7 text-[#5a6875]">
                {messages.login.subtitle}
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
              href={loginHref}
              className="flex min-h-[58px] w-full items-center justify-center gap-4 rounded-xl bg-[#ba5d2d] px-6 text-[18px] font-bold text-white transition-colors hover:bg-[#a95126] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba5d2d]"
            >
              <LockKeyhole className="size-6" strokeWidth={2.25} aria-hidden="true" />
              <span>{messages.login.ssoButton}</span>
            </a>

            <div className="mt-5 flex gap-4 rounded-xl bg-[#e7eef4] px-5 py-5 text-[#3d5a70]">
              <Info className="mt-0.5 size-6 shrink-0" strokeWidth={2} aria-hidden="true" />
              <p className="text-[16px] leading-7">{messages.login.ssoHint}</p>
            </div>

            <div className="mt-9 border-t border-[#ddd8d2] pt-6 text-[16px] leading-7 text-[#7b8792]">
              <p className="font-semibold">{messages.login.pendingTitle}</p>
              <p>
                {messages.login.pendingContactPrefix}{" "}
                <a
                  href="mailto:it-support@company.co.th"
                  className="font-medium text-[#3d5d77] underline underline-offset-2"
                >
                  it-support@company.co.th
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
