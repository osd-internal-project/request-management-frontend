import { NextRequest } from "next/server";

export function appOrigin(request: NextRequest): string {
  /*
    Configured, so it cannot be spoofed by a forged `Host` — and it is the same
    value that has to be registered in Keycloak as a valid redirect URI, which
    makes the two impossible to drift apart. Set it in deployment; leave it
    unset in development and the header below is right anyway.
  */
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const proto =
    forwardedValue(request, "x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");

  // Set only by a reverse proxy; ahead of `host`, which such a proxy overwrites
  // with its own upstream address.
  const host =
    forwardedValue(request, "x-forwarded-host") ?? request.headers.get("host");

  return host ? `${proto}://${host}` : request.nextUrl.origin;
}


export function isSecureOrigin(request: NextRequest): boolean {
  return appOrigin(request).startsWith("https:");
}

/** First entry of a forwarded header — proxies append, they do not replace. */
function forwardedValue(request: NextRequest, header: string): string | null {
  const value = request.headers.get(header)?.split(",")[0]?.trim();

  return value ? value : null;
}
