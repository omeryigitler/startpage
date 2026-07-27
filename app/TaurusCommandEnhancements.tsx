"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  MoonStar,
  Snowflake,
  Sun,
  Wind,
  X,
} from "lucide-react";
import { normalizeCommand } from "./command-router";

const WEATHER_EVENT = "taurus:weather-request";
const WEATHER_PATTERN = /\b(hava|weather|sicaklik|derece|meteoroloji)\b/i;
const WEATHER_ONLY_WORDS = /\b(hava|durumu|weather|sicaklik|derece|meteoroloji|kac|bugun|simdi|nasil)\b/gi;

const WEATHER_LOCATIONS = [
  {
    name: "Sliema",
    country: "Malta",
    latitude: 35.9122,
    longitude: 14.5042,
    timezone: "Europe/Malta",
    aliases: ["sliema", "malta"],
  },
  {
    name: "Eskişehir",
    country: "Türkiye",
    latitude: 39.7767,
    longitude: 30.5206,
    timezone: "Europe/Istanbul",
    aliases: ["eskisehir", "eskişehir"],
  },
  {
    name: "Wetteren",
    country: "Belçika",
    latitude: 51.0069,
    longitude: 3.8855,
    timezone: "Europe/Brussels",
    aliases: ["wetteren", "gent", "ghent"],
  },
] as const;

type WeatherPayload = {
  temp: number;
  feels: number;
  text: string;
  high: number;
  low: number;
  rain: number;
  wind: number;
  code: number;
  isDay: boolean;
  error?: string;
};

type WeatherView = WeatherPayload & {
  city: string;
  country: string;
};

function safeHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function isExplicitWebQuery(value: string) {
  const raw = String(value || "").trim();
  return raw.startsWith("?") || /^(g|web)\s*:/i.test(raw);
}

function isWeatherQuery(value: string) {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("@") || isExplicitWebQuery(raw) || /^a\s*:/i.test(raw)) return false;
  return WEATHER_PATTERN.test(normalizeCommand(raw));
}

function weatherQueryFromGoogleUrl(value: string) {
  try {
    const parsed = new URL(value);
    if (!/(^|\.)google\./i.test(parsed.hostname) || !parsed.pathname.includes("search")) return null;
    const query = parsed.searchParams.get("q") || "";
    return WEATHER_PATTERN.test(normalizeCommand(query)) ? query : null;
  } catch {
    return null;
  }
}

