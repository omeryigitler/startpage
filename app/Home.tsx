"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  ChevronDown,
  Clock3,
  CloudSun,
  Command,
  Folder,
  FolderOpen,
  Gauge,
  MapPin,
  NotebookPen,
  Search,
  Settings2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { defaultConfig, StartpageConfig } from "./startpage-config";
import NotesModal from "./NotesModal";

const STORAGE_KEY = "startpage-config-v1";

type WeatherData = {
  temp: number;
  feels: number;
  text: string;
  high: number;
  low: number;
  rain: number;
  wind: number;
};

type MarketData = Record<string, { value: string; change: string }>;
type SearchItem = { name: string; url: string; group: string };
type StatePayload = { config?: StartpageConfig; canEdit?: boolean; hasStoredState?: boolean };

type FolderSlide =
  | {
      id: string;
      kind: "links";
      title: string;
      subtitle: string;
      links: { name: string; url: string; note?: string }[];
    }
  | { id: string; kind: "projects"; title: string; subtitle: string }
  | { id: string; kind: "daily"; title: string; subtitle: string }
  | { id: string; kind: "system"; title: string; subtitle: string };

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.96,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 120 : -120,
    opacity: 0,
    scale: 0.96,
  }),
};

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

export default function Home() {
  const [launched, setLaunched] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [logoMissing, setLogoMissing] = useState(false);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(new Date());
  const [config, setConfig] = useState<StartpageConfig>(defaultConfig);
  const [weather, setWeather] = useState<Record<string, WeatherData>>({});
  const [markets, setMarkets] = useState<MarketData>({});
  const [canEdit, setCanEdit] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);

  const greeting = config.greeting?.trim() || greetingForHour(now.getHours());
  const date = useMemo(
    () => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now),
    [now],
  );

  const quickLinks = useMemo(
    () => config.folders.flatMap((folder) => folder.links).slice(0, 8),
    [config.folders],
  );

  const slides = useMemo<FolderSlide[]>(
    () => [
      ...config.folders.map((folder, index) => ({
        id: `folder-${index}-${folder.title}`,
        kind: "links" as const,
        title: folder.title,
        subtitle: folder.subtitle,
        links: folder.links,
      })),
      { id: "projects", kind: "projects", title: "Projeler", subtitle: "Aktif işler ve canlı yayınlar" },
      { id: "daily", kind: "daily", title: "Günlük", subtitle: "Hava, piyasa ve günün durumu" },
      { id: "system", kind: "system", title: "Sistem", subtitle: "Notlar, yönetim ve Taurus Agent" },
    ],
    [config.folders],
  );

  const allItems = useMemo<SearchItem[]>(
    () => [
      ...config.projects.map((project) => ({ name: project.name, url: project.url, group: "Projeler" })),
      ...config.folders.flatMap((folder) =>
        folder.links.map((link) => ({ name: link.name, url: link.url, group: folder.title })),
      ),
    ],
    [config],
  );

  const results = query.trim()
    ? allItems
        .filter((item) =>
          `${item.name} ${item.group}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
        )
        .slice(0, 8)
    : [];

  const currentSlide = slides[activeIndex % slides.length];
  const leftIndex = (activeIndex - 1 + slides.length) % slides.length;
  const rightIndex = (activeIndex + 1) % slides.length;

  function launchAndFocus() {
    setLaunched(true);
    window.setTimeout(() => searchRef.current?.focus(), 650);
  }

  function toggleWorkspace() {
    const next = !workspaceOpen;
    setWorkspaceOpen(next);
    setShortcutsOpen(next);
  }

  function paginate(nextDirection: number) {
    setDirection(nextDirection);
    setActiveIndex((previous) => (previous + nextDirection + slides.length) % slides.length);
  }

  function selectSlide(index: number) {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }

  function openNotes() {
    if (!canEdit) {
      window.location.href = "/giris";
      return;
    }
    setNotesOpen(true);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    if (results[0]) {
      window.location.href = results[0].url;
      return;
    }
    window.location.href = /^https?:\/\//i.test(value)
      ? value
      : `https://www.google.com/search?q=${encodeURIComponent(value)}`;
  }

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setConfig({ ...defaultConfig, ...JSON.parse(raw) });
      } catch {}
    }

    async function loadState() {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        const data = (await response.json()) as StatePayload;
        setCanEdit(Boolean(data.canEdit));
        if (response.ok && data.hasStoredState && data.config) {
          setConfig(data.config);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
        }
      } catch {}
    }

    loadState();
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        launchAndFocus();
      }
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        launchAndFocus();
      }
      if (event.key === "ArrowLeft" && workspaceOpen && !isTyping) paginate(-1);
      if (event.key === "ArrowRight" && workspaceOpen && !isTyping) paginate(1);
      if (event.key === "Escape") {
        setQuery("");
        setNotesOpen(false);
        searchRef.current?.blur();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [workspaceOpen, slides.length]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      config.cities.map(async (city) => {
        const params = new URLSearchParams({
          lat: String(city.latitude),
          lon: String(city.longitude),
          timezone: city.timezone || "auto",
        });
        const response = await fetch(`/api/weather?${params}`);
        if (!response.ok) throw new Error("weather");
        return [`${city.name}-${city.country}`, await response.json()] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setWeather(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [config.cities]);

  useEffect(() => {
    const symbols = config.markets.map((item) => item.symbol).filter(Boolean).join(",");
    if (!symbols) return;
    fetch(`/api/markets?symbols=${encodeURIComponent(symbols)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setMarkets)
      .catch(() => {});
  }, [config.markets]);

  function renderSlideContent(slide: FolderSlide) {
    if (slide.kind === "links") {
      return (
        <div className="folderLinkGrid">
          {slide.links.map((link) => (
            <a href={link.url} target="_blank" rel="noreferrer" key={`${slide.id}-${link.name}`}>
              <img src={faviconUrl(link.url)} alt="" />
              <span>
                <strong>{link.name}</strong>
                <small>{link.note || "Aç"}</small>
              </span>
              <ArrowUpRight size={17} />
            </a>
          ))}
        </div>
      );
    }

    if (slide.kind === "projects") {
      return (
        <div className="projectFolderGrid">
          {config.projects.map((project, index) => (
            <a href={project.url} target="_blank" rel="noreferrer" key={project.name}>
              <span className="projectNumber">{String(index + 1).padStart(2, "0")}</span>
              <img src={faviconUrl(project.url)} alt="" />
              <div>
                <strong>{project.name}</strong>
                <small>{project.status || "Aktif proje"}</small>
              </div>
              <ArrowUpRight size={17} />
            </a>
          ))}
        </div>
      );
    }

    if (slide.kind === "daily") {
      return (
        <div className="dailyFolderGrid">
          <article className="dailyPanel weatherPanel">
            <header>
              <span><CloudSun size={18} /> Hava</span>
              <small>Canlı</small>
            </header>
            {config.cities.slice(0, 3).map((city) => {
              const data = weather[`${city.name}-${city.country}`];
              return (
                <div className="dailyWeatherRow" key={`${city.name}-${city.country}`}>
                  <div>
                    <strong>{city.name}</strong>
                    <small>{data?.text || city.country}</small>
                  </div>
                  <b>{data ? `${data.temp}°` : "—"}</b>
                </div>
              );
            })}
          </article>

          <article className="dailyPanel marketPanel">
            <header>
              <span><TrendingUp size={18} /> Piyasalar</span>
              <small>5 dk gecikmeli</small>
            </header>
            {config.markets.slice(0, 5).map((item) => {
              const data = markets[item.symbol];
              return (
                <div className="dailyMarketRow" key={item.symbol}>
                  <div>
                    <strong>{item.symbol}</strong>
                    <small>{item.name}</small>
                  </div>
                  <b>{data?.value || "—"}</b>
                  <span className={data?.change?.startsWith("-") ? "negative" : "positive"}>
                    {data?.change || "—"}
                  </span>
                </div>
              );
            })}
          </article>

          <article className="dailyPanel dayStatusPanel">
            <header>
              <span><Clock3 size={18} /> Bugün</span>
            </header>
            <strong>{now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</strong>
            <p>{date}</p>
            <div><MapPin size={15} /> Malta</div>
          </article>
        </div>
      );
    }

    return (
      <div className="systemFolderGrid">
        <button type="button" onClick={openNotes}>
          <NotebookPen size={23} />
          <span><strong>Notlar</strong><small>Başlık, tarih, görsel ve PDF</small></span>
          <ArrowUpRight size={17} />
        </button>
        <Link href="/yonetim">
          <Settings2 size={23} />
          <span><strong>Yönetim</strong><small>Klasörleri ve bağlantıları düzenle</small></span>
          <ArrowUpRight size={17} />
        </Link>
        <a href="https://omeryigitler.com/agent.html" target="_blank" rel="noreferrer">
          <Bot size={23} />
          <span><strong>Taurus Agent</strong><small>omeryigitler.com yönetim asistanı</small></span>
          <ArrowUpRight size={17} />
        </a>
        <a href="https://omeryigitler.com" target="_blank" rel="noreferrer">
          <Gauge size={23} />
          <span><strong>omeryigitler.com</strong><small>Ana portföyü aç</small></span>
          <ArrowUpRight size={17} />
        </a>
      </div>
    );
  }

  return (
    <main className={`centerOs ${launched ? "is-launched" : ""} ${workspaceOpen ? "is-workspace" : ""}`}>
      <div className="centerOsGrid" />
      <div className="centerOsGlow centerOsGlowOne" />
      <div className="centerOsGlow centerOsGlowTwo" />

      <section className="centerLogoDock">
        <button type="button" className="centerLogoButton" onClick={launchAndFocus} aria-label="Startpage'i aç">
          <span className="logoPulse" />
          {logoMissing ? (
            <span className="centerLogoFallback">OY<span>.</span></span>
          ) : (
            <img src="/logo.png" alt="Ömer Yiğitler" onError={() => setLogoMissing(true)} />
          )}
        </button>
        <p className="centerLogoHint">Başlamak için dokun</p>
      </section>

      <section className="searchExpansion">
        <form className="centerSearchForm" onSubmit={submitSearch}>
          <Search size={23} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Proje, araç veya Google araması..."
          />
          <button type="button" onClick={launchAndFocus} aria-label="Arama alanına odaklan">
            <Command size={13} /> K <span>/</span>
          </button>
        </form>
        <p className="centerGreeting"><Sparkles size={14} /> {greeting}</p>
        {query && (
          <div className="centerSearchResults">
            {results.length ? (
              results.map((item) => (
                <a href={item.url} key={`${item.group}-${item.name}`}>
                  <img src={faviconUrl(item.url)} alt="" />
                  <span><strong>{item.name}</strong><small>{item.group}</small></span>
                  <ArrowUpRight size={15} />
                </a>
              ))
            ) : (
              <button type="submit"><Search size={16} /> Google’da “{query}” ara</button>
            )}
          </div>
        )}
      </section>

      <button
        type="button"
        className={`breathingArrow ${workspaceOpen ? "is-open" : ""}`}
        onClick={toggleWorkspace}
        aria-expanded={workspaceOpen}
        aria-label={workspaceOpen ? "Klasörleri kapat" : "Kısayolları ve klasörleri aç"}
      >
        <span>{workspaceOpen ? "KAPAT" : "KEŞFET"}</span>
        <ChevronDown size={25} />
      </button>

      <nav className={`quickReveal ${shortcutsOpen ? "is-open" : ""}`} aria-label="Hızlı kısayollar">
        {quickLinks.map((link, index) => (
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            key={`${link.name}-${index}`}
            style={{ "--shortcut-index": index } as React.CSSProperties}
          >
            <img src={faviconUrl(link.url)} alt="" />
            <span>{link.name}</span>
          </a>
        ))}
      </nav>

      <section className="folderWorkspace" aria-hidden={!workspaceOpen}>
        <div className="folderFrame">
          <button type="button" className="sideFolder sideFolderLeft" onClick={() => paginate(-1)}>
            <Folder size={29} />
            <span>{slides[leftIndex].title}</span>
            <small>Önceki</small>
          </button>

          <div className="activeFolderStage">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.article
                key={currentSlide.id}
                className="activeFolderCard"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) paginate(1);
                  if (info.offset.x > 60) paginate(-1);
                }}
              >
                <header className="activeFolderHeader">
                  <div className="activeFolderMark"><FolderOpen size={28} /></div>
                  <div>
                    <small>KLASÖR {String(activeIndex + 1).padStart(2, "0")}</small>
                    <h1>{currentSlide.title}</h1>
                    <p>{currentSlide.subtitle}</p>
                  </div>
                  <span className="folderCount">{activeIndex + 1} / {slides.length}</span>
                </header>
                <div className="activeFolderContent">{renderSlideContent(currentSlide)}</div>
              </motion.article>
            </AnimatePresence>
          </div>

          <button type="button" className="sideFolder sideFolderRight" onClick={() => paginate(1)}>
            <Folder size={29} />
            <span>{slides[rightIndex].title}</span>
            <small>Sonraki</small>
          </button>

          <footer className="folderSliderFooter">
            <button type="button" onClick={() => paginate(-1)} className="sliderDirection sliderDirectionLeft">
              <span>PREVIOUS</span><i /><ArrowLeft size={17} />
            </button>
            <div className="folderDots">
              {slides.map((slide, index) => (
                <button
                  type="button"
                  key={slide.id}
                  className={index === activeIndex ? "active" : ""}
                  onClick={() => selectSlide(index)}
                  aria-label={`${slide.title} klasörüne git`}
                />
              ))}
            </div>
            <button type="button" onClick={() => paginate(1)} className="sliderDirection sliderDirectionRight">
              <ArrowRight size={17} /><i /><span>NEXT</span>
            </button>
          </footer>
        </div>
      </section>

      <NotesModal open={notesOpen} canEdit={canEdit} onClose={() => setNotesOpen(false)} />
    </main>
  );
}
