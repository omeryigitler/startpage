import type { Metadata } from "next";
import "./history.css";
import "./page-width-fix.css";
import "./workflow.css";
import "./history-ux.css";
import "./brand-refresh.css";
import HistoryUx from "./HistoryUx";
import HistoryBrandSync from "./HistoryBrandSync";

export const metadata: Metadata = {
  title: "The History Archived — Content Command Center",
  description: "Private production workspace for The History Archived.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function HistoryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <HistoryUx>
      {children}
      <HistoryBrandSync />
    </HistoryUx>
  );
}
