/**
 * Single connection point between the UNILUS student app and the central admin app.
 * Server-only: the integration key must never reach the browser, so client components
 * go through this app's own `/api/*` routes.
 */

export const PORTAL_TIMEOUT_MS = 8000;

export class PortalError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type PortalConfig = { baseUrl: string; key: string };

/** Returns `null` when ADMIN_APP_URL or STUDENT_APP_API_KEY is missing or invalid. */
export function getPortalConfig(): PortalConfig | null {
  const raw = process.env.ADMIN_APP_URL?.trim().replace(/\/+$/, "");
  const key = process.env.STUDENT_APP_API_KEY?.trim();
  if (!raw || !key) return null;
  try {
    const { protocol } = new URL(raw);
    if (protocol !== "http:" && protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { baseUrl: raw, key };
}

export const portalAdminUrl = () => {
  const config = getPortalConfig();
  return config ? new URL("/admin", config.baseUrl).href : null;
};

type PortalInit = {
  method?: "GET" | "POST" | "PATCH";
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
};

/**
 * Calls an admin `/api/integration/*` endpoint with the shared key and a timeout.
 * Throws `PortalError` (503 when unconfigured, 502 when unreachable); the caller handles HTTP status codes.
 */
export async function portalRequest(path: string, init: PortalInit = {}): Promise<Response> {
  const config = getPortalConfig();
  if (!config) throw new PortalError("Central admin integration is not configured.", 503);
  const url = new URL(`${config.baseUrl}/api/integration/${path.replace(/^\/+/, "")}`);
  for (const [name, value] of Object.entries(init.query ?? {})) if (value) url.searchParams.set(name, value);
  const method = init.method ?? "GET";
  try {
    return await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-student-app-key": config.key },
      cache: "no-store",
      signal: AbortSignal.timeout(PORTAL_TIMEOUT_MS),
      ...(method !== "GET" ? { body: JSON.stringify(init.body ?? {}) } : {}),
    });
  } catch (error) {
    console.error("[portal] admin app unreachable", { path, error: error instanceof Error ? error.name : "UnknownError" });
    throw new PortalError("Central admin is temporarily unavailable.", 502);
  }
}
