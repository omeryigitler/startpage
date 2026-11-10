"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownLeft, ArrowRight, Bot, BriefcaseBusiness, Check, CirclePause, ExternalLink, FileText, FolderKanban, Globe2, Inbox, LayoutDashboard, Plus, RefreshCw, Search, Settings2, ShieldCheck, Users, Wallet, X } from "lucide-react";
import { AGENCY_ORIGIN, agencySections, type AgencySection, type Prospect, type StudioRecords, type StudioStatus } from "./agency-model";
import styles from "./agency.module.css";
import { Select, NumberControl } from "./AgencyControls";
import PricingPlugin from "./PricingPlugin";
import AgencyPipeline from "./AgencyPipeline";
import { agencyApi as api, AgencyError } from "./agency-api";

const icons = { overview: LayoutDashboard, sales: BriefcaseBusiness, studio: Bot, projects: FolderKanban, clients: Users, quotes: FileText, pricing: Wallet, messages: Inbox, world: Globe2, control: Settings2 };
const stageLabels: Record<string, string> = { Discovery: "Discovery", Research: "Research", Qualified: "Qualified", Demo: "Demo", Proposal: "Proposal", Contacted: "Contacted", Meeting: "Meeting", Negotiation: "Negotiation", Won: "Won", Lost: "Lost" };
const statusLabels: Record<string, string> = { review: "Ready for review", approved: "Approved", running: "Running", paused: "Paused", queued: "Queued", cancelled: "Cancelled", completed: "Completed", failed: "Failed" };

function LegacyAdmin({ view, title, onPricing }: { view: string; title: string; onPricing: (context: Record<string, unknown>) => void }) {
  const initialView = useRef(view);
  const frame = useRef<HTMLIFrameElement>(null);
  const latestView = useRef(view);
  const [ready, setReady] = useState(false);
  const [delayed, setDelayed] = useState(false);
  latestView.current = view;
  useEffect(() => {
    const timer = window.setTimeout(() => setDelayed(true), 14000);
    function onMessage(event: MessageEvent) {
      if (event.origin !== AGENCY_ORIGIN || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "taurus:agency:open-pricing") onPricing(event.data.context || {});
      if (event.data?.type === "taurus:agency:ready") {
        setReady(true); window.clearTimeout(timer);
        frame.current?.contentWindow?.postMessage({ type: "taurus:agency:navigate", view: latestView.current }, AGENCY_ORIGIN);
      }
    }
    window.addEventListener("message", onMessage);
    return () => { window.clearTimeout(timer); window.removeEventListener("message", onMessage); };
  }, [onPricing]);
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: "taurus:agency:navigate", view }, AGENCY_ORIGIN);
  }, [view, ready]);
  const returnUrl = `https://start.omeryigitler.com/${window.location.hash}`;
  return <div className={styles.legacy}>
    {!ready && <div className={styles.connection} role="status">
      <ShieldCheck size={30} />
      <h3>{delayed ? "Renew your management session" : "Opening your secure workspace"}</h3>
      <p>{delayed ? "Complete Gateway sign-in to return to this section." : "Verifying your existing management session."}</p>
      {delayed && <a className={styles.primary} href={`${AGENCY_ORIGIN}/start-gateway.html?return=${encodeURIComponent(returnUrl)}`}>Continue with Gateway <ArrowRight size={16} /></a>}
    </div>}
    <iframe ref={frame} title={`${title} workspace`} src={`${AGENCY_ORIGIN}/workspace.html?embed=agency&view=${initialView.current}`} className={ready ? styles.frame : styles.frameLoading} referrerPolicy="strict-origin" />
  </div>;
}

