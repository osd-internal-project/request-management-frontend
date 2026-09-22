"use client";

import { useEffect, useRef } from "react";
import { SESSION_EXPIRED_PATH } from "@/lib/routes";

/** Events that count as the user still being here. */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll"] as const;

/**
 * Keeps a session alive while it is being used, and ends it when it is not
 * (AUTH-02).
 *
 * Renders nothing. Mounted once in the authenticated layout, it renews the
 * tokens every few minutes so the user never meets an expired token mid-task,
 * and stops renewing — sending the browser to logout — once they have been
 * idle past the timeout.
 *
 * The cookies are capped at the same idle window server-side, so this component
 * is the courteous half of the mechanism, not the enforcing one. A browser that
 * throttles background timers, or a laptop that slept, simply arrives at the
 * next navigation with expired cookies and is bounced by the proxy, which is
 * the same outcome by a slower road.
 */
export function SessionKeeper({
  idleTimeoutSeconds,
  refreshIntervalSeconds,
}: {
  idleTimeoutSeconds: number;
  refreshIntervalSeconds: number;
}) {
  // A ref, not state: this is written on every scroll tick, and re-rendering
  // the whole shell for a mouse movement would be absurd. Seeded in the effect
  // rather than here — reading the clock during render is not pure.
  const lastActivityRef = useRef(0);

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    // Mounting counts as activity: the user just navigated here.
    markActive();

    // Coming back to a backgrounded tab is activity; leaving it is not.
    const onVisibility = () => {
      if (document.visibilityState === "visible") markActive();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const expire = () => {
      stopped = true;
      // A full navigation, not `router.push`: logout has to leave the SPA and
      // pass through Keycloak's end-session endpoint (AUTH-03).
      window.location.href = SESSION_EXPIRED_PATH;
    };

    /**
     * `setTimeout` rescheduled each round rather than `setInterval`, because
     * the delay is not fixed: a realm configured with a token life shorter
     * than the refresh interval would otherwise let the cookie die between
     * ticks, and every navigation would detour through the proxy's renewal.
     */
    const scheduleNext = (seconds: number) => {
      if (stopped) return;
      timer = setTimeout(tick, seconds * 1000);
    };

    const tick = async () => {
      if (stopped) return;

      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= idleTimeoutSeconds * 1000) return expire();

      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        if (!response.ok) return expire();

        const body = (await response.json()) as { expires_in?: number };

        // Renew at 80% of the token's real life when that is sooner than the
        // configured interval, so the cookie is never allowed to lapse first.
        const safeInterval = body.expires_in
          ? Math.min(refreshIntervalSeconds, body.expires_in * 0.8)
          : refreshIntervalSeconds;

        scheduleNext(safeInterval);
      } catch {
        // Offline or the BFF is down. Ending the session here would log out
        // anyone who walked through a tunnel, so we keep the existing tokens
        // and try again — the cookie's own expiry remains the backstop.
        scheduleNext(refreshIntervalSeconds);
      }
    };

    scheduleNext(refreshIntervalSeconds);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [idleTimeoutSeconds, refreshIntervalSeconds]);

  return null;
}
