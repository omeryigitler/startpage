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
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BANNER_IMAGE, LOGO_IMAGE } from "./assets";

const AI_STUDIO_URL = "https://ai.studio/apps/93a76e46-66fd-4032-a918-43cc3e60755a";
const STORAGE_KEY = "history-archived-workspace-v3";
const LEGACY_KEYS = ["history-archived-workspace-v2", "history-archived-workspace-v1"];

type PhaseId = "research" | "packaging" | "script" | "production" | "review" | "upload";
type TabId = "overview" | "workflow" | "configure" | "studio";
type WorkflowStep = {
  id: string;
  phase: PhaseId;
  title: string;
  completed: boolean;
  completedAt: string | null;
  required: boolean;
  active: boolean;
};
type WorkspaceState = { version: 3; videoTitle: string; workflow: WorkflowStep[] };

const PHASES: { id: PhaseId; code: string; label: string; short: string }[] = [
  { id: "research", code: "01", label: "PHASE 1 — RESEARCH", short: "Research" },
  { id: "packaging", code: "02", label: "PHASE 2 — PACKAGING", short: "Packaging" },
  { id: "script", code: "03", label: "PHASE 3 — SCRIPT", short: "Script" },
  { id: "production", code: "04", label: "PHASE 4 — PRODUCTION", short: "Production" },
  { id: "review", code: "05", label: "PHASE 5 — FINAL REVIEW", short: "Review" },
  { id: "upload", code: "06", label: "PHASE 6 — PUBLISH PACKAGE", short: "Publish" },
];

const DEFAULT_BASE: Array<Omit<WorkflowStep, "completed" | "completedAt">> = [
  { id: "research-1", phase: "research", title: "Collect current, reliable Roanoke sources", required: true, active: true },
  { id: "research-2", phase: "research", title: "Build the verified event chronology", required: true, active: true },
  { id: "research-3", phase: "research", title: "Map the leading historical theories", required: true, active: true },
  { id: "research-4", phase: "research", title: "Review current archaeological evidence", required: true, active: true },
  { id: "research-5", phase: "research", title: "Separate established facts from disputed claims", required: true, active: true },
  { id: "packaging-6", phase: "packaging", title: "Create 10 title alternatives", required: true, active: true },
  { id: "packaging-7", phase: "packaging", title: "Select the strongest 3 titles", required: true, active: true },
  { id: "packaging-8", phase: "packaging", title: "Develop thumbnail concepts", required: true, active: true },
  { id: "packaging-9", phase: "packaging", title: "Lock the final video angle and story promise", required: true, active: true },
  { id: "script-10", phase: "script", title: "Draft hook options", required: true, active: true },
  { id: "script-11", phase: "script", title: "Build the narrative outline", required: true, active: true },
  { id: "script-12", phase: "script", title: "Write the final 9–12 minute English script", required: true, active: true },
  { id: "script-13", phase: "script", title: "Run final fact-check and source pass", required: true, active: true },
  { id: "production-14", phase: "production", title: "Build the scene-by-scene shot list", required: true, active: true },
  { id: "production-15", phase: "production", title: "Write AI image prompts", required: true, active: true },
  { id: "production-16", phase: "production", title: "Write AI video prompts where needed", required: false, active: true },
  { id: "production-17", phase: "production", title: "Plan maps and timeline graphics", required: true, active: true },
  { id: "production-18", phase: "production", title: "Plan music and sound design", required: true, active: true },
  { id: "review-26", phase: "review", title: "Verify citations and disputed historical claims", required: true, active: true },
  { id: "review-27", phase: "review", title: "Clear archive footage, images, and asset rights", required: true, active: true },
  { id: "review-28", phase: "review", title: "Confirm music and sound licenses", required: true, active: true },
  { id: "review-29", phase: "review", title: "Review YouTube altered / synthetic content disclosure", required: true, active: true },
  { id: "review-30", phase: "review", title: "Complete final video and channel-safety QA", required: true, active: true },
  { id: "upload-19", phase: "upload", title: "Lock the final YouTube title", required: true, active: true },
  { id: "upload-20", phase: "upload", title: "Export the final thumbnail", required: true, active: true },
  { id: "upload-21", phase: "upload", title: "Write the description and source list", required: true, active: true },
  { id: "upload-22", phase: "upload", title: "Add chapters", required: true, active: true },
  { id: "upload-23", phase: "upload", title: "Add tags and keyword variants", required: false, active: true },
  { id: "upload-24", phase: "upload", title: "Write the pinned comment", required: true, active: true },
  { id: "upload-25", phase: "upload", title: "Configure the end screen and next-video bridge", required: true, active: true },
];

