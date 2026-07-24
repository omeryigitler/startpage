"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Search, Settings2 } from "lucide-react";

const groups = [
  { title: "Work", links: [["GitHub","https://github.com"],["Vercel","https://vercel.com"],["Gmail","https://mail.google.com"],["Drive","https://drive.google.com"],["Calendar","https://calendar.google.com"]] },
  { title: "AI", links: [["ChatGPT","https://chatgpt.com"],["Claude","https://claude.ai"],["Gemini","https://gemini.google.com"],["Perplexity","https://perplexity.ai"],["Grok","https://grok.com"]] },
  { title: "Projects", links: [["omeryigitler.com","https://omeryigitler.com"],["Built With Seyhan","https://builtwithseyhan.com"],["Berfin Akbaş","https://berfinakbas.com"],["Dawl Studio","https://dawlstudio.com"]] },
  { title: "Learning", links: [["YouTube","https://youtube.com"],["Medium","https://medium.com"],["Coursera","https://coursera.org"],["Duolingo","https://duolingo.com"]] },
  { title: "Social", links: [["Instagram","https://instagram.com"],["LinkedIn","https://linkedin.com"],["X","https://x.com"],["Reddit","https://reddit.com"]] }
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<"aurora" | "sunset">("aurora");

  useEffect(() => {
    const saved = localStorage.getItem("startpage-mode") as "aurora" | "sunset" | null;
    if (saved) setMode(saved);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = useMemo(() => new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now), [now]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <main className={`page ${mode}`}>
      <div className="noise" />
      <header className="topbar">
        <a className="brand" href="https://omeryigitler.com">OY<span>.</span></a>
        <nav><a className="active" href="#">Home</a><a href="#projects">Projects</a><a href="#learning">Learning</a></nav>
        <button className="iconButton" onClick={toggleMode} aria-label="Arka planı değiştir"><Settings2 size={18}/></button>
      </header>

      <section className="hero">
        <div className="intro"><p>WELCOME BACK</p><h1>Ömer Yiğitler</h1></div>
        <div className="timeCard"><Clock3 size={18}/><strong>{now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</strong><span><CalendarDays size={15}/>{date}</span></div>
      </section>

      <form className="search" onSubmit={submitSearch}>
        <Search size={20}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Google'da ara veya URL yaz..." autoFocus/><kbd>Enter</kbd>
      </form>

      <section className="grid">
        {groups.map((group, index) => (
          <article className="card" key={group.title} id={index === 2 ? "projects" : index === 3 ? "learning" : undefined}>
            <div className="cardTitle"><span>{String(index + 1).padStart(2,"0")}</span><h2>{group.title}</h2></div>
            <div className="links">{group.links.map(([name,url]) => <a key={name} href={url}><i>{name.charAt(0)}</i>{name}<b>↗</b></a>)}</div>
          </article>
        ))}
      </section>
      <footer><span>omeryigitler.com</span><span>Malta · {now.getFullYear()}</span></footer>
    </main>
  );
}
