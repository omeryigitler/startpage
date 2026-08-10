"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  ListChecks,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BANNER_IMAGE, LOGO_IMAGE } from "./assets";

const AI_STUDIO_URL = "https://ai.studio/apps/93a76e46-66fd-4032-a918-43cc3e60755a";
const STORAGE_KEY = "history-archived-workspace-v2";
const LEGACY_STORAGE_KEY = "history-archived-workspace-v1";

type PhaseId = "research" | "packaging" | "script" | "production" | "upload";
type TabId = "overview" | "progress" | "settings" | "studio";

type WorkflowStep = {
  id: string;
  phase: PhaseId;
  title: string;
  completed: boolean;
  completedAt: string | null;
  required: boolean;
  active: boolean;
};

type HistoryWorkspaceState = {
  version: 2;
  videoTitle: string;
  workflow: WorkflowStep[];
};

const PHASES: { id: PhaseId; label: string; short: string }[] = [
  { id: "research", label: "PHASE 1 — Research", short: "Research" },
  { id: "packaging", label: "PHASE 2 — Packaging", short: "Packaging" },
  { id: "script", label: "PHASE 3 — Script", short: "Script" },
  { id: "production", label: "PHASE 4 — Production", short: "Production" },
  { id: "upload", label: "PHASE 5 — Upload Package", short: "Upload" },
];

const DEFAULT_WORKFLOW: Array<Omit<WorkflowStep, "completed" | "completedAt">> = [
  { id: "research-1", phase: "research", title: "Roanoke hakkında güncel ve güvenilir kaynak araştırması", required: true, active: true },
  { id: "research-2", phase: "research", title: "Doğrulanmış olayların kronolojisi", required: true, active: true },
  { id: "research-3", phase: "research", title: "Ana teoriler", required: true, active: true },
  { id: "research-4", phase: "research", title: "Güncel arkeolojik kanıtlar", required: true, active: true },
  { id: "research-5", phase: "research", title: "Güvenilir ve tartışmalı iddiaların ayrımı", required: true, active: true },
  { id: "packaging-6", phase: "packaging", title: "10 başlık alternatifi", required: true, active: true },
  { id: "packaging-7", phase: "packaging", title: "En güçlü 3 başlık", required: true, active: true },
  { id: "packaging-8", phase: "packaging", title: "Thumbnail konseptleri", required: true, active: true },
  { id: "packaging-9", phase: "packaging", title: "Final video angle / story promise", required: true, active: true },
  { id: "script-10", phase: "script", title: "Hook seçenekleri", required: true, active: true },
  { id: "script-11", phase: "script", title: "Ayrıntılı narrative outline", required: true, active: true },
  { id: "script-12", phase: "script", title: "9–12 dakikalık final İngilizce senaryo", required: true, active: true },
  { id: "script-13", phase: "script", title: "Fact-check", required: true, active: true },
  { id: "production-14", phase: "production", title: "Sahne sahne shot list", required: true, active: true },
  { id: "production-15", phase: "production", title: "AI image prompts", required: true, active: true },
  { id: "production-16", phase: "production", title: "Gerekirse AI video prompts", required: false, active: true },
  { id: "production-17", phase: "production", title: "Harita / timeline planı", required: true, active: true },
  { id: "production-18", phase: "production", title: "Müzik ve SFX planı", required: true, active: true },
  { id: "upload-19", phase: "upload", title: "Final title", required: true, active: true },
  { id: "upload-20", phase: "upload", title: "Final thumbnail", required: true, active: true },
  { id: "upload-21", phase: "upload", title: "Description", required: true, active: true },
  { id: "upload-22", phase: "upload", title: "Chapters", required: true, active: true },
  { id: "upload-23", phase: "upload", title: "Tags / keywords", required: false, active: true },
  { id: "upload-24", phase: "upload", title: "Pinned comment", required: true, active: true },
  { id: "upload-25", phase: "upload", title: "End-screen / ikinci video geçişi", required: true, active: true },
];

const DEFAULT_STATE: HistoryWorkspaceState = {
  version: 2,
  videoTitle: "The Lost Colony of Roanoke",
  workflow: DEFAULT_WORKFLOW.map((step) => ({ ...step, completed: step.phase === "research", completedAt: null })),
};

