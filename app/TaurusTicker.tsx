"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultConfig, type StartpageConfig } from "./startpage-config";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mountObserver: MutationObserver | null = null;
    let classObserver: MutationObserver | null = null;

    const bind = () => {
      const root = document.querySelector<HTMLElement>(".taurusStartpage");
      if (!root) return false;

      const syncVisibility = () => setVisible(root.classList.contains("is-launched"));
      syncVisibility();
      classObserver = new MutationObserver(syncVisibility);
      classObserver.observe(root, { attributes: true, attributeFilter: ["class"] });
      return true;
    };

    if (!bind()) {
      mountObserver = new MutationObserver(() => {
        if (bind()) mountObserver?.disconnect();
      });
      mountObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      mountObserver?.disconnect();
      classObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTicker() {
      setLoading(true);
      try {
        let configured = defaultConfig.markets.slice(0, 8);

        const stateResponse = await fetch("/api/state", { cache: "no-store" });
        if (stateResponse.ok) {
          const state = (await stateResponse.json()) as StatePayload;
          const stored = state.config?.markets?.filter((item) => item.symbol).slice(0, 8);
          if (stored?.length) configured = stored;
        }

        const symbols = configured.map((item) => item.symbol).join(",");
        const marketResponse = await fetch(`/api/markets?symbols=${encodeURIComponent(symbols)}`, { cache: "no-store" });
        if (!marketResponse.ok) throw new Error("market");

        const quotes = (await marketResponse.json()) as MarketMap;
        if (cancelled) return;

        setItems(
          configured
            .filter((item) => quotes[item.symbol])
            .map((item) => ({
              symbol: item.symbol,
              name: item.name,
              value: quotes[item.symbol].value,
              change: quotes[item.symbol].change,
            })),
        );
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTicker();
    const timer = window.setInterval(loadTicker, 300_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const groupItems = useMemo(() => {
    if (!items.length) return [];
    const repeatCount = Math.max(2, Math.ceil(16 / items.length));
    return Array.from({ length: repeatCount }, () => items).flat();
  }, [items]);

  function renderGroup(group: number) {
    return (
      <div className="taurusTickerGroup" aria-hidden={group === 1}>
        {groupItems.map((item, index) => (
          <div className="taurusTickerItem" key={`${group}-${item.symbol}-${index}`}>
            <strong>{item.symbol}</strong>
            <span>{item.value}</span>
            <em className={item.change.startsWith("-") ? "down" : "up"}>{item.change}</em>
            <small>{item.name}</small>
          </div>
        ))}
      </div>
    );
  }

  return (
    <aside className={`taurusMarketTicker ${visible ? "is-visible" : ""}`} aria-label="Canlı piyasa bandı">
      <div className="taurusTickerLabel">MARKET</div>
      <div className="taurusTickerViewport">
        {groupItems.length ? (
          <div className="taurusTickerTrack">
            {renderGroup(0)}
            {renderGroup(1)}
          </div>
        ) : (
          <div className="taurusTickerEmpty">{loading ? "PİYASA BAĞLANTISI KURULUYOR" : "PİYASA VERİSİ ALINAMADI"}</div>
        )}
      </div>
      <div className="taurusTickerDelay">5 DK</div>
    </aside>
  );
}
