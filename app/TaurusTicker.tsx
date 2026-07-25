"use client";

import { useEffect, useMemo, useState } from "react";
import type { StartpageConfig } from "./startpage-config";

type MarketQuote = { value: string; change: string };
type MarketMap = Record<string, MarketQuote>;
type StatePayload = { config?: StartpageConfig; hasStoredState?: boolean };

type TickerItem = {
  symbol: string;
  name: string;
  value: string;
  change: string;
};

export default function TaurusTicker() {
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".taurusStartpage");
    if (!root) return;

    const syncVisibility = () => setVisible(root.classList.contains("is-launched"));
    syncVisibility();

    const observer = new MutationObserver(syncVisibility);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTicker() {
      try {
        const stateResponse = await fetch("/api/state", { cache: "no-store" });
        const state = (await stateResponse.json()) as StatePayload;
        const configured = state.config?.markets?.filter((item) => item.symbol).slice(0, 8) || [];
        if (!configured.length) return;

        const symbols = configured.map((item) => item.symbol).join(",");
        const marketResponse = await fetch(`/api/markets?symbols=${encodeURIComponent(symbols)}`, { cache: "no-store" });
        if (!marketResponse.ok) return;

        const quotes = (await marketResponse.json()) as MarketMap;
        if (cancelled) return;

        setItems(
          configured.map((item) => ({
            symbol: item.symbol,
            name: item.name,
            value: quotes[item.symbol]?.value || "—",
            change: quotes[item.symbol]?.change || "—",
          })),
        );
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    loadTicker();
    const timer = window.setInterval(loadTicker, 300_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const loopItems = useMemo(() => {
    if (!items.length) return [];
    return [...items, ...items];
  }, [items]);

  return (
    <aside className={`taurusMarketTicker ${visible ? "is-visible" : ""}`} aria-label="Canlı piyasa bandı">
      <div className="taurusTickerLabel">MARKET FEED</div>
      <div className="taurusTickerViewport">
        {loopItems.length ? (
          <div className="taurusTickerTrack">
            {loopItems.map((item, index) => (
              <div className="taurusTickerItem" key={`${item.symbol}-${index}`}>
                <strong>{item.symbol}</strong>
                <span>{item.value}</span>
                <em className={item.change.startsWith("-") ? "down" : "up"}>{item.change}</em>
                <small>{item.name}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="taurusTickerEmpty">PIYASA VERİSİ BEKLENİYOR</div>
        )}
      </div>
      <div className="taurusTickerDelay">5 DK GECİKMELİ</div>
    </aside>
  );
}