function normalizeState(value: unknown): HistoryWorkspaceState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { videoTitle?: unknown; workflow?: unknown };
  if (typeof candidate.videoTitle !== "string" || !Array.isArray(candidate.workflow)) return null;
  const seen = new Set<string>();
  const workflow: WorkflowStep[] = [];
  for (const raw of candidate.workflow) {
    if (!raw || typeof raw !== "object") return null;
    const step = raw as Partial<WorkflowStep>;
    if (!step.id || typeof step.id !== "string" || seen.has(step.id)) return null;
    if (!PHASES.some((phase) => phase.id === step.phase)) return null;
    if (!step.title || typeof step.title !== "string") return null;
    if (typeof step.completed !== "boolean") return null;
    seen.add(step.id);
    workflow.push({
      id: step.id,
      phase: step.phase as PhaseId,
      title: step.title,
      completed: step.completed,
      completedAt: typeof step.completedAt === "string" ? step.completedAt : null,
      required: typeof step.required === "boolean" ? step.required : true,
      active: typeof step.active === "boolean" ? step.active : true,
    });
  }
  return { version: 2, videoTitle: candidate.videoTitle, workflow };
}

function phaseName(id: PhaseId) {
  return PHASES.find((phase) => phase.id === id)?.label ?? id;
}

