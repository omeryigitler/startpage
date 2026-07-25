import type { Metadata } from "next";
import "./globals.css";
import "./folder-glass.css";
import "./home-overrides.css";
import "./active-home.css";
import "./full-width-search.css";
import "./center-os-base.css";
import "./center-os-slider.css";
import "./center-os-responsive.css";
import "./folder-premium.css";
import "./taurus-startpage.css";
import "./taurus-console.css";
import "./taurus-carousel-fix.css";
import TaurusTicker from "./TaurusTicker";

export const metadata: Metadata = {
  title: "Startpage — Ömer Yiğitler",
  description: "Ömer Yiğitler için kişisel başlangıç sayfası",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <TaurusTicker />
      </body>
    </html>
  );
}
