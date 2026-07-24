"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3, CloudSun, FolderKanban, Search, Settings2, TrendingUp } from "lucide-react";
import { defaultConfig, StartpageConfig } from "./startpage-config";

const STORAGE_KEY = "startpage-config-v1";

type WeatherData = { temp: number; feels: number; text: string; high: number; low: number; rain: number; wind: number };

const marketPreview: Record<string, { value: string; change: string }> = {
  XAU: { value: "$3,372.10", change: "+0.42%" },
  BTC: { value: "$118,420", change: "+1.86%" },
  EURTRY: { value: "₺46.18", change: "+0.21%" },
  NVDA: { value: "$173.64", change: "-0.34%" }
};

function greetingForHour(hour: number) {
  if (hour < 5) return "Good Night!";
  if (hour < 12) return "Good Morning!";
  if (hour < 18) return "Good Afternoon!";
  return "Good Evening!";
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
    }, 58);
    return () => window.clearInterval(timer);
  }, [text]);
  return <span className="typewriter" aria-label={text}>{visible}<i aria-hidden="true" /></span>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<"aurora" | "sunset">("aurora");
  const [config, setConfig] = useState<StartpageConfig>(defaultConfig);
  const [weather, setWeather] = useState<Record<string, WeatherData>>({});

  useEffect(() => {
    const savedMode = localStorage.getItem("startpage-mode") as "aurora" | "sunset" | null;
    if (savedMode) setMode(savedMode);
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

  const date = useMemo(() => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now), [now]);
  const greeting = config.greeting?.trim() || greetingForHour(now.getHours());

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    const target = /^https?:\/\//i.test(value) ? value : `https://www.google.com/search?q=${encodeURIComponent(value)}`;
    window.location.href = target;
  }

  function toggleMode() {
    const next = mode === "aurora" ? "sunset" : "aurora";
    setMode(next);
    localStorage.setItem("startpage-mode", next);
  }

  return <main className={`page ${mode}`}>
    <div className="noise" />
    <header className="topbar">
      <a className="brand" href="https://omeryigitler.com">OY<span>.</span></a>
      <nav><a className="active" href="#home">Ana sayfa</a><a href="#projects">Projeler</a><a href="#folders">Klasörler</a></nav>
      <div className="topActions"><button className="iconButton" onClick={toggleMode} aria-label="Arka planı değiştir"><CloudSun size={18}/></button><Link className="manageButton" href="/yonetim"><Settings2 size={17}/> Yönetim</Link></div>
    </header>

    <section className="hero" id="home">
      <div className="intro"><p>PERSONAL OPERATING SYSTEM</p><div className="greetingLine"><Typewriter text={greeting}/></div><h1>Ömer Yiğitler</h1><span>Projeler, araçlar, piyasalar ve günlük takip tek ekranda.</span></div>
      <div className="timeCard"><Clock3 size={18}/><strong>{now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</strong><span><CalendarDays size={15}/>{date}</span></div>
    </section>

    <form className="search" onSubmit={submitSearch}><Search size={20}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Google'da ara veya URL yaz..." autoFocus/><kbd>Enter</kbd></form>

    <section className="overviewGrid">
      <article className="dashboardPanel marketsPanel">
        <div className="panelHead"><div><span>PİYASA TAKİBİ</span><h2>Varlıklarım</h2></div><TrendingUp size={20}/></div>
        <div className="marketGrid">{config.markets.map(item => {
          const data = marketPreview[item.symbol] || { value: "Veri sağlayıcısı bekliyor", change: "—" };
          return <div className="marketItem" key={item.symbol}><div><small>{item.symbol}</small><strong>{item.name}</strong></div><div className="marketValue"><b>{data.value}</b><span className={data.change.startsWith("-") ? "negative" : "positive"}>{data.change}</span></div></div>;
        })}</div>
      </article>

      <article className="dashboardPanel weatherPanel">
        <div className="panelHead"><div><span>CANLI HAVA DURUMU</span><h2>Şehirlerim</h2></div><CloudSun size={20}/></div>
        <div className="weatherList">{config.cities.map(city => {
          const data = weather[`${city.name}-${city.country}`];
          return <div className="weatherItem" key={`${city.name}-${city.country}`}><div><strong>{city.name}</strong><span>{city.country}</span>{data && <small>H: {data.high}° · L: {data.low}° · Yağış %{data.rain}</small>}</div><div><b>{data ? `${data.temp}°` : "—"}</b><small>{data?.text || "Yükleniyor"}</small></div></div>;
        })}</div>
      </article>
    </section>

    <section className="sectionBlock" id="projects">
      <div className="sectionTitle"><div><span>01</span><h2>Projelerim</h2></div><p>Canlı siteler, kod ve yayın bağlantıları</p></div>
      <div className="projectGrid">{config.projects.map((project,index)=><article className="projectCard" key={project.name}>
        <div className="projectVisual"><span>{String(index+1).padStart(2,"0")}</span><FolderKanban size={34}/></div>
        <div className="projectBody"><div><small>{project.status || "Proje"}</small><h3>{project.name}</h3></div><div className="projectLinks"><a href={project.url} target="_blank" rel="noreferrer">Site <ArrowUpRight size={14}/></a>{project.github && <a href={project.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14}/></a>}{project.vercel && <a href={project.vercel} target="_blank" rel="noreferrer">Vercel <ArrowUpRight size={14}/></a>}</div></div>
      </article>)}</div>
    </section>

    <section className="sectionBlock" id="folders">
      <div className="sectionTitle"><div><span>02</span><h2>Klasörler</h2></div><p>Amaca göre düzenlenmiş çalışma alanları</p></div>
      <div className="folderGrid">{config.folders.map((folder,index)=><article className="folderCard" key={folder.title}>
        <div className="folderTop"><span>{String(index+1).padStart(2,"0")}</span><div><h3>{folder.title}</h3><p>{folder.subtitle}</p></div></div>
        <div className="folderLinks">{folder.links.map(link=><a href={link.url} target="_blank" rel="noreferrer" key={link.name}><div><strong>{link.name}</strong>{link.note && <small>{link.note}</small>}</div><ArrowUpRight size={16}/></a>)}</div>
      </article>)}</div>
    </section>

    <footer><span>omeryigitler.com</span><span>Malta · {now.getFullYear()}</span></footer>
  </main>;
}
