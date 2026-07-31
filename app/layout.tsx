import type { Metadata, Viewport } from "next";
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
import "./taurus-listening-cleanup.css";
import "./taurus-weather-command.css";
import TaurusTicker from "./TaurusTicker";
import TaurusCommandBridge from "./TaurusCommandBridge";
import TaurusCommandEnhancements from "./TaurusCommandEnhancements";

export const metadata: Metadata = {
  title: "Startpage — Ömer Yiğitler",
  description: "Ömer Yiğitler için kişisel başlangıç sayfası",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Startpage",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <TaurusTicker />
        <TaurusCommandBridge />
        <TaurusCommandEnhancements />
      </body>
    </html>
  );
}
