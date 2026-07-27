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
import "./taurus-ticker-loop.css";
import "./taurus-final-polish.css";
import "./taurus-open-module.css";
import "./taurus-command-bridge.css";
import "./taurus-command-labels.css";
import TaurusTicker from "./TaurusTicker";
import TaurusCommandBridge from "./TaurusCommandBridge";

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
        <TaurusCommandBridge />
      </body>
    </html>
  );
}
