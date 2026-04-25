export const DEV_ACCESS_STORAGE_KEY = "collectionops-dev-access-user-v1";
export const DEV_ACCESS_COOKIE = "collectionops_dev_access";

export type DevAccessKind = "caleb" | "empty" | "demo";

export function isLocalhostHost(hostname: string): boolean {
  const clean = hostname.toLowerCase().trim();
  return clean === "localhost" || clean === "127.0.0.1";
}

export function isLocalDevelopmentClient(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;
  return isLocalhostHost(window.location.hostname);
}

export function isLocalDevelopmentRequestHost(hostHeader: string | null): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (!hostHeader) return false;
  const hostname = hostHeader.split(":")[0] ?? "";
  return isLocalhostHost(hostname);
}
