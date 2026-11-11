"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Bot, Check, ChevronDown, ExternalLink, FileText, Play, RefreshCw, RotateCcw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { agencyApi as api, AgencyError } from "./agency-api";
import { Select, NumberControl } from "./AgencyControls";
import { AGENCY_ORIGIN, type AgencySection, type Prospect, type RunnerStatus, type StudioRecords, type StudioStatus } from "./agency-model";
import styles from "./agency.module.css";
import { runPreparedSteps, type AutomationDetail } from "./AgencyAutomation";

type Props = { mode: "sales" | "studio"; records: StudioRecords; refresh: () => Promise<void>; onPricing: (context: Record<string, unknown>) => void; navigate: (section: AgencySection) => void };
const labels: Record<string, string> = { queued: "Queued", running: "Running", review: "Ready for review", approved: "Approved", completed: "Completed", cancelled: "Cancelled", paused: "Paused", failed: "Failed" };
const failureLabels: Record<string, string> = { directory_timeout: "Directory timed out", directory_network: "Directory connection unavailable", directory_unavailable: "Directory temporarily busy", directory_rate_limit: "Directory request limit", directory_cooldown: "Waiting between searches", directory_limit: "Daily search limit reached", directory_configuration: "Directory connection needs review", directory_invalid: "Directory response unreadable", directory_incomplete: "Directory search incomplete", directory_response_limit: "Directory response too large" };
const phaseLabels: Record<string, string> = { directory: "Finding source-backed companies", research: "Inspecting company websites", pricing: "Loading current pricing", concept: "Preparing a private concept", copy: "Refining concept copy", storage: "Saving progress" };
function ConceptCard({ company, busy, decide, refine, onPricing, modelReady }: { company: Prospect; busy: boolean; decide: (decision: string) => void; refine: () => void; onPricing: Props["onPricing"]; modelReady: boolean }) {
  const draft = company.draft!;
  return <article className={styles.artifact}>
    <div className={styles.artifactBar}><div><span className={styles.badge}>{labels[draft.status] || draft.status}</span><h3>{company.name}</h3><p>{company.country} · {draft.language.toUpperCase()} · {draft.generatedBy === "gemini" ? "AI refined copy" : "Template concept · no model call"}</p></div><span className={styles.privateTag}><ShieldCheck size={14} />Private concept</span></div>
    <details className={styles.evidence}><summary>Research & sources <ChevronDown size={14} /></summary><p>Opportunity score: {company.research?.score ?? "—"}/100 · {company.research?.status?.replaceAll("_", " ") || "Not inspected"}</p><ul>{company.research?.signals.map((value, index) => <li key={index}>{value}</li>)}</ul><ul>{company.research?.limitations.map((value, index) => <li key={index}>{value}</li>)}</ul><a href={company.source} target="_blank" rel="noopener noreferrer">Research source <ExternalLink size={13} /></a>{company.research?.checkedUrl && <a href={company.research.checkedUrl} target="_blank" rel="noopener noreferrer">Inspected page <ExternalLink size={13} /></a>}</details>
    <div className={styles.conceptPreview} lang={draft.language}>
      <div className={styles.conceptNav}><strong>{company.name}</strong><span>{company.location}</span></div>
      <div className={styles.conceptHero}><span>{draft.industryLabel || company.industry}</span><h4>{draft.headline}</h4><p>{draft.subheading}</p><span className={styles.conceptCta}>{draft.cta}<ArrowRight size={15} /></span></div>
      <div className={styles.conceptSections}>{draft.sections.map((section, index) => <div key={index}><h5>{section.title}</h5><p>{section.body}</p></div>)}</div>
      <p className={styles.conceptDisclaimer}>{draft.language === "tr" ? "YAYINLANMAMIŞ TASLAK · Firma bilgileri ve içerik doğrulama bekliyor." : "UNPUBLISHED CONCEPT · Business details and content require verification."}</p>
    </div>
    <div className={styles.estimate}><div><span>Draft scope</span><strong>{new Intl.NumberFormat(company.country === "TR" ? "tr-TR" : "en-MT", { style: "currency", currency: company.country === "TR" ? "TRY" : "EUR", maximumFractionDigits: 0 }).format(draft.proposal.breakdown.finalTotal)}</strong></div><div><p>{draft.proposal.scope.join(" · ")}</p><small>{draft.proposal.disclaimer}</small></div></div>
    <div className={styles.actions}>
      {draft.status === "review" && <><button className={styles.primary} disabled={busy} onClick={() => decide("approved")}><Check size={16} />Approve concept</button><button disabled={busy} onClick={() => decide("rejected")}><X size={16} />Reject</button></>}
      <button disabled={busy || !modelReady} onClick={refine} title={modelReady ? "Creates a new copy revision for review" : "Verified free model access is required in AI controls"}><Bot size={16} />Refine copy with AI</button>
      <button disabled={draft.status !== "approved" || busy} onClick={() => onPricing({ ...draft.proposal.request, clientName: company.name, clientEmail: "" })}><FileText size={16} />Open in Pricing</button>
    </div>
    <p className={styles.caption}>Approval records your internal review. It sends no message, shares no link and creates no live website.</p>
  </article>;
}