const LEGACY_TITLES: Record<string, string> = {
  "Roanoke hakkında güncel ve güvenilir kaynak araştırması": "Collect current, reliable Roanoke sources",
  "Doğrulanmış olayların kronolojisi": "Build the verified event chronology",
  "Ana teoriler": "Map the leading historical theories",
  "Güncel arkeolojik kanıtlar": "Review current archaeological evidence",
  "Güvenilir ve tartışmalı iddiaların ayrımı": "Separate established facts from disputed claims",
  "10 başlık alternatifi": "Create 10 title alternatives",
  "En güçlü 3 başlık": "Select the strongest 3 titles",
  "Thumbnail konseptleri": "Develop thumbnail concepts",
  "Final video angle / story promise": "Lock the final video angle and story promise",
  "Hook seçenekleri": "Draft hook options",
  "Ayrıntılı narrative outline": "Build the narrative outline",
  "9–12 dakikalık final İngilizce senaryo": "Write the final 9–12 minute English script",
  "Fact-check": "Run final fact-check and source pass",
  "Sahne sahne shot list": "Build the scene-by-scene shot list",
  "AI image prompts": "Write AI image prompts",
  "Gerekirse AI video prompts": "Write AI video prompts where needed",
  "Harita / timeline planı": "Plan maps and timeline graphics",
  "Müzik ve SFX planı": "Plan music and sound design",
  "Final title": "Lock the final YouTube title",
  "Final thumbnail": "Export the final thumbnail",
  "Description": "Write the description and source list",
  "Chapters": "Add chapters",
  "Tags / keywords": "Add tags and keyword variants",
  "Pinned comment": "Write the pinned comment",
  "End-screen / ikinci video geçişi": "Configure the end screen and next-video bridge",
};

const DEFAULT_STATE: WorkspaceState = {
  version: 3,
  videoTitle: "The Lost Colony of Roanoke",
  workflow: DEFAULT_BASE.map((step) => ({ ...step, completed: step.phase === "research", completedAt: null })),
};

function normalizeState(value: unknown): WorkspaceState | null {
  if (!value || typeof value !== "object") return null;
  const source = value as { version?: unknown; videoTitle?: unknown; workflow?: unknown };
  if (typeof source.videoTitle !== "string" || !Array.isArray(source.workflow)) return null;
  const sourceVersion = typeof source.version === "number" ? source.version : 1;
  const seen = new Set<string>();
  const workflow: WorkflowStep[] = [];
  for (const raw of source.workflow) {
    if (!raw || typeof raw !== "object") return null;
    const step = raw as Partial<WorkflowStep> & { phase?: string };
    if (typeof step.id !== "string" || seen.has(step.id)) return null;
    if (typeof step.phase !== "string" || !PHASES.some((phase) => phase.id === step.phase)) return null;
    if (typeof step.title !== "string" || typeof step.completed !== "boolean") return null;
    seen.add(step.id);
    workflow.push({
      id: step.id,
      phase: step.phase as PhaseId,
      title: LEGACY_TITLES[step.title] ?? step.title,
      completed: step.completed,
      completedAt: typeof step.completedAt === "string" ? step.completedAt : null,
      required: typeof step.required === "boolean" ? step.required : true,
      active: typeof step.active === "boolean" ? step.active : true,
    });
  }
  if (sourceVersion < 3) {
    const review = DEFAULT_BASE.filter((step) => step.phase === "review" && !seen.has(step.id));
    const uploadIndex = workflow.findIndex((step) => step.phase === "upload");
    workflow.splice(uploadIndex < 0 ? workflow.length : uploadIndex, 0, ...review.map((step) => ({ ...step, completed: false, completedAt: null })));
  }
  return { version: 3, videoTitle: source.videoTitle, workflow };
}