function findWeatherLocation(query: string) {
  const normalized = normalizeCommand(query);
  const matched = WEATHER_LOCATIONS.find((location) =>
    location.aliases.some((alias) => normalized.includes(normalizeCommand(alias))),
  );
  if (matched) return matched;

  const remaining = normalized
    .replace(WEATHER_ONLY_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  WEATHER_ONLY_WORDS.lastIndex = 0;

  return remaining ? null : WEATHER_LOCATIONS[0];
}

function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
  const props = { size: 52, strokeWidth: 1.45, "aria-hidden": true } as const;
  if (code === 0) return isDay ? <Sun {...props} /> : <MoonStar {...props} />;
  if (code === 1 || code === 2) return <CloudSun {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code === 45 || code === 48) return <CloudFog {...props} />;
  if (code >= 71 && code <= 77) return <Snowflake {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;
  if (code >= 51 && code <= 82) return <CloudRain {...props} />;
  return <CloudSun {...props} />;
}

export default function TaurusCommandEnhancements() {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [weather, setWeather] = useState<WeatherView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let observer: MutationObserver | null = null;
    const bind = () => {
      const expansion = document.querySelector<HTMLElement>(".searchExpansion");
      if (!expansion) return false;
      setPortal(expansion);
      return true;
    };
    if (!bind()) {
      observer = new MutationObserver(() => {
        if (bind()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    const nativeOpen = window.open.bind(window);
    const patchedOpen: typeof window.open = ((url?: string | URL, target?: string, features?: string) => {
      const rawUrl = typeof url === "string" ? url : url?.toString() || "";
      const currentInput = document.querySelector<HTMLInputElement>(".centerSearchForm input")?.value || "";
      const weatherQuery = weatherQueryFromGoogleUrl(rawUrl);
      if (weatherQuery && !isExplicitWebQuery(currentInput)) {
        window.dispatchEvent(new CustomEvent(WEATHER_EVENT, { detail: { query: weatherQuery } }));
        return window;
      }

      const safe = safeHttpUrl(rawUrl);
      if (safe && (target === "_blank" || !target) && /noopener|noreferrer/i.test(features || "")) {
        const anchor = document.createElement("a");
        anchor.href = safe;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return window;
      }

      return nativeOpen(url as string, target, features);
    }) as typeof window.open;

    window.open = patchedOpen;
    return () => {
      if (window.open === patchedOpen) window.open = nativeOpen;
    };
  }, []);

  useEffect(() => {
    const syncLabel = (value: string) => {
      const form = document.querySelector<HTMLFormElement>(".centerSearchForm");
      const expansion = form?.closest<HTMLElement>(".searchExpansion");
      const active = isWeatherQuery(value);
      expansion?.classList.toggle("taurus-weather-query", active);
      if (form && active) {
        form.dataset.commandMode = "weather";
        form.dataset.commandLabel = "HAVA";
      }
    };

    const onInput = (event: Event) => {
      const target = event.target instanceof HTMLInputElement ? event.target : null;
      if (!target?.closest(".centerSearchForm")) return;
      syncLabel(target.value);
      if (!isWeatherQuery(target.value)) {
        setWeather(null);
        setError("");
      }
    };

    const onWeather = async (event: Event) => {
      const query = (event as CustomEvent<{ query?: string }>).detail?.query || "hava durumu";
      const location = findWeatherLocation(query);
      setWeather(null);
      setError("");
      document.querySelector<HTMLButtonElement>(".taurusCommandPanel>header>button")?.click();

      if (!location) {
        setLoading(false);
        setError("Şehir bulunamadı. Sliema, Eskişehir veya Wetteren yazarak tekrar deneyin.");
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          lat: String(location.latitude),
          lon: String(location.longitude),
          timezone: location.timezone,
        });
        const response = await fetch(`/api/weather?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json()) as WeatherPayload;
        if (!response.ok || payload.error) throw new Error(payload.error || "Hava durumu alınamadı.");
        setWeather({ ...payload, city: location.name, country: location.country });
      } catch (weatherError) {
        setError(weatherError instanceof Error ? weatherError.message : "Hava durumu alınamadı.");
      } finally {
        setLoading(false);
      }
    };

    document.addEventListener("input", onInput);
    window.addEventListener(WEATHER_EVENT, onWeather);
    return () => {
      document.removeEventListener("input", onInput);
      window.removeEventListener(WEATHER_EVENT, onWeather);
    };
  }, []);

  if (!portal || (!weather && !loading && !error)) return null;

  return createPortal(
    <section className="taurusWeatherCard" aria-live="polite">
      <header>
        <div><span /><strong>HAVA DURUMU</strong><small>{loading ? "GÜNCELLENİYOR" : error ? "BAĞLANTI HATASI" : "GÜNCEL"}</small></div>
        <button type="button" onClick={() => { setWeather(null); setError(""); }} aria-label="Hava durumunu kapat"><X size={15} /></button>
      </header>

      {loading && <div className="taurusWeatherLoading">ATMOSFER VERİSİ ALINIYOR...</div>}
      {error && <div className="taurusWeatherError">{error}</div>}

      {weather && (
        <div className="taurusWeatherBody">
          <div className="taurusWeatherPrimary">
            <span className="taurusWeatherIcon"><WeatherIcon code={weather.code} isDay={weather.isDay} /></span>
            <div><small>{weather.country}</small><strong>{weather.city}</strong><p>{weather.text}</p></div>
            <b>{weather.temp}°</b>
          </div>
          <div className="taurusWeatherMetrics">
            <div><span>HİSSEDİLEN</span><strong>{weather.feels}°</strong></div>
            <div><span>EN YÜKSEK / DÜŞÜK</span><strong>{weather.high}° / {weather.low}°</strong></div>
            <div><Droplets size={15} /><span>YAĞIŞ</span><strong>%{weather.rain}</strong></div>
            <div><Wind size={15} /><span>RÜZGÂR</span><strong>{weather.wind} km/sa</strong></div>
          </div>
        </div>
      )}
    </section>,
    portal,
  );
}
