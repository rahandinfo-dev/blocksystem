"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
export function ProjectQr({
  url,
  reference,
}: {
  url: string;
  reference: string;
}) {
  const { t } = useI18n();
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    void import("qrcode")
      .then(async (QR) => {
        const options = {
          errorCorrectionLevel: "M" as const,
          margin: 4,
          width: 320,
        };
        const [image, vector] = await Promise.all([
          QR.toDataURL(url, options),
          QR.toString(url, { ...options, type: "svg" }),
        ]);
        if (live) {
          setPng(image);
          setSvg(
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vector)}`,
          );
        }
      })
      .catch(() => {
        if (live) setMessage(t("documents.error"));
      });
    return () => {
      live = false;
    };
  }, [url, t]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(t("documents.copied"));
    } catch {
      setMessage(t("documents.copyFailed"));
    }
  };
  const filename = reference.replace(/[^A-Za-z0-9_-]/g, "-");
  return (
    <div
      className="verification-qr mt-4 max-w-full"
      dir="ltr"
      style={{ direction: "ltr", transform: "none" }}
    >
      {png ? (
        <Image
          unoptimized
          src={png}
          alt={t("documents.scan")}
          width={320}
          height={320}
          className="aspect-square h-auto w-48 max-w-full bg-white"
          style={{ transform: "none" }}
        />
      ) : null}
      <p className="mt-2 break-all text-sm">
        <bdi>{reference}</bdi>
      </p>
      <a href={url} className="block break-all text-xs underline">
        {url}
      </a>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="min-h-11 rounded-lg border px-3 text-sm"
        >
          {t("documents.copy")}
        </button>
        {png ? (
          <a
            href={png}
            download={`${filename}-QR.png`}
            className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm"
          >
            {t("documents.png")}
          </a>
        ) : null}
        {svg ? (
          <a
            href={svg}
            download={`${filename}-QR.svg`}
            className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm"
          >
            {t("documents.svg")}
          </a>
        ) : null}
      </div>
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </div>
  );
}