export default function HistoryArchivedWorkspace() {
  const [tab, setTab] = useState<TabId>("overview");
  const [state, setState] = useState<HistoryWorkspaceState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "local">("idle");
  const [newTitle, setNewTitle] = useState("");
  const [newPhase, setNewPhase] = useState<PhaseId>("packaging");
  const [newRequired, setNewRequired] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPhase, setEditPhase] = useState<PhaseId>("research");
  const [editRequired, setEditRequired] = useState(true);
  const [editActive, setEditActive] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = normalizeState(JSON.parse(raw));
        if (parsed) setState(parsed);
      }
    } catch {}

    let cancelled = false;
    fetch("/api/history-state", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("state");
        return response.json() as Promise<{ state?: unknown }>;
      })
      .then((payload) => {
        const normalized = normalizeState(payload.state);
        if (!cancelled && normalized) {
          setState(normalized);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHydrated(true); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      fetch("/api/history-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("save");
          setSaveStatus("saved");
          window.setTimeout(() => setSaveStatus("idle"), 1500);
        })
        .catch(() => setSaveStatus("local"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state, hydrated]);

  const activeRequired = useMemo(() => state.workflow.filter((step) => step.active && step.required), [state.workflow]);
  const completedRequired = useMemo(() => activeRequired.filter((step) => step.completed).length, [activeRequired]);
  const activeVisible = useMemo(() => state.workflow.filter((step) => step.active), [state.workflow]);
  const completedVisible = useMemo(() => activeVisible.filter((step) => step.completed).length, [activeVisible]);
  const percent = activeRequired.length ? Math.round((completedRequired / activeRequired.length) * 100) : 100;
  const nextStep = state.workflow.find((step) => step.active && step.required && !step.completed);

  function toggleStep(id: string) {
    setState((current) => ({
      ...current,
      workflow: current.workflow.map((step) => step.id === id
        ? { ...step, completed: !step.completed, completedAt: step.completed ? null : new Date().toISOString() }
        : step),
    }));
  }

  function addStep() {
    const title = newTitle.trim();
    if (!title) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setState((current) => ({
      ...current,
      workflow: [...current.workflow, { id, phase: newPhase, title, completed: false, completedAt: null, required: newRequired, active: true }],
    }));
    setNewTitle("");
    setNewRequired(true);
  }

  function startEdit(step: WorkflowStep) {
    setEditId(step.id);
    setEditTitle(step.title);
    setEditPhase(step.phase);
    setEditRequired(step.required);
    setEditActive(step.active);
    setDeleteId(null);
  }

  function saveEdit() {
    const title = editTitle.trim();
    if (!editId || !title) return;
    setState((current) => {
      const original = current.workflow.find((step) => step.id === editId);
      if (!original) return current;
      const updated = { ...original, title, phase: editPhase, required: editRequired, active: editActive };
      if (original.phase === editPhase) {
        return { ...current, workflow: current.workflow.map((step) => step.id === editId ? updated : step) };
      }
      const remaining = current.workflow.filter((step) => step.id !== editId);
      const lastTarget = remaining.reduce((last, step, index) => step.phase === editPhase ? index : last, -1);
      const next = [...remaining];
      next.splice(lastTarget + 1, 0, updated);
      return { ...current, workflow: next };
    });
    setEditId(null);
  }

  function removeStep(id: string) {
    if (deleteId !== id) { setDeleteId(id); return; }
    setState((current) => ({ ...current, workflow: current.workflow.filter((step) => step.id !== id) }));
    setDeleteId(null);
    if (editId === id) setEditId(null);
  }

  function moveStep(id: string, direction: -1 | 1) {
    setState((current) => {
      const sourceIndex = current.workflow.findIndex((step) => step.id === id);
      if (sourceIndex < 0) return current;
      const phase = current.workflow[sourceIndex].phase;
      const siblingIndexes = current.workflow.map((step, index) => ({ step, index })).filter(({ step }) => step.phase === phase).map(({ index }) => index);
      const siblingPosition = siblingIndexes.indexOf(sourceIndex);
      const targetIndex = siblingIndexes[siblingPosition + direction];
      if (targetIndex === undefined) return current;
      const next = [...current.workflow];
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return { ...current, workflow: next };
    });
  }

  function phaseStats(phase: PhaseId) {
    const items = state.workflow.filter((step) => step.phase === phase && step.active);
    const required = items.filter((step) => step.required);
    return {
      done: items.filter((step) => step.completed).length,
      total: items.length,
      requiredDone: required.filter((step) => step.completed).length,
      requiredTotal: required.length,
    };
  }

  function phaseStatus(phase: PhaseId) {
    const stats = phaseStats(phase);
    if (stats.total === 0) return "Kapalı";
    if (stats.requiredTotal === 0 || stats.requiredDone === stats.requiredTotal) return "Tamamlandı";
    const firstRequired = state.workflow.find((step) => step.active && step.required && !step.completed);
    if (firstRequired?.phase === phase) return "Devam ediyor";
    return "Başlamadı";
  }

  return (
    <main className="historyShell">
      <div className="grain" />
      <header className="topbar">
        <Link href="/" className="backLink"><ArrowLeft size={16} /> Startpage</Link>
        <div className="miniBrand"><img src={LOGO_IMAGE} alt="The History Archived" /><span>THE HISTORY ARCHIVED</span></div>
        <span className={`saveState ${saveStatus}`}>{saveStatus === "saving" ? "Kaydediliyor…" : saveStatus === "saved" ? "Kaydedildi" : saveStatus === "local" ? "Yerel yedek · sunucu ulaşılamıyor" : "Workflow"}</span>
      </header>

      <section className="hero">
        <img src={BANNER_IMAGE} alt="The History Archived banner" />
        <div className="heroShade" />
        <div className="heroCopy"><span className="eyebrow">CONTENT COMMAND CENTER</span><h1>{state.videoTitle}</h1><p>Research → Packaging → Script → Production → Upload Package</p></div>
      </section>

      <nav className="tabs" aria-label="History workspace">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><Circle size={16} /> Genel</button>
        <button className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}><ListChecks size={16} /> İlerleme</button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}><Settings2 size={16} /> Ayarla</button>
        <button className={tab === "studio" ? "active" : ""} onClick={() => setTab("studio")}><ExternalLink size={16} /> AI Studio</button>
      </nav>

      {tab === "overview" && (
        <section className="content overview">
          <div className="metricGrid">
            <article className="metric heroMetric"><div className="ring" style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}><span>{percent}%</span></div><div><small>WORKFLOW PROGRESS</small><strong>{completedRequired} / {activeRequired.length}</strong><p>Zorunlu aktif adım</p></div></article>
            <article className="metric"><small>NEXT ACTION</small><strong>{nextStep?.title ?? "Workflow tamamlandı"}</strong><p>{nextStep ? phaseName(nextStep.phase) : "Tüm zorunlu adımlar tamamlandı"}</p></article>
            <article className="metric"><small>ACTIVE DOCUMENTARY</small><strong>{state.videoTitle}</strong><p>{completedVisible}/{activeVisible.length} görünür adım tamamlandı</p></article>
          </div>
          <div className="phaseGrid">
            {PHASES.map((phase, index) => {
              const stats = phaseStats(phase.id); const status = phaseStatus(phase.id); const done = status === "Tamamlandı";
              return <button key={phase.id} onClick={() => setTab("progress")} className={done ? "phaseCard complete" : "phaseCard"}><span className="phaseNo">0{index + 1}</span><div><small>{phase.short}</small><strong>{stats.done}/{stats.total}</strong><em>{status}</em></div>{done ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button>;
            })}
          </div>
        </section>
      )}

      {tab === "progress" && (
        <section className="content progressView">
          <div className="sectionHead"><div><span className="eyebrow">WORKFLOW</span><h2>İlerleme</h2></div><span>{completedRequired}/{activeRequired.length} zorunlu adım tamamlandı</span></div>
          <div className="workflowList">
            {PHASES.map((phase) => {
              const steps = state.workflow.filter((step) => step.phase === phase.id && step.active); const stats = phaseStats(phase.id);
              return <article className="phaseBlock" key={phase.id}><header><div><small>{phase.label}</small><strong>{stats.done}/{stats.total}</strong></div><div className="phaseBar"><i style={{ width: `${stats.requiredTotal ? (stats.requiredDone / stats.requiredTotal) * 100 : 100}%` }} /></div></header><div className="stepList">{steps.length === 0 && <p className="empty">Bu fazda aktif adım yok. Ayarla bölümünden ekleyebilir veya etkinleştirebilirsin.</p>}{steps.map((step) => <button key={step.id} className={step.completed ? "step completed" : "step"} onClick={() => toggleStep(step.id)}><span className="checkBox">{step.completed ? <Check size={15} /> : null}</span><span className="stepCopy"><span>{step.title}</span>{!step.required && <small>OPSİYONEL</small>}</span></button>)}</div></article>;
            })}
          </div>
        </section>
      )}

      {tab === "settings" && (
        <section className="content settingsView">
          <div className="sectionHead"><div><span className="eyebrow">WORKFLOW EDITOR</span><h2>Ayarla</h2></div><span>Ekle · düzenle · sırala · etkinleştir · sil</span></div>
          <article className="addCard"><div><small>YENİ ADIM</small><strong>Workflow&apos;a ekle</strong></div><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addStep(); }} placeholder="Yeni workflow adımı" /><select value={newPhase} onChange={(event) => setNewPhase(event.target.value as PhaseId)}>{PHASES.map((phase) => <option key={phase.id} value={phase.id}>{phase.label}</option>)}</select><label className="compactToggle"><input type="checkbox" checked={newRequired} onChange={(event) => setNewRequired(event.target.checked)} /> Zorunlu</label><button className="primary" onClick={addStep}><Plus size={16} /> Ekle</button></article>
          <div className="editorList">
            {PHASES.map((phase) => {
              const steps = state.workflow.filter((step) => step.phase === phase.id);
              return <article className="editorPhase" key={phase.id}><header><span>{phase.label}</span><small>{steps.length} adım</small></header>{steps.length === 0 && <p className="empty">Bu fazda tanımlı adım yok.</p>}{steps.map((step, index) => <div className={step.active ? "editorRow" : "editorRow inactive"} key={step.id}><button className={step.completed ? "tinyCheck checked" : "tinyCheck"} onClick={() => toggleStep(step.id)} aria-label="Tamamlandı durumunu değiştir">{step.completed && <Check size={13} />}</button>{editId === step.id ? <><input className="editInput" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /><select className="editSelect" value={editPhase} onChange={(event) => setEditPhase(event.target.value as PhaseId)}>{PHASES.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}</select><label className="editToggle"><input type="checkbox" checked={editRequired} onChange={(event) => setEditRequired(event.target.checked)} /> Zorunlu</label><label className="editToggle"><input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} /> Aktif</label><button className="icon ok" onClick={saveEdit} aria-label="Kaydet"><Check size={16} /></button><button className="icon" onClick={() => setEditId(null)} aria-label="İptal"><X size={16} /></button></> : <><span className={step.completed ? "rowTitle done" : "rowTitle"}>{step.title}<small>{step.required ? "ZORUNLU" : "OPSİYONEL"} · {step.active ? "AKTİF" : "KAPALI"}</small></span><button className="icon" disabled={index === 0} onClick={() => moveStep(step.id, -1)} aria-label="Yukarı taşı"><ArrowUp size={15} /></button><button className="icon" disabled={index === steps.length - 1} onClick={() => moveStep(step.id, 1)} aria-label="Aşağı taşı"><ArrowDown size={15} /></button><button className="icon" onClick={() => startEdit(step)} aria-label="Düzenle"><Pencil size={15} /></button><button className={deleteId === step.id ? "icon danger confirm" : "icon danger"} onClick={() => removeStep(step.id)} aria-label={deleteId === step.id ? "Silmeyi onayla" : "Sil"}>{deleteId === step.id ? <Check size={15} /> : <Trash2 size={15} />}</button></>}</div>)}</article>;
            })}
          </div>
        </section>
      )}

      {tab === "studio" && (
        <section className="content studioView"><div className="sectionHead"><div><span className="eyebrow">CONNECTED TOOL</span><h2>AI Studio</h2></div><a href={AI_STUDIO_URL} target="_blank" rel="noreferrer">Yeni sekmede aç <ExternalLink size={14} /></a></div><div className="studioFrame"><iframe src={AI_STUDIO_URL} title="The History Archived AI Studio" allow="clipboard-read; clipboard-write; microphone; camera" /></div><p className="studioNote">AI Studio gömülü görünümü engellerse yukarıdaki “Yeni sekmede aç” bağlantısını kullan.</p></section>
      )}

      <style jsx>{`
        :global(body){background:#060503!important;color:#f5efe2!important}
        .historyShell{--gold:#d9a54a;--line:rgba(219,174,91,.18);--muted:#9c927f;min-height:100vh;background:radial-gradient(circle at 50% 8%,rgba(156,90,22,.14),transparent 34%),#060503;color:#f5efe2;font-family:Manrope,system-ui,sans-serif;position:relative;padding:0 22px 70px;overflow:hidden}.grain{position:fixed;inset:0;pointer-events:none;opacity:.14;background-image:repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.018) 4px);z-index:0}.topbar,.hero,.tabs,.content{position:relative;z-index:1;max-width:1180px;margin-left:auto;margin-right:auto}.topbar{height:74px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:1px solid var(--line)}.backLink{justify-self:start;color:#b7ad9a;text-decoration:none;display:flex;gap:8px;align-items:center;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.miniBrand{display:flex;align-items:center;gap:10px;font-family:Georgia,serif;font-size:13px;letter-spacing:.14em;color:#d8bc82}.miniBrand img{width:34px;height:34px;object-fit:contain}.saveState{justify-self:end;font-size:10px;color:#786e5e;letter-spacing:.07em;text-transform:uppercase}.saveState.saved{color:#9bcf9f}.saveState.saving{color:#d6b36f}.saveState.local{color:#d59d73}.hero{height:270px;margin-top:22px;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:#0c0905;box-shadow:0 30px 100px rgba(0,0,0,.46)}.hero>img{width:100%;height:100%;object-fit:cover;opacity:.9}.heroShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,5,3,.92) 0%,rgba(6,5,3,.32) 48%,rgba(6,5,3,.12)),linear-gradient(0deg,rgba(6,5,3,.72),transparent 56%)}.heroCopy{position:absolute;left:38px;bottom:32px;max-width:570px}.eyebrow{font-size:10px;color:var(--gold);letter-spacing:.25em;font-weight:700}.heroCopy h1,.sectionHead h2{font-family:Georgia,serif;font-weight:400}.heroCopy h1{font-size:clamp(31px,4vw,50px);line-height:1.02;margin:9px 0 10px}.heroCopy p{margin:0;color:#a79c88;font-size:12px;letter-spacing:.06em}.tabs{display:flex;gap:7px;margin-top:16px;padding:7px;border:1px solid var(--line);border-radius:15px;background:rgba(20,15,9,.72);backdrop-filter:blur(14px)}.tabs button{border:0;background:transparent;color:#857b69;border-radius:10px;padding:11px 16px;display:flex;align-items:center;gap:8px;cursor:pointer;font:600 12px Manrope}.tabs button.active{color:#151006;background:linear-gradient(135deg,#e3b55d,#bd8231)}.content{padding-top:26px}.metricGrid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:14px}.metric{min-height:150px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,rgba(31,23,13,.72),rgba(12,9,5,.87));padding:24px;display:flex;flex-direction:column;justify-content:center}.metric small{color:#8e816d;font-size:9px;letter-spacing:.2em}.metric strong{font-family:Georgia,serif;font-size:20px;font-weight:400;line-height:1.25;margin-top:11px}.metric p{font-size:11px;color:#746b5e;margin:8px 0 0}.heroMetric{display:flex;flex-direction:row;align-items:center;gap:22px;justify-content:flex-start}.heroMetric>div:last-child{display:flex;flex-direction:column}.heroMetric strong{font-size:27px}.ring{--progress:0deg;width:84px;height:84px;flex:none;border-radius:50%;background:conic-gradient(var(--gold) var(--progress),rgba(255,255,255,.08) 0);display:grid;place-items:center;position:relative}.ring:after{content:"";position:absolute;inset:6px;border-radius:50%;background:#0b0805}.ring span{z-index:1;font-family:Georgia,serif;color:#e7c177;font-size:19px}.phaseGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px}.phaseCard{border:1px solid var(--line);border-radius:15px;background:rgba(15,11,7,.78);color:#8e8372;min-height:104px;padding:16px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;text-align:left;cursor:pointer}.phaseCard.complete{border-color:rgba(202,158,74,.42);color:#d9bc83;background:rgba(38,27,12,.72)}.phaseNo{font:700 10px monospace;color:#665b4b}.phaseCard small{display:block;font-size:9px;letter-spacing:.12em;text-transform:uppercase}.phaseCard strong{display:block;margin-top:5px;font:400 18px Georgia,serif;color:#d9cdb6}.phaseCard em{display:block;margin-top:5px;font:500 9px Manrope;font-style:normal;color:#756b5c}.sectionHead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px}.sectionHead h2{font-size:35px;margin:6px 0 0}.sectionHead>span,.sectionHead>a{font-size:11px;color:#827765;text-decoration:none}.sectionHead>a{display:flex;gap:7px;align-items:center;color:#cfaa67}.workflowList{display:flex;flex-direction:column;gap:14px}.phaseBlock{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:rgba(14,10,6,.8)}.phaseBlock>header{padding:17px 20px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:230px 1fr;align-items:center;gap:20px}.phaseBlock header>div:first-child{display:flex;justify-content:space-between;gap:12px}.phaseBlock header small{font-size:10px;color:#aa9165;letter-spacing:.11em}.phaseBlock header strong{font:400 13px monospace;color:#d5b877}.phaseBar{height:3px;background:rgba(255,255,255,.055);border-radius:99px;overflow:hidden}.phaseBar i{display:block;height:100%;background:linear-gradient(90deg,#8c581f,#e1ae52)}.stepList{padding:7px}.step{width:100%;border:0;background:transparent;color:#bbb09e;display:flex;align-items:center;gap:13px;text-align:left;padding:12px 14px;border-radius:10px;cursor:pointer;font:500 13px Manrope}.step:hover{background:rgba(255,255,255,.025)}.step.completed{color:#6f675b}.step.completed>.stepCopy>span{text-decoration:line-through}.stepCopy{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.stepCopy small{font:700 8px JetBrains Mono,monospace;color:#806d4e;letter-spacing:.1em}.checkBox,.tinyCheck{width:20px;height:20px;flex:none;border:1px solid #5e5141;border-radius:6px;display:grid;place-items:center;color:#171005;background:transparent}.completed .checkBox,.tinyCheck.checked{background:#c89340;border-color:#c89340}.empty{color:#625b50;padding:11px 14px;font-size:12px}.addCard{display:grid;grid-template-columns:170px minmax(220px,1fr) 190px auto auto;gap:10px;align-items:center;border:1px solid rgba(217,165,74,.27);border-radius:17px;padding:18px;background:rgba(33,23,10,.6);margin-bottom:15px}.addCard small{display:block;color:#8e7650;font-size:9px;letter-spacing:.17em}.addCard strong{font:400 17px Georgia,serif;display:block;margin-top:4px}.addCard input,.addCard select,.editInput,.editSelect{background:#0b0805;border:1px solid #342a1d;color:#d9cdb9;border-radius:10px;padding:11px 12px;outline:none;font:500 12px Manrope}.compactToggle,.editToggle{display:flex;align-items:center;gap:7px;color:#9f927e;font-size:11px;white-space:nowrap}.compactToggle input,.editToggle input{accent-color:#c99543}.primary{border:1px solid #d1a052;border-radius:10px;background:#c99543;color:#160f06;padding:11px 15px;display:flex;gap:7px;align-items:center;font-weight:700;cursor:pointer}.editorList{display:flex;flex-direction:column;gap:12px}.editorPhase{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:rgba(14,10,6,.75)}.editorPhase>header{display:flex;justify-content:space-between;padding:13px 17px;border-bottom:1px solid var(--line);font-size:10px;letter-spacing:.1em;color:#9e875f}.editorPhase>header small{color:#5f584d}.editorRow{min-height:55px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.035);display:flex;align-items:center;gap:8px}.editorRow:last-child{border-bottom:0}.editorRow.inactive{opacity:.48}.tinyCheck{width:18px;height:18px;cursor:pointer}.rowTitle{font-size:12px;color:#b7ad9d;flex:1;min-width:0}.rowTitle>small{display:block;margin-top:4px;font:700 8px JetBrains Mono,monospace;color:#655b4d;letter-spacing:.08em}.rowTitle.done>span{text-decoration:line-through}.icon{width:34px;height:32px;border:1px solid #2c241a;border-radius:8px;background:#0a0705;color:#7e7465;display:grid;place-items:center;cursor:pointer}.icon:hover:not(:disabled){color:#c8aa75;border-color:#5e4527}.icon:disabled{opacity:.25;cursor:not-allowed}.icon.ok{color:#b9cf9f}.icon.danger:hover,.icon.danger.confirm{color:#d69076;border-color:#724334}.editInput{flex:1;min-width:180px}.editSelect{width:130px}.studioFrame{height:690px;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#0a0805}.studioFrame iframe{border:0;width:100%;height:100%;background:#0a0805}.studioNote{font-size:11px;color:#6f675c;margin:11px 3px 0}@media(max-width:900px){.metricGrid{grid-template-columns:1fr}.phaseGrid{grid-template-columns:repeat(2,1fr)}.addCard{grid-template-columns:1fr}.phaseBlock>header{grid-template-columns:1fr}.editorRow{flex-wrap:wrap}.studioFrame{height:620px}}@media(max-width:620px){.historyShell{padding:0 13px 55px}.topbar{height:64px;grid-template-columns:1fr auto}.miniBrand{display:none}.saveState{max-width:150px;text-align:right}.hero{height:230px;margin-top:16px;border-radius:15px}.heroCopy{left:20px;right:20px;bottom:22px}.heroCopy h1{font-size:30px}.tabs{overflow-x:auto;justify-content:flex-start}.tabs button{white-space:nowrap;padding:10px 12px}.phaseGrid{grid-template-columns:1fr}.sectionHead h2{font-size:30px}.sectionHead>span{display:none}.heroMetric{gap:15px}.ring{width:72px;height:72px}.rowTitle{min-width:calc(100% - 38px)}.editInput{min-width:calc(100% - 38px)}.editSelect{margin-left:28px;flex:1}.studioFrame{height:540px}}
      `}</style>
    </main>
  );
}
