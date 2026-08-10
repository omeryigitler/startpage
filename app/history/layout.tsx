import type { Metadata } from "next";
import "./history.css";

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
  return children;
}
