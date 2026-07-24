"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, CloudSun, Command, FolderKanban, Github, Globe2, Search, Settings2, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { defaultConfig, StartpageConfig } from "./startpage-config";

const STORAGE_KEY = "startpage-config-v1";
type WeatherData = { temp: number; feels: number; text: string; high: number; low: number; rain: number; wind: number };
type MarketData = Record<string, { value: string; change: string }>;

function greetingForHour(hour: number) {
  if (hour < 5) return "İyi geceler Ömer";
  if (hour < 12) return "Günaydın Ömer";
  if (hour < 18) return "İyi günler Ömer";
  return "İyi akşamlar Ömer";
}

function faviconUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
  } catch {
    return "https://www.google.com/s2/favicons?domain=google.com&sz=128";
  }
}

function Typewriter({ text }: { text: string }) {
  const [visible, setVisible] = useState("");
  useEffect(() => {
    setVisible("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 52);
    return () => window.clearInterval(timer);
  }, [text]);
  return <span className="typewriter" aria-label={text}>{visible}<i aria-hidden="true" /></span>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(new Date());
  const [config, setConfig] = useState<StartpageConfig>(defaultConfig);
  const [weather, setWeather] = useState<Record<string, WeatherData>>({});
  const [markets, setMarkets] = useState<MarketData>({});

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { setConfig({ ...defaultConfig, ...JSON.parse(raw) }); } catch {}
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(config.cities.map(async city => {
      const params = new URLSearchParams({ lat: String(city.latitude), lon: String(city.longitude), timezone: city.timezone || "auto" });
      const response = await fetch(`/api/weather?${params}`);
      if (!response.ok) throw new Error("weather");
      return [`${city.name}-${city.country}`, await response.json()] as const;
    })).then(entries => { if (!cancelled) setWeather(Object.fromEntries(entries)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [config.cities]);

  useEffect(() => {
    const symbols = config.markets.map(item => item.symbol).filter(Boolean).join(",");
    if (!symbols) return;
    fetch(`/api/markets?symbols=${encodeURIComponent(symbols)}`)
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(setMarkets)
      .catch(() => {});
  }, [config.markets]);

  const date = useMemo(() => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now), [now]);
  const greeting = config.greeting?.trim() || greetingForHour(now.getHours());
  const featuredProjects = config.projects.slice(0, 4);
  const toolFolders = config.folders.slice(0, 4);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    const target = /^https?:\/\//i.test(value) ? value : `https://www.google.com/search?q=${encodeURIComponent(value)}`;
    window.location.href = target;
  }

  return <main className="osPage reorderedPage">
    <div className="osGlow osGlowOne" />
    <div className="osGlow osGlowTwo" />
    <div className="brandWatermark" aria-hidden="true">OY</div>
    <div className="noise" />

    <header className="osTopbar">
      <a className="osBrand" href="https://omeryigitler.com">OY<span>.</span></a>
      <div className="osClock"><Clock3 size={15}/><strong>{now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</strong><span>{date}</span></div>
      <Link className="osManage" href="/yonetim"><Settings2 size={16}/> Yönetim</Link>
    </header>

    <section className="topIntroBlock">
      <small>PERSONAL OPERATING SYSTEM</small>
      <Typewriter text={greeting} />
      <p>Devam ettiğin yerden devam et.</p>
      <form className="spotlight spotlightLarge" onSubmit={submitSearch}>
        <Search size={23}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Google’da ara veya URL yaz..." autoFocus />
        <kbd><Command size={13}/> K</kbd>
      </form>
    </section>

    <section className="contentShell">
      <aside className="osLeft projectColumn">
        <div className="sideSectionHead"><span>Projelerim</span><small>{featuredProjects.length} proje</small></div>
        <div className="continueList">
          {featuredProjects.map(project => <article className="continueCard" key={project.name}>
            <a className="continueMain" href={project.url} target="_blank" rel="noreferrer">
              <span className="projectLogo"><img src={faviconUrl(project.url)} alt="" /></span><div><strong>{project.name}</strong><small>{project.status || "Proje"}</small></div><ArrowUpRight size={16}/>
            </a>
            <div className="continueMeta">
              {project.github && <a href={project.github} target="_blank" rel="noreferrer"><Github size={13}/> GitHub</a>}
              {project.vercel && <a href={project.vercel} target="_blank" rel="noreferrer"><Globe2 size={13}/> Vercel</a>}
            </div>
          </article>)}
        </div>
      </aside>

      <section className="osCenter folderColumn">
        <div className="columnTitle"><div><Sparkles size={17}/><span>Klasörler</span></div><small>Günlük çalışma alanın</small></div>
        <div className="launchGrid">
          {toolFolders.map((folder, folderIndex) => <article className="launchFolder" key={folder.title}>
            <header><span>{String(folderIndex + 1).padStart(2, "0")}</span><div><h2>{folder.title}</h2><p>{folder.subtitle}</p></div></header>
            <div className="appGrid">
              {folder.links.slice(0, 6).map((link, linkIndex) => <a href={link.url} target="_blank" rel="noreferrer" key={link.name} className="appTile">
                <i className="brandLogo"><img src={faviconUrl(link.url)} alt={`${link.name} logosu`} /></i><strong>{link.name}</strong><small>{link.note || "Aç"}</small><b>{String(linkIndex + 1).padStart(2, "0")}</b>
              </a>)}
            </div>
          </article>)}
        </div>
      </section>

      <aside className="osRight liveColumn">
        <div className="columnTitle"><div><Wrench size={17}/><span>Canlı takip</span></div><small>Şimdi</small></div>
        <article className="liveCard weatherDesk">
          <header><div><CloudSun size={17}/><span>Hava Durumu</span></div><small>Canlı</small></header>
          <div className="weatherStack">{config.cities.map(city => {
            const data = weather[`${city.name}-${city.country}`];
            return <div className="weatherRow" key={`${city.name}-${city.country}`}><div><strong>{city.name}</strong><small>{city.country}</small></div><div><b>{data ? `${data.temp}°` : "—"}</b><span>{data?.text || "Yükleniyor"}</span></div></div>;
          })}</div>
        </article>
        <article className="liveCard marketDesk">
          <header><div><TrendingUp size={17}/><span>Piyasalar</span></div><small>5 dk</small></header>
          <div className="marketStack">{config.markets.map(item => {
            const data = markets[item.symbol];
            return <div className="marketRow" key={item.symbol}><div><strong>{item.name}</strong><small>{item.symbol}</small></div><div><b>{data?.value || "—"}</b><span className={data?.change?.startsWith("-") ? "negative" : "positive"}>{data?.change || "—"}</span></div></div>;
          })}</div>
        </article>
        <article className="liveCard quickDesk">
          <header><div><FolderKanban size={17}/><span>Hızlı Erişim</span></div><small>{config.projects.length}</small></header>
          <div className="quickLinks">{config.projects.slice(0, 5).map(project => <a href={project.url} target="_blank" rel="noreferrer" key={project.name}><span className="quickProject"><img src={faviconUrl(project.url)} alt="" />{project.name}</span><ArrowUpRight size={14}/></a>)}</div>
        </article>
      </aside>
    </section>
  </main>;
}
