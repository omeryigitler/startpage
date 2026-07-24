"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, CloudSun, Command, Folder, Github, Globe2, Mail, MapPin, Plus, Search, Settings2, Sparkles, TrendingUp, X } from "lucide-react";
import { defaultConfig, StartpageConfig } from "./startpage-config";

const STORAGE_KEY = "startpage-config-v1";
const NOTE_KEY = "startpage-quick-note";
type WeatherData = { temp: number; feels: number; text: string; high: number; low: number; rain: number; wind: number };
type MarketData = Record<string, { value: string; change: string }>;
type SearchItem = { name: string; url: string; group: string };

function greetingForHour(hour: number) {
  if (hour < 5) return "İyi geceler, Ömer.";
  if (hour < 12) return "Günaydın, Ömer.";
  if (hour < 18) return "İyi günler, Ömer.";
  return "İyi akşamlar, Ömer.";
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
    }, 48);
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
  const [note, setNote] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { setConfig({ ...defaultConfig, ...JSON.parse(raw) }); } catch {}
    setNote(localStorage.getItem(NOTE_KEY) || "");
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        setSelectedFolder(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.clearInterval(timer); window.removeEventListener("keydown", onKey); };
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
    fetch(`/api/markets?symbols=${encodeURIComponent(symbols)}`).then(response => response.ok ? response.json() : Promise.reject()).then(setMarkets).catch(() => {});
  }, [config.markets]);

  const date = useMemo(() => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now), [now]);
  const greeting = config.greeting?.trim() || greetingForHour(now.getHours());
  const featuredProjects = config.projects.slice(0, 4);
  const folders = config.folders.slice(0, 6);
  const quickLinks = config.folders.flatMap(folder => folder.links).slice(0, 12);
  const allItems = useMemo<SearchItem[]>(() => [
    ...config.projects.map(project => ({ name: project.name, url: project.url, group: "Projeler" })),
    ...config.folders.flatMap(folder => folder.links.map(link => ({ name: link.name, url: link.url, group: folder.title })))
  ], [config]);
  const results = query.trim() ? allItems.filter(item => `${item.name} ${item.group}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))).slice(0, 8) : [];

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    if (results[0]) { window.location.href = results[0].url; return; }
    const target = /^https?:\/\//i.test(value) ? value : `https://www.google.com/search?q=${encodeURIComponent(value)}`;
    window.location.href = target;
  }

  function saveNote(value: string) {
    setNote(value);
    localStorage.setItem(NOTE_KEY, value);
  }

  return <main className="osPage approvedHome">
    <div className="osGlow osGlowOne" /><div className="osGlow osGlowTwo" /><div className="noise" />
    <header className="osTopbar approvedTopbar">
      <a className="osBrand" href="https://omeryigitler.com">OY<span>.</span></a>
      <div className="osClock"><Clock3 size={15}/><strong>{now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</strong><CalendarDays size={14}/><span>{date}</span><MapPin size={14}/><span>Malta</span></div>
      <Link className="osManage" href="/yonetim"><Settings2 size={16}/> Yönetim</Link>
    </header>

    <section className="approvedGrid">
      <section className="approvedMain">
        <div className="approvedHero"><Typewriter text={greeting} /><p>Bugün ne yapmak istiyorsun?</p></div>
        <form className="commandSearch" onSubmit={submitSearch}>
          <div className="commandInput"><Search size={27}/><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Proje, araç veya Google araması..." autoFocus/><kbd><Command size={13}/> K</kbd></div>
          {query && <div className="commandResults">{results.length ? results.map(item => <a href={item.url} key={`${item.group}-${item.name}`}><img src={faviconUrl(item.url)} alt=""/><span><strong>{item.name}</strong><small>{item.group}</small></span><ArrowUpRight size={15}/></a>) : <button type="submit"><Search size={16}/> Google’da “{query}” ara</button>}</div>}
          <div className="commandShortcuts">{quickLinks.slice(0, 8).map(link => <a href={link.url} target="_blank" rel="noreferrer" key={link.name}><img src={faviconUrl(link.url)} alt=""/><span>{link.name}</span></a>)}</div>
        </form>

        <section className="glassSection foldersSection">
          <header className="sectionBar"><div><Folder size={18}/><strong>Klasörlerim</strong></div><span>{folders.length} klasör</span></header>
          <div className="folderStrip">{folders.map((folder, index) => <button className={`folderPreview ${selectedFolder === index ? "active" : ""}`} key={folder.title} onClick={() => setSelectedFolder(index)}><div className="folderIcon"><Folder size={29}/></div><strong>{folder.title}</strong><small>{folder.links.length} öğe</small><i>•••</i></button>)}</div>
        </section>

        <div className="lowerGrid">
          <section className="glassSection workingSection"><header className="sectionBar"><div><Sparkles size={18}/><strong>Continue Working</strong></div><span>{featuredProjects.length} proje</span></header><div className="workingList">{featuredProjects.map((project, index) => <article className="workingRow" key={project.name}><img src={faviconUrl(project.url)} alt=""/><div className="workingInfo"><strong>{project.name}</strong><small>{project.status || "Aktif proje"}</small></div><div className="progressTrack"><i style={{width:`${Math.max(18, 86 - index * 17)}%`}}/></div><span>{Math.max(18, 86 - index * 17)}%</span><a href={project.url} target="_blank" rel="noreferrer">Devam Et <ArrowUpRight size={14}/></a></article>)}</div></section>
          <section className="glassSection quickAccessSection"><header className="sectionBar"><div><Sparkles size={18}/><strong>Quick Access</strong></div><Link href="/yonetim">Düzenle</Link></header><div className="quickIconGrid">{quickLinks.map(link => <a href={link.url} target="_blank" rel="noreferrer" key={link.name}><img src={faviconUrl(link.url)} alt=""/><span>{link.name}</span></a>)}<Link href="/yonetim"><Plus size={22}/><span>Ekle</span></Link></div></section>
        </div>
      </section>

      <aside className="approvedRight">
        <article className="glassWidget weatherWidget"><header><div><CloudSun size={18}/><strong>Hava Durumu</strong></div><span>Canlı</span></header>{config.cities.slice(0,3).map((city, index) => { const data = weather[`${city.name}-${city.country}`]; return <div className={`featuredWeather ${index ? "compact" : ""}`} key={`${city.name}-${city.country}`}><div><strong>{city.name}, {city.country}</strong><small>{data?.text || "Yükleniyor"}</small>{!index && <span>Hissedilen {data?.feels ?? "—"}°</span>}</div><b>{data ? `${data.temp}°` : "—"}</b>{!index && <dl><div><dt>Rüzgâr</dt><dd>{data?.wind ?? "—"} km/h</dd></div><div><dt>Yağış</dt><dd>%{data?.rain ?? "—"}</dd></div></dl>}</div> })}</article>
        <article className="glassWidget marketsWidget"><header><div><TrendingUp size={18}/><strong>Piyasalar</strong></div><span>5 dk gecikmeli</span></header><div className="marketRows">{config.markets.slice(0,5).map((item,index) => { const data=markets[item.symbol]; return <div className="marketLine" key={item.symbol}><div><strong>{item.symbol}</strong><small>{item.name}</small></div><svg viewBox="0 0 74 22" aria-hidden="true"><polyline points={index % 2 ? "0,8 10,12 18,7 29,14 40,9 52,13 64,6 74,10" : "0,16 9,12 18,14 28,7 38,10 48,4 60,8 74,3"}/></svg><b>{data?.value || "—"}</b><span className={data?.change?.startsWith("-") ? "negative" : "positive"}>{data?.change || "—"}</span></div>})}</div></article>
        <article className="glassWidget summaryWidget"><header><div><CheckCircle2 size={18}/><strong>Bugünün Özeti</strong></div></header><div className="summaryRows"><div><Folder size={16}/><span>{config.projects.length} aktif proje</span></div><div><CheckCircle2 size={16}/><span>{config.folders.length} çalışma klasörü</span></div><div><Mail size={16}/><span>{quickLinks.length} hızlı bağlantı</span></div><div><Github size={16}/><span>GitHub çalışma alanın hazır</span></div></div></article>
        <article className="glassWidget noteWidget"><header><div><Sparkles size={18}/><strong>Hızlı Not</strong></div></header><textarea value={note} onChange={event => saveNote(event.target.value)} placeholder="Not almak için yaz..."/></article>
      </aside>
    </section>

    {selectedFolder !== null && folders[selectedFolder] && <div className="folderModalBackdrop" onClick={() => setSelectedFolder(null)}><section className="folderModal" onClick={event => event.stopPropagation()}><header><div><Folder size={22}/><span><strong>{folders[selectedFolder].title}</strong><small>{folders[selectedFolder].subtitle}</small></span></div><button onClick={() => setSelectedFolder(null)}><X size={20}/></button></header><div>{folders[selectedFolder].links.map(link => <a href={link.url} target="_blank" rel="noreferrer" key={link.name}><img src={faviconUrl(link.url)} alt=""/><span><strong>{link.name}</strong><small>{link.note || "Aç"}</small></span><ArrowUpRight size={16}/></a>)}</div></section></div>}
  </main>;
}
