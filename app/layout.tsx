import type { Metadata } from "next";
import "./globals.css";
import "./folder-glass.css";
import "./home-overrides.css";
import "./active-home.css";

export const metadata: Metadata = {
  title: "Startpage — Ömer Yiğitler",
  description: "Ömer Yiğitler için kişisel başlangıç sayfası",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
