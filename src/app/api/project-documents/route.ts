import { renderProjectDocumentPdf } from "@/features/calculator/lib/project-document-pdf";
import { authorized, limitedJson, sameOrigin } from "@/lib/verification-auth";
import { verificationStore } from "@/lib/verification-store";
import {
  validToken,
  verificationOrigin,
  verificationUrl,
} from "@/lib/verification";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request) || !authorized(request))
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const body = (await limitedJson(request)) as {
      token?: unknown;
      language?: unknown;
    };
    if (
      typeof body.token !== "string" ||
      !validToken(body.token) ||
      !["ku", "ar", "en-GB"].includes(String(body.language))
    )
      return Response.json({ error: "invalid" }, { status: 400 });
    const record = await verificationStore().get(body.token);
    if (!record?.snapshot)
      return Response.json({ error: "invalid" }, { status: 404 });
    const pdf = await renderProjectDocumentPdf(
      record.snapshot,
      body.language as "ku" | "ar" | "en-GB",
      {
        url: verificationUrl(verificationOrigin(), record.verificationToken),
        reference: record.documentReference,
        fingerprint: record.fingerprint,
        revoked: record.status === "revoked",
      },
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${record.snapshot.fileName.replace(/[^A-Za-z0-9._-]/g, "-")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