export default function HistoryArchivedWorkspace() {
  const [tab, setTab] = useState<TabId>("overview");
  const [state, setState] = useState<WorkspaceState>(DEFAULT_STATE);
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
  const [resetArmed, setResetArmed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
      if (raw) {
        const local = normalizeState(JSON.parse(raw));
        if (local) setState(local);
      }
    } catch {}
    let cancelled = false;
    fetch("/api/history-state", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { state?: unknown }) => {
        const remote = normalizeState(payload.state);
        if (!cancelled && remote) {
          setState(remote);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
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
        .then((response) => response.ok ? setSaveStatus("saved") : Promise.reject())
        .catch(() => setSaveStatus("local"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state, hydrated]);

  const activeRequired = useMemo(() => state.workflow.filter((step) => step.active && step.required), [state.workflow]);
  const activeVisible = useMemo(() => state.workflow.filter((step) => step.active), [state.workflow]);
  const completedRequired = activeRequired.filter((step) => step.completed).length;
  const completedVisible = activeVisible.filter((step) => step.completed).length;
  const percent = activeRequired.length ? Math.round((completedRequired / activeRequired.length) * 100) : 100;
  const nextStep = state.workflow.find((step) => step.active && step.required && !step.completed);

  function phaseStats(phase: PhaseId) {
    const steps = state.workflow.filter((step) => step.phase === phase && step.active);
    const required = steps.filter((step) => step.required);
    return {
      total: steps.length,
      done: steps.filter((step) => step.completed).length,
      requiredTotal: required.length,
      requiredDone: required.filter((step) => step.completed).length,
    };
  }

  function phaseStatus(phase: PhaseId) {
    const stats = phaseStats(phase);
    if (!stats.total) return "Disabled";
    if (!stats.requiredTotal || stats.requiredDone === stats.requiredTotal) return "Complete";
    const current = state.workflow.find((step) => step.active && step.required && !step.completed);
    return current?.phase === phase ? "In progress" : "Not started";
  }

  function toggleStep(id: string) {
    setState((current) => ({
      ...current,
      workflow: current.workflow.map((step) => step.id === id ? {
        ...step,
        completed: !step.completed,
        completedAt: step.completed ? null : new Date().toISOString(),
      } : step),
    }));
  }

  function addStep() {
    const title = newTitle.trim();
    if (!title) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `custom-${Date.now()}`;
    setState((current) => ({ ...current, workflow: [...current.workflow, { id, phase: newPhase, title, required: newRequired, active: true, completed: false, completedAt: null }] }));
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
    if (!editId || !editTitle.trim()) return;
    setState((current) => {
      const original = current.workflow.find((step) => step.id === editId);
      if (!original) return current;
      const updated = { ...original, title: editTitle.trim(), phase: editPhase, required: editRequired, active: editActive };
      const remaining = current.workflow.filter((step) => step.id !== editId);
      if (original.phase === editPhase) return { ...current, workflow: current.workflow.map((step) => step.id === editId ? updated : step) };
      const lastTarget = remaining.reduce((last, step, index) => step.phase === editPhase ? index : last, -1);
      remaining.splice(lastTarget + 1, 0, updated);
      return { ...current, workflow: remaining };
    });
    setEditId(null);
  }

  function moveStep(id: string, direction: -1 | 1) {
    setState((current) => {
      const source = current.workflow.findIndex((step) => step.id === id);
      if (source < 0) return current;
      const phase = current.workflow[source].phase;
      const siblings = current.workflow.map((step, index) => ({ step, index })).filter(({ step }) => step.phase === phase).map(({ index }) => index);
      const target = siblings[siblings.indexOf(source) + direction];
      if (target === undefined) return current;
      const next = [...current.workflow];
      [next[source], next[target]] = [next[target], next[source]];
      return { ...current, workflow: next };
    });
  }

  function removeStep(id: string) {
    if (deleteId !== id) { setDeleteId(id); return; }
    setState((current) => ({ ...current, workflow: current.workflow.filter((step) => step.id !== id) }));
    setDeleteId(null);
    if (editId === id) setEditId(null);
  }

  function restoreDefaults() {
    if (!resetArmed) { setResetArmed(true); return; }
    setState(DEFAULT_STATE);
    setResetArmed(false);
    setEditId(null);
    setDeleteId(null);
  }

  const saveLabel = saveStatus === "saving" ? "SAVING" : saveStatus === "saved" ? "SAVED" : saveStatus === "local" ? "LOCAL BACKUP" : "WORKFLOW ONLINE";

  return (
    <main className="historyApp" lang="en">
      <div className="historyGrid" />
      <div className="historyGlow" />

      <header className="historyTopbar">
        <Link href="/" className="historyBack"><ArrowLeft size={15} /> STARTPAGE</Link>
        <div className="historyBrand"><img src={LOGO_IMAGE} alt="The History Archived" /><span>THE HISTORY ARCHIVED</span><small>CONTENT COMMAND CENTER</small></div>
        <span className={`historySave ${saveStatus}`}><i /> {saveLabel}</span>
      </header>

      <section className="historyHero">
        <img src={BANNER_IMAGE} alt="The History Archived banner" />
        <div className="historyHeroShade" />
        <div className="historyHeroCopy">
          <span>THA-001 · CURRENT PRODUCTION</span>
          <h1>{state.videoTitle}</h1>
          <p>9–12 MIN <b>·</b> HIGH CTR <b>·</b> HIGH RETENTION <b>·</b> EVERGREEN</p>
        </div>
      </section>

      <nav className="historyTabs" aria-label="The History Archived workspace">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><Sparkles size={15} /> DASHBOARD</button>
        <button className={tab === "workflow" ? "active" : ""} onClick={() => setTab("workflow")}><ListChecks size={15} /> WORKFLOW</button>
        <button className={tab === "configure" ? "active" : ""} onClick={() => setTab("configure")}><Settings2 size={15} /> CONFIGURE</button>
        <button className={tab === "studio" ? "active" : ""} onClick={() => setTab("studio")}><ExternalLink size={15} /> AI STUDIO</button>
      </nav>

      {tab === "overview" && (
        <section className="historyContent">
          <div className="historySectionTitle"><div><span>SYSTEM / THE-HISTORY-ARCHIVED / ACTIVE</span><h2>CONTENT COMMAND CENTER</h2></div></div>
          <div className="historyDashboardGrid">
            <article className="historyCurrentCard">
              <div className="historyCurrentHead"><div><span className="historyMeta">NEXT VIDEO</span><strong>THA-001</strong></div><span className="historyStatus">{phaseStatus(nextStep?.phase ?? "upload")}</span></div>
              <h3>THE LOST COLONY OF ROANOKE: 115 PEOPLE VANISHED WITHOUT A TRACE</h3>
              <div className="historyTags"><span>HIGH CTR</span><span>HIGH RETENTION</span><span>EVERGREEN</span></div>
              <div className="historyNextAction"><span className="historyMeta">NEXT ACTION</span><strong>{nextStep?.title ?? "Workflow complete — ready to publish"}</strong><small>{nextStep ? PHASES.find((phase) => phase.id === nextStep.phase)?.label : "ALL REQUIRED STEPS COMPLETE"}</small></div>
              <div className="historyProgressRow"><div><span>PRODUCTION PROGRESS</span><b>{percent}%</b></div><div className="historyProgressTrack"><i style={{ width: `${percent}%` }} /></div><small>{completedRequired} / {activeRequired.length} required steps complete</small></div>
              <button className="historyPrimary" onClick={() => setTab("workflow")}>CONTINUE WORK <ArrowUp size={14} /></button>
            </article>

            <aside className="historySideStack">
              <article className="historyMini"><span className="historyMeta">WORKFLOW STATE</span><strong>{completedVisible} / {activeVisible.length}</strong><p>active steps completed</p></article>
              <article className="historyMini historyLegal"><ShieldCheck size={20} /><div><span className="historyMeta">LEGAL & SAFETY</span><strong>{phaseStatus("review") === "Complete" ? "CLEARED" : "NOT YET DUE"}</strong><p>rights · citations · disclosure</p></div></article>
              <article className="historyMini"><span className="historyMeta">UP NEXT · THA-002</span><strong className="historyUpcomingTitle">How Inflation and Corruption Helped Destroy the Roman Empire</strong><p>High RPM · Evergreen · Authority Building</p></article>
            </aside>
          </div>

          <div className="historyPipelineHead"><span>PIPELINE</span><small>Click any phase to open workflow</small></div>
          <div className="historyPhaseGrid">
            {PHASES.map((phase) => {
              const stats = phaseStats(phase.id);
              const status = phaseStatus(phase.id);
              return <button key={phase.id} className={`historyPhaseCard ${status === "Complete" ? "complete" : status === "In progress" ? "current" : ""}`} onClick={() => setTab("workflow")}><span className="historyPhaseCode">{phase.code}</span><div><small>{phase.short.toUpperCase()}</small><strong>{stats.done}/{stats.total}</strong><em>{status}</em></div>{status === "Complete" ? <CheckCircle2 size={18} /> : <Circle size={18} />}</button>;
            })}
          </div>
        </section>
      )}

      {tab === "workflow" && (
        <section className="historyContent">
          <div className="historySectionTitle"><div><span>PRODUCTION / THA-001</span><h2>WORKFLOW</h2><p>Mark finished steps. Overall progress updates automatically.</p></div><div className="historySummary"><b>{completedRequired}/{activeRequired.length}</b><span>REQUIRED COMPLETE</span></div></div>
          <div className="historyWorkflowList">
            {PHASES.map((phase) => {
              const steps = state.workflow.filter((step) => step.phase === phase.id && step.active);
              const stats = phaseStats(phase.id);
              const phasePercent = stats.requiredTotal ? Math.round((stats.requiredDone / stats.requiredTotal) * 100) : 100;
              return <article className="historyPhaseBlock" key={phase.id}><header><div className="historyPhaseHeading"><span>{phase.code}</span><div><small>{phase.label}</small><strong>{phase.short}</strong></div></div><div className="historyPhaseStat"><b>{stats.done}/{stats.total}</b><span>{phaseStatus(phase.id)}</span></div></header><div className="historyPhaseBar"><i style={{ width: `${phasePercent}%` }} /></div><div className="historyStepList">{!steps.length && <p className="historyEmpty">No active steps. Add or enable one from Configure.</p>}{steps.map((step) => <button key={step.id} className={step.completed ? "historyStep completed" : "historyStep"} onClick={() => toggleStep(step.id)}><span className="historyCheck">{step.completed && <Check size={13} />}</span><span>{step.title}</span>{!step.required && <small>OPTIONAL</small>}</button>)}</div></article>;
            })}
          </div>
        </section>
      )}

      {tab === "configure" && (
        <section className="historyContent">
          <div className="historySectionTitle"><div><span>SYSTEM / WORKFLOW EDITOR</span><h2>CONFIGURE WORKFLOW</h2><p>Add, edit, reorder, disable, or remove steps without changing code.</p></div><button className={resetArmed ? "historyDanger armed" : "historyDanger"} onClick={restoreDefaults}><RotateCcw size={13} /> {resetArmed ? "CLICK AGAIN TO RESET" : "RESTORE DEFAULTS"}</button></div>
          <article className="historyAdd"><div><span className="historyMeta">NEW STEP</span><strong>Add to workflow</strong></div><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addStep(); }} placeholder="Workflow step name" /><select value={newPhase} onChange={(event) => setNewPhase(event.target.value as PhaseId)}>{PHASES.map((phase) => <option key={phase.id} value={phase.id}>{phase.label}</option>)}</select><label className="historyToggle"><input type="checkbox" checked={newRequired} onChange={(event) => setNewRequired(event.target.checked)} /><span /> REQUIRED</label><button className="historyPrimary compact" onClick={addStep}><Plus size={14} /> ADD STEP</button></article>
          <div className="historyEditorList">
            {PHASES.map((phase) => {
              const steps = state.workflow.filter((step) => step.phase === phase.id);
              return <article className="historyEditorPhase" key={phase.id}><header><div><span>{phase.code}</span><strong>{phase.label}</strong></div><small>{steps.length} STEPS</small></header>{!steps.length && <p className="historyEmpty">No steps defined.</p>}{steps.map((step, index) => <div className={step.active ? "historyEditorRow" : "historyEditorRow inactive"} key={step.id}><button className={step.completed ? "historyTinyCheck checked" : "historyTinyCheck"} onClick={() => toggleStep(step.id)} aria-label="Toggle completion">{step.completed && <Check size={11} />}</button>{editId === step.id ? <><input className="historyEditInput" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /><select className="historyEditSelect" value={editPhase} onChange={(event) => setEditPhase(event.target.value as PhaseId)}>{PHASES.map((item) => <option key={item.id} value={item.id}>{item.short}</option>)}</select><label className="historyInline"><input type="checkbox" checked={editRequired} onChange={(event) => setEditRequired(event.target.checked)} /> REQUIRED</label><label className="historyInline"><input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} /> ACTIVE</label><button className="historyIcon confirm" onClick={saveEdit} aria-label="Save"><Check size={14} /></button><button className="historyIcon" onClick={() => setEditId(null)} aria-label="Cancel"><X size={14} /></button></> : <><span className={step.completed ? "historyRowTitle done" : "historyRowTitle"}>{step.title}<small>{step.required ? "REQUIRED" : "OPTIONAL"} · {step.active ? "ACTIVE" : "DISABLED"}</small></span><button className="historyIcon" disabled={index === 0} onClick={() => moveStep(step.id, -1)} aria-label="Move up"><ArrowUp size={13} /></button><button className="historyIcon" disabled={index === steps.length - 1} onClick={() => moveStep(step.id, 1)} aria-label="Move down"><ArrowDown size={13} /></button><button className="historyIcon" onClick={() => startEdit(step)} aria-label="Edit"><Pencil size={13} /></button><button className={deleteId === step.id ? "historyIcon danger armed" : "historyIcon danger"} onClick={() => removeStep(step.id)} aria-label={deleteId === step.id ? "Confirm delete" : "Delete"}>{deleteId === step.id ? <Check size={13} /> : <Trash2 size={13} />}</button></>}</div>)}</article>;
            })}
          </div>
        </section>
      )}

      {tab === "studio" && (
        <section className="historyContent"><div className="historySectionTitle"><div><span>CONNECTED PRODUCTION TOOL</span><h2>AI STUDIO</h2><p>Open the existing The History Archived production workspace.</p></div></div><article className="historyStudio"><img src={LOGO_IMAGE} alt="The History Archived" /><div><span className="historyMeta">THE HISTORY ARCHIVED</span><h3>Production Studio</h3><p>Research, script, visual prompts, and production work.</p></div><a href={AI_STUDIO_URL} target="_blank" rel="noreferrer">OPEN AI STUDIO <ExternalLink size={14} /></a></article>
        </section>
      )}
    </main>
  );
}
