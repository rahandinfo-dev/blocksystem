"use client";

import type { ReceiptData } from "./receipt-data";

function isPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/** Requests the Node-rendered, Fontkit-shaped PDF and downloads the real blob. */
export async function downloadReceiptPdf(receipt: ReceiptData): Promise<number> {
  const response = await fetch("/api/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt }),
  });

  if (!response.ok) {
    throw new Error("دروستکردنی فایلێکی PDF سەرکەوتوو نەبوو.");
  }

  const blob = await response.blob();
  const signature = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  if (blob.size < 500 || !isPdfSignature(signature)) {
    throw new Error("فایلی PDF دروست نەکرا.");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = receipt.fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  return blob.size;
}
