import { renderReceiptPdf } from "@/features/calculator/lib/receipt-pdf";
import type { ReceiptData } from "@/features/calculator/lib/receipt-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isReceiptData(value: unknown): value is ReceiptData {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<ReceiptData>;
  return (
    typeof receipt.reference === "string" &&
    typeof receipt.generatedAt === "string" &&
    typeof receipt.fileName === "string" &&
    !!receipt.scope &&
    (receipt.scope.kind === "room" || receipt.scope.kind === "wall") &&
    typeof receipt.scope.label === "string" &&
    Array.isArray(receipt.dimensions) &&
    Array.isArray(receipt.doors) &&
    Array.isArray(receipt.windows) &&
    !!receipt.block &&
    !!receipt.result
  );
}

function safeFileName(fileName: string): string {
  return fileName.replace(/[^A-Za-z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { receipt?: unknown };
    if (!isReceiptData(body.receipt)) {
      return Response.json({ error: "Invalid receipt data." }, { status: 400 });
    }

    const pdf = await renderReceiptPdf(body.receipt);
    const fileName = safeFileName(body.receipt.fileName);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.byteLength),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Receipt PDF generation failed", error);
    return Response.json({ error: "Receipt PDF generation failed." }, { status: 500 });
  }
}
