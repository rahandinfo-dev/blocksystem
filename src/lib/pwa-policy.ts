/** PWA caching policy: server data and public verification are always live. */
export function isSensitivePwaPath(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/verify/");
}

export function isCacheablePwaPath(pathname: string): boolean {
  if (isSensitivePwaPath(pathname)) return false;
  return (
    pathname === "/" ||
    pathname === "/offline" ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/")
  );
}

export function canRetryRequest(method: string): boolean {
  return method.toUpperCase() === "GET";
}
