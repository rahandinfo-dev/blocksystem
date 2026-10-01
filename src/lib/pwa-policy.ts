/** PWA caching policy: server operations are always live. */
export function isSensitivePwaPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export function isCacheablePwaPath(pathname: string): boolean {
  if (isSensitivePwaPath(pathname)) return false;
  return (
    pathname === "/" ||
    pathname === "/offline" ||
    pathname === "/icon.png" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/_next/static/")
  );
}

export function canRetryRequest(method: string): boolean {
  return method.toUpperCase() === "GET";
}
