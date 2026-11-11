import { AGENCY_ORIGIN } from "./agency-model";
export class AgencyError extends Error {
  constructor(message: string, public login = false) { super(message); }
}
export async function agencyApi<T>(action: string, body?: unknown, signal?: AbortSignal, query?: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ action: `studio-${action}`, ...query });
  const response = await fetch(`${AGENCY_ORIGIN}/api/agent?${params}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal, credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) throw new AgencyError(response.status === 401 ? "Renew your Gateway session to access agency records." : result.error || "The request could not be completed. Try again.", response.status === 401);
  return result as T;
}
