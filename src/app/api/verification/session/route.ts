import {
  authorized,
  limitedJson,
  passwordMatches,
  sameOrigin,
  sessionCookie,
} from "@/lib/verification-auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  let authenticated = false;
  try {
    authenticated = authorized(request);
  } catch {
    /* Unconfigured service remains signed out. */
  }
  return Response.json(
    { authenticated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const body = (await limitedJson(request)) as { password?: unknown };
    if (
      typeof body.password !== "string" ||
      body.password.length > 1024 ||
      !passwordMatches(body.password)
    )
      return Response.json({ error: "unauthorized" }, { status: 401 });
    return Response.json(
      { ok: true },
      {
        headers: { "Set-Cookie": sessionCookie(), "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie":
        "bs-verification-admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    },
  });
}