function CompanyForm({ onSave, busy }: { onSave: (body: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    await onSave({ kind: "prospect", ...Object.fromEntries(new FormData(form)) });
  }
  return <form className={styles.form} onSubmit={submit}>
    <label>Company name<input name="name" required maxLength={200} autoComplete="organization" /></label>
    <label>Market<Select name="country"><option value="MT">Malta · EUR</option><option value="TR">Türkiye · TRY</option></Select></label>
    <label>Location<input name="location" maxLength={200} placeholder="City / area" /></label>
    <label>Industry<input name="industry" maxLength={200} /></label>
    <label>Website<input name="website" type="url" maxLength={500} placeholder="https://" /></label>
    <label>Research source<input name="source" type="url" required maxLength={500} placeholder="https://" /></label>
    <label className={styles.full}>Research notes<textarea name="notes" rows={3} maxLength={2000} /></label>
    <div className={styles.full}><button className={styles.primary} disabled={busy} type="submit"><Plus size={16} />{busy ? "Saving…" : "Save company"}</button></div>
  </form>;
}

function CompanyCard({ company, stages, mutate, busy }: { company: Prospect; stages: string[]; mutate: (body: Record<string, unknown>) => Promise<void>; busy: boolean }) {
  const [stage, setStage] = useState(company.stage);
  const [confirmed, setConfirmed] = useState(false);
  return <article className={styles.company}>
    <div className={styles.companyTop}><span className={styles.market}>{company.country}</span><span className={styles.badge}>{stageLabels[company.stage] || company.stage}</span></div>
    <h3>{company.name}</h3><p>{[company.location, company.industry].filter(Boolean).join(" · ") || (company.country === "MT" ? "Malta" : "Türkiye")}</p>
    {company.notes && <p className={styles.observation}>{company.notes}</p>}
    <div className={styles.links}>{company.website && <a href={company.website} target="_blank" rel="noopener noreferrer">Website <ExternalLink size={12} /></a>}<a href={company.source} target="_blank" rel="noopener noreferrer">Source <ExternalLink size={12} /></a></div>
    <form className={styles.stageForm} onSubmit={async event => { event.preventDefault(); await mutate({ kind: "prospect", id: company.id, stage, contactConfirmed: confirmed }); setConfirmed(false); }}>
      <label className={styles.srOnly} htmlFor={`stage-${company.id}`}>{company.name} sales stage</label>
      <Select id={`stage-${company.id}`} value={stage} onChange={e => setStage(e.target.value)}>{stages.map(value => <option key={value} value={value}>{stageLabels[value] || value}</option>)}</Select>
      <button type="submit" disabled={busy || stage === company.stage} aria-label={`${company.name} save stage`}><Check size={17} /></button>
      {stage === "Contacted" && company.stage !== "Contacted" && <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />I completed the first contact manually.</label>}
    </form>
  </article>;
}

function AgencyPanel({ section, navigate, onPricing }: { section: AgencySection; navigate: (section: AgencySection) => void; onPricing: (context: Record<string, unknown>) => void }) {
  const [records, setRecords] = useState<StudioRecords | null>(null);
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [draft, setDraft] = useState<StudioStatus["settings"] | null>(null);
  const [error, setError] = useState<AgencyError | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [market, setMarket] = useState("all");
  const [query, setQuery] = useState("");
  const reload = useCallback(async (signal?: AbortSignal) => {
    const value = section === "control" ? await api<StudioStatus>("status", undefined, signal) : await api<StudioRecords>("records", undefined, signal);
    if (signal?.aborted) return;
    if (section === "control") { setStatus(value as StudioStatus); setDraft((value as StudioStatus).settings); }
    else setRecords(value as StudioRecords);
  }, [section]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setNotice("");
    reload(controller.signal).catch(cause => { if (!controller.signal.aborted) setError(cause); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function mutate(action: string, body: Record<string, unknown>) {
    setBusy(true); setError(null); setNotice("");
    try { await api(action, body); await reload(); setNotice("Saved."); setShowForm(false); }
    catch (cause) { setError(cause instanceof AgencyError ? cause : new AgencyError("The action could not be completed. Try again.")); }
    finally { setBusy(false); }
  }
  if (loading) return <div className={styles.empty} role="status"><RefreshCw size={24} /><p>Loading records…</p></div>;
  return <div className={styles.content}>
    {error && <div className={styles.notice} role="alert"><p>{error.message}</p>{error.login ? <a className={styles.primary} href={`${AGENCY_ORIGIN}/start-gateway.html?return=${encodeURIComponent(`https://start.omeryigitler.com/#agency/${section}`)}`}>Continue with Gateway <ArrowRight size={15} /></a> : <button onClick={() => { setLoading(true); setError(null); void reload().catch(setError).finally(() => setLoading(false)); }}>Try again <RefreshCw size={14} /></button>}</div>}
    {notice && <p className={styles.saved} role="status"><Check size={15} />{notice}</p>}
    {section === "overview" && <>
      <div className={styles.intro}><span>ÖMER YİĞİTLER / DIGITAL STUDIO</span><h2>From discovery to delivery.<br /><em>One workspace.</em></h2><p>Research prospects, manage projects and plan the next step.</p><div className={styles.actions}><button className={styles.primary} onClick={() => navigate("sales")}>Open prospects <ArrowRight size={16} /></button><button onClick={() => navigate("world")}><Globe2 size={17} />World view</button></div></div>
      <div className={styles.metrics}>{[["Prospects", records?.prospects.length, "sales"], ["Concepts for review", records?.prospects.filter(company => company.draft?.status === "review").length, "studio"], ["Proposal stage", records?.prospects.filter(company => company.stage === "Proposal").length, "sales"]].map(([label, count, target]) => <button key={label} className={styles.metric} onClick={() => navigate(target as AgencySection)}><span>{label}</span><strong>{count ?? "—"}</strong><ArrowRight size={17} /></button>)}</div>
      <p className={styles.caption}>Based on the latest {records?.limit || 50} records. These are not all-time totals.</p>
      <div className={styles.workflow}><div><span>01 / DISCOVER</span><h3>Find the right prospect</h3><p>Choose a region and industry. Discover companies from a public directory with source links.</p></div><div><span>02 / CREATE</span><h3>Move work to the studio</h3><p>Inspect listed websites and prepare private concepts for promising companies.</p></div><div><span>03 / DELIVER</span><h3>From proposal to project</h3><p>Manage proposals, clients and project delivery in this workspace.</p></div></div>
      <div className={styles.callout}><ShieldCheck size={19} /><div><strong>Research → concept → your review</strong><p>Start a bounded research run in Sales. Inspect its findings and private concepts in Studio. Nothing is sent or published automatically.</p></div></div>
    </>}
    {section === "sales" && records && <>
      <AgencyPipeline mode="sales" records={records} refresh={reload} onPricing={onPricing} navigate={navigate} />
      <div className={styles.toolbar}><div className={styles.filters}><button aria-pressed={market === "all"} onClick={() => setMarket("all")}>All</button><button aria-pressed={market === "MT"} onClick={() => setMarket("MT")}>Malta</button><button aria-pressed={market === "TR"} onClick={() => setMarket("TR")}>Türkiye</button></div><button className={styles.primary} onClick={() => setShowForm(!showForm)} aria-expanded={showForm}>{showForm ? <X size={16} /> : <Plus size={16} />}Add manually</button></div>
      {showForm && <CompanyForm busy={busy} onSave={body => mutate("save", body)} />}
      <label className={styles.search}><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company, city or industry…" aria-label="Search prospects" /></label>
      <div className={styles.companyGrid}>{records.prospects.filter(company => (market === "all" || company.country === market) && `${company.name} ${company.location} ${company.industry}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))).map(company => <CompanyCard key={company.id} company={company} stages={records.stages} busy={busy} mutate={body => mutate("transition", body)} />)}</div>
      {!records.prospects.length && <div className={styles.empty}><BriefcaseBusiness size={32} /><h3>Your research list is empty</h3><p>Run discovery above, or add a company with a source.</p></div>}
      {records.prospects.length > 0 && !records.prospects.some(company => (market === "all" || company.country === market) && `${company.name} ${company.location} ${company.industry}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))) && <p className={styles.empty}>No prospects match these filters.</p>}
    </>}
    {section === "studio" && records && <AgencyPipeline mode="studio" records={records} refresh={reload} onPricing={onPricing} navigate={navigate} />}
    {section === "control" && status && draft && <>
      <div className={styles.callout}><ShieldCheck size={20} /><div><strong>Paid model execution is disabled</strong><p>Research uses public business data. Concepts use local templates; optional AI copy requires verified free-tier access.</p></div></div>
      <form className={styles.form} onSubmit={event => { event.preventDefault(); void mutate("settings", { settings: draft }); }}>
        <label className={styles.toggle}><span>Research & AI runner<small>Standard management tools run independently.</small></span><input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} /></label>
        <label className={styles.toggle}><span>Pause runner<small>Stops new research and model requests; in-flight work stops at its next checkpoint.</small></span><input type="checkbox" checked={draft.paused} onChange={e => setDraft({ ...draft, paused: e.target.checked })} /></label>
        <label>Execution mode<Select value={draft.mode} onChange={e => setDraft({ ...draft, mode: e.target.value as "FREE" | "HYBRID" })}><option value="FREE">FREE</option><option value="HYBRID">HYBRID · paid execution disabled</option></Select></label>
        <label>Requests per task<NumberControl label="requests per task" min={1} max={3} value={draft.maxRequestsPerTask} onChange={value => setDraft({ ...draft, maxRequestsPerTask: value })} /></label>
        <label>Daily request limit (UTC)<NumberControl label="daily request limit" min={1} max={500} value={draft.maxRequestsPerDay} onChange={value => setDraft({ ...draft, maxRequestsPerDay: value })} /></label>
        <label>Concurrent requests<NumberControl label="concurrent requests" min={1} max={3} value={draft.maxConcurrency} onChange={value => setDraft({ ...draft, maxConcurrency: value })} /></label>
        <div className={`${styles.full} ${styles.actions}`}><button className={styles.primary} type="submit" disabled={busy}>Save <Check size={16} /></button><button className={styles.stop} disabled={busy} type="button" onClick={() => void mutate("settings", { settings: { ...status.settings, enabled: false, paused: true } })}>Emergency stop <CirclePause size={16} /></button></div>
      </form>
      <div className={styles.provider}><span>Gemini</span><strong>{status.provider.configured ? "Configured on server" : "Not configured"}</strong><p>{status.provider.verified ? "Free-tier verification is current." : "Free-tier access is not verified. Model requests are blocked."}</p></div>
      <p className={styles.caption}>HYBRID does not authorize spending. In-flight requests may finish. Hosting and storage costs are separate.</p>
    </>}
  </div>;
}

export default function AgencyWorkspace({ section, onNavigate, onClose }: { section: AgencySection; onNavigate: (section: AgencySection) => void; onClose: () => void }) {
  const [pricingContext, setPricingContext] = useState<Record<string, unknown> | null>(null);
  const openPricing = useCallback((context: Record<string, unknown>) => { setPricingContext(context); onNavigate("pricing"); }, [onNavigate]);
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const item = agencySections.find(entry => entry.id === section)!;
  const Icon = icons[section];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const start = document.querySelector<HTMLElement>(".taurusStartpage");
    start?.setAttribute("inert", "");
    back.current?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape" && root.current?.querySelector('[role="combobox"][aria-expanded="true"]')) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const elements = root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), iframe');
      const visible = elements ? Array.from(elements).filter(element => element.getClientRects().length) : [];
      const first = visible[0], last = visible[visible.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", key, true);
    return () => { document.body.style.overflow = previousOverflow; start?.removeAttribute("inert"); document.removeEventListener("keydown", key, true); previous?.focus(); };
  }, [onClose]);
  return createPortal(<div className={styles.workspace} ref={root} role="dialog" aria-modal="true" aria-labelledby="agency-title" lang="en">
    <aside className={styles.sidebar}>
      <button className={styles.brand} ref={back} onClick={onClose}><img src="/logo.png" alt="" /><span>TAURUS<span>START / AGENCY</span></span><ArrowDownLeft size={17} /></button>
      <span className={styles.navLabel}>WORKSPACE</span>
      <nav aria-label="Agency sections">{agencySections.map(entry => { const EntryIcon = icons[entry.id]; return <button key={entry.id} className={section === entry.id ? styles.active : ""} aria-current={section === entry.id ? "page" : undefined} onClick={() => onNavigate(entry.id)}><EntryIcon size={18} /><span>{entry.title}</span>{section === entry.id && <i />}</button>; })}</nav>
      <footer><span><ShieldCheck size={14} /> Private workspace</span><button onClick={onClose}>Back to Startpage <ArrowDownLeft size={14} /></button></footer>
    </aside>
    <section className={styles.main}>
      <header className={styles.header}><div><span>STARTPAGE / AGENCY</span><h1 id="agency-title"><Icon size={22} />{item.title}</h1><p>{item.description}</p></div><button className={styles.close} onClick={onClose} aria-label="Close agency workspace"><X size={21} /></button></header>
      {"plugin" in item ? <PricingPlugin context={pricingContext} /> : "view" in item ? <LegacyAdmin view={item.view} title={item.title} onPricing={openPricing} /> : <AgencyPanel key={section} section={section} navigate={onNavigate} onPricing={openPricing} />}
    </section>
  </div>, document.body);
}
