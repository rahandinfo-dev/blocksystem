import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

const nrt = localFont({
  src: "./fonts/NRT-Reg.ttf",
  variable: "--font-nrt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سیستەمی بلۆکی براندی ڕێک",
  description: "حیسابکردنی ژمارەی بلۆک و تێچووی بیناسازی بە شێوەی خێرا و ورد",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ckb" dir="rtl" className={nrt.variable}>
      <body>{children}</body>
    </html>
  );
}