export default function AgencyPipeline({ mode, records, refresh, onPricing, navigate }: Props) {
  const [status, setStatus] = useState<RunnerStatus | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [country, setCountry] = useState("MT");
  const [region, setRegion] = useState("valletta");
  const [industry, setIndustry] = useState("hospitality");
  const [limit, setLimit] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AgencyError | null>(null);
  const [notice, setNotice] = useState("");
  const [removedJob, setRemovedJob] = useState<{ id: string; title: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [clock, setClock] = useState(0);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const waitingForRetry = records.jobs.some(job => (job.retryAt || 0) > clock);
  useEffect(() => {
    setClock(Date.now());
    if (!waitingForRetry) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitingForRetry]);
  useEffect(() => {
    if (!busy) return;
    let refreshing = false;
    const timer = setInterval(async () => {
      if (refreshing) return;
      refreshing = true;
      try { await refresh(); } catch {} finally { refreshing = false; }
    }, 5000);
    return () => clearInterval(timer);
  }, [busy, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    api<StudioStatus>("status", undefined, controller.signal).then(value => { setStatus(value.runner); setModelReady(value.provider.configured && value.provider.verified && value.settings.enabled && !value.settings.paused); }).catch(cause => { if (!controller.signal.aborted) setError(cause); });
    return () => controller.abort();
  }, []);
  async function action(task: () => Promise<unknown>, message: string) {
    setBusy(true); setError(null); setNotice("");
    try { await task(); setNotice(message); }
    catch (cause) { setError(cause instanceof AgencyError ? cause : new AgencyError("The task could not finish. Its saved progress is available below.")); }
    finally { await refresh().catch(() => {}); setBusy(false); }
  }
  async function start(body: Record<string, unknown>) {
    const signature = JSON.stringify(body);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    const job = await api<{ id: string }>("enqueue", { ...body, requestId: request.current.id });
    await refresh();
    const result = await api<{ output?: string[] }>("run", { id: job.id });
    if (body.automation && modelReady) {
      for (const id of result.output || []) {
        if (!mounted.current) break;
        const flow = await api<AutomationDetail>("workflow", undefined, undefined, { id });
        await runPreparedSteps(flow, () => {}, () => !mounted.current);
        await refresh();
      }
    }
    request.current = null;
  }
  async function removeJob(id: string, title: string) {
    await action(async () => {
      await api("history", { id, operation: "remove" });
      setRemovedJob({ id, title });
    }, "");
  }
  async function restoreJob() {
    if (!removedJob) return;
    const id = removedJob.id;
    await action(async () => {
      await api("history", { id, operation: "restore" });
      setRemovedJob(null);
    }, "Run restored to history.");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void action(() => start({ kind: "discovery", country, region, industry, limit, automation: true }), modelReady ? "AI research saved. Continue each company in Studio." : "Companies found. Confirm the free AI connection in Studio, then Continue research.");
  }
  const concepts = records.prospects.filter(company => company.draft);
  return <div className={styles.pipeline}>
    <div className={styles.pipelineIntro}><p>{mode === "sales" ? "Choose a market and sector. Find companies, let AI research their business, then Continue the proposal and design workflow in Studio." : "Earlier template concepts are kept below. Use the company workflow above for AI research, proposals and tailored designs."}</p><span className={styles.runnerBadge}>{status ? status.paused ? "Runner paused" : "Continue workflow" : "Checking runner…"}</span></div>
    {mode === "sales" && <ol className={styles.pipelineSteps}>{["Find companies", "AI research", "Your review", "Continue in Studio"].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>}
    {error && <div className={styles.notice} role="alert"><p>{error.message}</p>{error.login && <a href={`${AGENCY_ORIGIN}/start-gateway.html?return=${encodeURIComponent(`https://start.omeryigitler.com/#agency/${mode}`)}`}>Renew Gateway session</a>}</div>}
    {notice && <p className={styles.saved} role="status"><Check size={15} />{notice}{mode === "sales" && <button onClick={() => navigate("studio")}>Open Studio <ArrowRight size={14} /></button>}</p>}
    {removedJob && <p className={styles.saved} role="status"><Check size={15} />Run removed from history.<button disabled={busy} onClick={() => void restoreJob()} aria-label={`Restore ${removedJob.title}`}><RotateCcw size={14} />Undo</button></p>}
    {busy && <p className={styles.callout} role="status"><RefreshCw size={17} />Running on the server. Research may take up to 50 seconds; results and progress are saved.</p>}
    {mode === "sales" && <>
      <form className={styles.form} onSubmit={submit} aria-label="Company discovery">
        <label>Market<Select value={country} onChange={event => { setCountry(event.target.value); setRegion(event.target.value === "MT" ? "valletta" : "istanbul"); }} disabled={busy}><option value="MT">Malta · EUR</option><option value="TR">Türkiye · TRY</option></Select></label>
        <label>Research area<Select value={region} onChange={event => setRegion(event.target.value)} disabled={busy || !status}>{status?.regions.filter(value => value.country === country).map(value => <option key={value.id} value={value.id}>{value.label}</option>)}</Select></label>
        <label>Industry<Select value={industry} onChange={event => setIndustry(event.target.value)} disabled={busy || !status}>{status?.industries.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}</Select></label>
        <label>Companies per run<NumberControl label="companies per run" value={limit} min={1} max={3} onChange={setLimit} /></label>
        <div className={`${styles.full} ${styles.runFooter}`}><button className={styles.primary} type="submit" disabled={busy || !status || status.paused}><Search size={16} />Find & research</button><p>Up to 3 companies. Verified free AI only. Emails wait for your review.</p></div>
      </form>
      <p className={styles.caption}>Small directory sample, not a complete market search. No website listed does not mean no website exists. Five new searches per day; results are cached for 24 hours. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a></p>
    </>}
    {mode === "studio" && <>
      <div className={styles.callout}><ShieldCheck size={20} /><div><strong>Private until you decide</strong><p>Concepts use a local template. Optional AI refines copy only when free-tier access is verified. No outreach, public demo, repository change or deployment is automatic.</p></div></div>
      {concepts.map(company => <ConceptCard key={company.id} company={company} busy={busy} modelReady={modelReady} onPricing={onPricing} decide={decision => void action(() => api("draft-decision", { prospectId: company.id, revision: company.draft!.revision, decision }), "Review decision saved.")} refine={() => void action(() => start({ kind: "copy", prospectId: company.id }), "AI copy revision is ready for review.")} />)}
      {!concepts.length && <div className={styles.empty}><Bot size={30} /><h3>No concepts yet</h3><p>Run discovery in Sales, or prepare an existing company above.</p><button onClick={() => navigate("sales")}>Find companies <ArrowRight size={15} /></button></div>}
      {records.prospects.filter(company => company.research && !company.draft).map(company => <article className={styles.job} key={company.id}><div><span className={styles.badge}>{company.research?.status === "unavailable" ? "Inspection unavailable" : "Research only"}</span><h3>{company.name} · {company.research?.score}/100</h3>{company.research?.signals.map((signal, index) => <p key={index}>{signal}</p>)}<p>No automatic concept was prepared. Review the source or choose this company above.</p><a href={company.source} target="_blank" rel="noopener noreferrer">View source</a></div></article>)}
    </>}
    <details className={styles.runHistory} open={mode === "studio"}><summary>Run history <span>{records.jobs.length}</span></summary><div className={styles.jobs}>{records.jobs.map(job => {
      const retryBlocked = Boolean(job.retryAt && job.retryAt > clock);
      return <article className={styles.job} key={job.id}><div><span className={styles.badge}>{labels[job.status] || job.status}</span><h3>{job.title}</h3><p>{job.kind ? `${job.role} · ${job.attempts || 0}/3 attempts` : "Legacy planning task · no executor assigned"}</p>
        {job.status === "running" && job.phase && <p role="status">{phaseLabels[job.phase] || "Processing the task"}…</p>}
        {job.errorCode && <div role="status"><strong>{failureLabels[job.errorCode] || "Task needs attention"}</strong><p>{job.errorCode === "runner_failed" && !job.phase ? "This earlier task did not save a detailed error. Retry it to use the updated discovery connection." : job.reason || "Saved progress is retained. Retry this task or report its reference if it fails again."}</p>{retryBlocked && <p>Retry available {new Intl.DateTimeFormat("en-MT", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(job.retryAt!)}</p>}<details><summary>Task reference</summary><p>{job.id}{job.phase ? ` · ${job.phase}` : ""}</p></details></div>}
        {job.steps?.length ? <ol className={styles.runLog}>{job.steps.map((step, index) => <li key={index}>{step.label}</li>)}</ol> : null}</div><div className={styles.jobActions}>{job.kind && ["queued", "paused", "failed", "running"].includes(job.status) && <button disabled={busy || retryBlocked || (job.attempts || 0) >= 3 || status?.paused} onClick={() => void action(() => api("run", { id: job.id }), "Task finished. Review the results.")}><Play size={14} />{retryBlocked ? "Waiting to retry" : job.status === "running" ? "Recover interrupted run" : job.status === "queued" ? "Run" : "Retry"}</button>}{["queued", "paused", "failed", "running"].includes(job.status) && <button disabled={busy} onClick={() => void action(() => api("transition", { kind: "job", id: job.id, status: "cancelled" }), "Task cancelled.")}><X size={14} />Cancel</button>}{["failed", "cancelled", "completed", "approved"].includes(job.status) && <button disabled={busy} aria-label={`Remove ${job.title} from history`} title="Remove this run from history. Companies and concepts are kept." onClick={() => void removeJob(job.id, job.title)}><Trash2 size={14} />Remove</button>}</div></article>;
    })}</div>{!records.jobs.length && <p className={styles.caption}>Every run and review decision is recorded here.</p>}</details>
  </div>;
}
