import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
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
import "./history-entry.css";
import TaurusTicker from "./TaurusTicker";
import TaurusCommandBridge from "./TaurusCommandBridge";
import TaurusCommandEnhancements from "./TaurusCommandEnhancements";
import { LOGO_IMAGE as HISTORY_LOGO_IMAGE } from "./history/assets";

export const metadata: Metadata = {
  title: "Startpage — Ömer Yiğitler",
  description: "Ömer Yiğitler's personal command startpage",
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
  const brandStyle = {
    "--history-project-logo": `url("${HISTORY_LOGO_IMAGE}")`,
  } as CSSProperties;

  return (
    <html lang="en" style={brandStyle}>
      <body>
        {children}
        <TaurusTicker />
        <TaurusCommandBridge />
        <TaurusCommandEnhancements />
      </body>
    </html>
  );
}
