import { enforceRateLimit } from "@/lib/rate-limit";
import { safeServerError } from "@/lib/server-env";
import { validToken } from "@/lib/verification";
import { lookup } from "@/lib/verification-service";
import { verificationStore } from "@/lib/verification-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!validToken(token))
      return Response.json(
        { record: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    const store = verificationStore();
    if (!(await enforceRateLimit(store, request, "public")))
      return Response.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: { "Cache-Control": "no-store", "Retry-After": "60" },
        },
      );
    return Response.json(
      { record: await lookup(store, token) },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    safeServerError(error);
    return Response.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
