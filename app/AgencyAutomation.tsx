"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Check, Download, ExternalLink, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { agencyApi as api, AgencyError } from "./agency-api";
import { Select } from "./AgencyControls";
import { AGENCY_ORIGIN, type AgencySection, type MailStatus, type StudioRecords, type StudioStatus } from "./agency-model";
import styles from "./agency.module.css";

type File = { id: string; name: string; type: string; size: number };
type Research = { summary: string; facts: { text: string; source: number }[]; sources: { title: string; url: string }[]; opportunities: string[]; unknowns: string[]; contacts: { email: string; source: string }[]; fit: string; direction: string; searchEntryPoint?: string };
type Workflow = { id: string; version: number; state: string; company: { name: string; country: string; location: string }; research?: Research; contact?: { email: string; source: string; basis: string }; proposal?: { summary: string; pages: string[]; deliverables: string[]; exclusions: string[]; rationale: string; breakdown: { finalTotal: number; totalMonthly: number }; quoteNumber: string }; concept?: { rationale: string }; conceptHtml?: string; proposalFiles?: File[]; conceptFiles?: File[]; proposalDelivery?: { acceptedAt: number }; conceptDelivery?: { acceptedAt: number }; error?: { code: string; message: string } };
type Preview = { from: string; to: string; replyTo: string; subject: string; text: string; provider: string; connected: boolean; reviewDigest: string; attachments: File[] };
export type AutomationDetail = { workflow: Workflow; preview?: Preview; delivery?: { status: string; firstAttemptAt: number; provider: string }; mail: MailStatus };
type Detail = AutomationDetail;
const pending = ["research_pending", "proposal_pending", "proposal_files", "concept_pending", "concept_files"];
const labels: Record<string,string> = { research_pending: "Research ready to run", research_review: "Review research", proposal_pending: "Preparing proposal", proposal_files: "Preparing proposal PDF", proposal_review: "Review proposal email", concept_pending: "Designing concept", concept_files: "Preparing concept files", concept_review: "Review concept email", handoff: "Ready for your build", skipped: "Set aside" };

export async function runPreparedSteps(initial: Detail, update: (value: Detail) => void, stopped: () => boolean = () => false) {
  let value = initial;
  // Each bounded request checkpoints on the server. Reviews always stop this loop.
  for (let i = 0; i < 3 && pending.includes(value.workflow.state) && !stopped(); i++) {
    value = await api<Detail>("workflow-action", { id: value.workflow.id, version: value.workflow.version, operation: "advance", requestId: crypto.randomUUID() });
    update(value);
  }
  return value;
}

function FreeConnection({ status, reload }: { status: StudioStatus; reload: () => Promise<void> }) {
  const [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <div className={styles.connectionCard}>
    <div><Bot size={19}/><strong>{status.provider.verified ? "Free AI connected" : "Confirm the free AI project"}</strong></div>
    {status.provider.verified ? <p>Verification expires {status.provider.expiresAt ? new Date(status.provider.expiresAt).toLocaleDateString("en-GB") : "when the server confirmation expires"}.</p> : <>
      <p>The server credential is {status.provider.configured ? "present" : "missing"}. Check its project in <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer">Google AI Studio <ExternalLink size={12}/></a>, then confirm billing is disabled.</p>
      <label className={styles.confirm}><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}/>I checked the server key’s project: free plan, billing disabled.</label>
      <button disabled={!checked || busy || !status.provider.configured} onClick={async () => { setBusy(true); setError(""); try { await api("ai-verify", { billingDisabled: true, model: "gemini-2.5-flash-lite" }); await reload(); } catch (e) { setError(e instanceof Error ? e.message : "Confirmation could not be saved."); } finally { setBusy(false); } }}>Confirm for 7 days <Check size={14}/></button>
      <p className={styles.caption}>Gemini 2.5 Flash-Lite · free tier only · daily limits apply.</p>
    </>}{error && <p role="alert">{error}</p>}
  </div>;
}
export function AutomationConnections({ status, reload }: { status: StudioStatus; reload: () => Promise<void> }) {
  return <div className={styles.connections}>
    <FreeConnection status={status} reload={reload}/>
    <div className={styles.connectionCard}><div><Mail size={19}/><strong>{status.mail?.smtpConfigured ? "Work mailbox connected" : "Work mailbox required for first contact"}</strong></div><p>{status.mail?.smtpConfigured ? `From ${status.mail.from}` : "Add the work mailbox connection in the server settings. Prepared research, proposals and concepts stay saved until it is connected."}</p><p className={styles.caption}>{status.mail?.permissionedConfigured ? "Resend is connected for requested or permissioned email. It cannot send cold outreach." : "Permissioned email is not connected."}</p><details><summary>Server connection fields</summary><p className={styles.caption}>STUDIO_SMTP_HOST · STUDIO_SMTP_PORT (465 or 587) · STUDIO_SMTP_USER · STUDIO_SMTP_PASS · STUDIO_MAIL_FROM · STUDIO_MAIL_REPLY_TO</p><p className={styles.caption}>Use your mailbox provider’s SMTP settings and app password in Vercel environment settings. Keep credentials on the server.</p></details></div>
  </div>;
}

export default function AgencyAutomation({ records, refresh, navigate }: { records: StudioRecords; refresh: () => Promise<void>; navigate: (section: AgencySection) => void }) {
  const [id, setId] = useState(records.workflows?.[0]?.id || records.prospects[0]?.id || "");
  const [detail, setDetail] = useState<Detail | null>(null), [status, setStatus] = useState<StudioStatus | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState<AgencyError | null>(null);
  const [email, setEmail] = useState(""), [source, setSource] = useState(""), [basis, setBasis] = useState("first_contact"), [verified, setVerified] = useState(false), [sentChecked, setSentChecked] = useState(false);
  const mounted = useRef(true), selected = useRef(id);
  selected.current = id;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function reloadStatus() { setStatus(await api<StudioStatus>("status")); }
  useEffect(() => { const controller = new AbortController(); api<StudioStatus>("status", undefined, controller.signal).then(setStatus).catch(e => { if (!controller.signal.aborted) setError(e); }); return () => controller.abort(); }, []);
  useEffect(() => {
    setDetail(null); setError(null); setVerified(false); setSentChecked(false); setLoading(false);
    if (!id || !records.workflows?.some(w => w.id === id)) return;
    const controller = new AbortController(); setLoading(true);
    api<Detail>("workflow", undefined, controller.signal, { id }).then(value => { if (!controller.signal.aborted) setDetail(value); }).catch(e => { if (!controller.signal.aborted) setError(e); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  // A selection fetch must not reset a newly returned checkpoint after refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    const c = detail?.workflow.contact || detail?.workflow.research?.contacts[0];
    setEmail(c?.email || ""); setSource(c?.source || ""); setVerified(false); setSentChecked(false);
  }, [detail?.workflow.id, detail?.workflow.state]);
  function update(value: Detail) { if (mounted.current && selected.current === value.workflow.id) setDetail(value); }
  async function perform(operation: string, extra: Record<string, unknown> = {}) {
    if (!id || busy) return;
    setBusy(true); setError(null);
    const target = id;
    try {
      const value = await api<Detail>("workflow-action", { id: target, ...(detail ? { version: detail.workflow.version } : {}), operation, requestId: crypto.randomUUID(), ...extra });
      update(value);
      if (operation !== "skip") await runPreparedSteps(value, update, () => !mounted.current || selected.current !== target);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof AgencyError ? cause : new AgencyError("The step stopped. Refresh to review saved progress."));
      try { update(await api<Detail>("workflow", undefined, undefined, { id: target })); } catch {}
    } finally { await refresh().catch(() => {}); if (mounted.current) setBusy(false); }
  }
  async function download(file: File) {
    try {
      const params = new URLSearchParams({ action: "studio-workflow-file", id, file: file.id });
      const response = await fetch(`${AGENCY_ORIGIN}/api/agent?${params}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Renew your session and try the download again.");
      const url = URL.createObjectURL(await response.blob()), a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(new AgencyError(e instanceof Error ? e.message : "Download failed.")); }
  }
  const flow = detail?.workflow, research = flow?.research, preview = detail?.preview;
  const ready = status?.provider.verified && status.settings.enabled && !status.settings.paused;
  const canPrepare = Boolean(status?.settings.enabled && !status.settings.paused && (flow?.state.endsWith("_files") || status.provider.verified));
  const unknown = detail?.delivery?.status === "unknown" || detail?.delivery?.status === "sending" && detail.delivery.provider === "smtp" || Boolean(detail?.delivery && Date.now() - detail.delivery.firstAttemptAt > 23 * 3600000 && detail.delivery.status !== "accepted");
  const step = !flow || flow.state.startsWith("research") ? 0 : flow.state.startsWith("proposal") ? 1 : flow.state.startsWith("concept") ? 2 : 3;
  return <div className={styles.automation}>
    <p className={styles.automationIntro}>AI does the preparation. Review each result, then use Continue to approve the next action.</p>
    <ol className={styles.pipelineSteps}>{["Research", "Proposal & email", "Concept & email", "Your final build"].map((v, i) => <li key={v} className={i === step ? styles.currentStep : ""}><span>{i < step ? <Check size={14}/> : i + 1}</span>{v}</li>)}</ol>
    {status && !status.provider.verified && <AutomationConnections status={status} reload={reloadStatus}/>}
    {status && (!status.settings.enabled || status.settings.paused) && <div className={styles.notice}><p>The runner is paused. Saved work is available for review.</p><button onClick={() => navigate("control")}>Open AI controls</button></div>}
    <div className={styles.workflowPicker}><label>Company<Select value={id} onChange={e => setId(e.target.value)} disabled={busy}>{records.prospects.map(p => <option key={p.id} value={p.id}>{`${p.name} · ${labels[records.workflows?.find(w => w.id === p.id)?.state || ""] || "Not started"}`}</option>)}</Select></label><button disabled={busy} onClick={() => navigate("sales")}>Find companies <ArrowRight size={14}/></button></div>
    {(error || flow?.error) && <div className={styles.notice} role="alert"><p>{error?.message || flow?.error?.message}</p>{error?.login && <a href={`${AGENCY_ORIGIN}/start-gateway.html?return=${encodeURIComponent("https://start.omeryigitler.com/#agency/studio")}`}>Renew Gateway session</a>}{flow?.error?.code === "billing_unverified" && <button onClick={() => navigate("control")}>Open AI controls</button>}</div>}
    {busy && <p className={styles.callout} role="status"><RefreshCw size={17}/> {flow ? labels[flow.state] : "Starting workflow"}… Progress is saved after every step.</p>}
    {loading && <p role="status">Loading saved workflow…</p>}
    {!flow && !loading && id && <div className={styles.empty}><Bot size={28}/><h3>Start real research for this company</h3><p>AI checks web sources before recommending a scope, price or design.</p><button className={styles.primary} disabled={busy || !ready} onClick={() => void perform("start")}>Continue · research company <ArrowRight size={15}/></button></div>}
    {!records.prospects.length && <div className={styles.empty}><Bot size={28}/><h3>Choose a market to get started</h3><button onClick={() => navigate("sales")}>Find companies <ArrowRight size={15}/></button></div>}
    {flow && <article className={styles.automationCard}>
      <div className={styles.artifactBar}><div><span className={styles.badge}>{labels[flow.state]}</span><h3>{flow.company.name}</h3><p>{flow.company.location} · {flow.company.country}</p></div><span className={styles.privateTag}><ShieldCheck size={13}/>Saved workflow</span></div>
      {research && <details className={styles.evidence} open={flow.state === "research_review"}><summary>Research & evidence</summary><p>{research.summary}</p><ul>{research.facts.map((f,i) => <li key={i}>{f.text} {research.sources[f.source] && <a href={research.sources[f.source].url} target="_blank" rel="noopener noreferrer">[{f.source + 1}]</a>}</li>)}</ul><strong>Recommended improvements</strong><ul>{research.opportunities.map(v => <li key={v}>{v}</li>)}</ul><p>{research.direction}</p><strong>Still to confirm</strong><ul>{research.unknowns.map(v => <li key={v}>{v}</li>)}</ul><div className={styles.links}>{research.sources.map((s,i) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">{i + 1}. {s.title || "Research source"} <ExternalLink size={11}/></a>)}</div>{research.searchEntryPoint && <iframe className={styles.searchAttribution} title="Google Search suggestions" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https://www.gstatic.com; base-uri 'none'; form-action 'none'">${research.searchEntryPoint}`}/>}</details>}
      {flow.state === "research_review" && <form className={styles.form} onSubmit={e => { e.preventDefault(); void perform("continue", { companyReviewed: verified, contact: { email, source, basis, verified } }); }}>
        <label>Recipient email<input type="email" required value={email} maxLength={160} onChange={e => setEmail(e.target.value)} placeholder="Verified business email"/></label>
        <label>Email source<input type="url" required value={source} onChange={e => setSource(e.target.value)} placeholder="https://…"/></label>
        <label className={styles.full}>Contact basis<Select value={basis} onChange={e => setBasis(e.target.value)}><option value="first_contact">First business contact · work mailbox</option><option value="requested">The business requested a proposal</option><option value="permitted">The business gave permission to receive this email</option></Select></label>
        <label className={`${styles.full} ${styles.confirm}`}><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}/>I reviewed this business, the recipient address and the contact basis.</label>
        <div className={styles.full}><button className={styles.primary} type="submit" disabled={busy || !verified || !ready}>Continue · prepare proposal <ArrowRight size={15}/></button></div>
      </form>}
      {flow.proposal && <details className={styles.evidence} open={flow.state === "proposal_review"}><summary>Proposal · {flow.proposal.quoteNumber}</summary><h3>{flow.proposal.summary}</h3><p>{flow.proposal.rationale}</p><strong className={styles.price}>{new Intl.NumberFormat("en-GB", { style: "currency", currency: flow.company.country === "MT" ? "EUR" : "TRY" }).format(flow.proposal.breakdown.finalTotal)}</strong><p>Pages: {flow.proposal.pages.join(" · ")}</p><ul>{flow.proposal.deliverables.map(v => <li key={v}>{v}</li>)}</ul><p>Excluded: {flow.proposal.exclusions.join(" · ")}</p></details>}
      {flow.conceptHtml && <><p className={styles.caption}>{flow.concept?.rationale}</p><iframe title={`${flow.company.name} private website concept`} className={styles.designPreview} sandbox="" srcDoc={flow.conceptHtml}/></>}
      {preview && <section className={styles.emailPreview} aria-label="Outgoing email preview"><div><Mail size={18}/><strong>{flow.state === "proposal_review" ? "Proposal email" : "Concept email"}</strong><span>{preview.connected ? "Connection ready" : "Connection required"}</span></div><dl><dt>From</dt><dd>{preview.from}</dd><dt>To</dt><dd>{preview.to}</dd><dt>Reply to</dt><dd>{preview.replyTo}</dd><dt>Subject</dt><dd>{preview.subject}</dd></dl><pre>{preview.text}</pre><div className={styles.actions}>{preview.attachments.map(f => <button key={f.id} disabled={busy} onClick={() => void download(f)}><Download size={14}/>{f.name}</button>)}</div><p className={styles.caption}>Continue sends this exact email and these attachments to this recipient.</p>
        {!preview.connected && <div className={styles.notice}><p>{preview.provider === "smtp" ? "Connect your work mailbox in server settings before sending this first-contact message." : "Connect permissioned email before sending."}</p><button onClick={() => navigate("control")}>Open connections</button></div>}
        {unknown ? <div className={styles.notice}><p>Delivery result is uncertain. Check this exact recipient and subject in your mailbox’s Sent folder before continuing.</p><label className={styles.confirm}><input type="checkbox" checked={sentChecked} onChange={e => setSentChecked(e.target.checked)}/>I found this exact email in Sent mail.</label><button disabled={busy || !sentChecked} onClick={() => void perform("confirm_sent", { checkedSentFolder: true, reviewDigest: preview.reviewDigest })}>Continue · record existing send</button></div> : <button className={styles.primary} disabled={busy || !preview.connected} onClick={() => void perform("continue", { reviewDigest: preview.reviewDigest })}>Continue · send {flow.state === "proposal_review" ? "proposal" : "concept"} <ArrowRight size={15}/></button>}
      </section>}
      {flow.state === "handoff" && <div className={styles.handoff}><Check size={24}/><div><h3>Preparation complete. Your build starts here.</h3><p>The email provider accepted the proposal and concept messages. Client acceptance and the final website are still pending.</p><p>Confirm the client’s scope and content, build the final website, connect forms and domain, test, then launch.</p><div className={styles.actions}><button onClick={() => navigate("projects")}>Open project <ArrowRight size={14}/></button>{flow.conceptFiles?.map(f => <button key={f.id} onClick={() => void download(f)}><Download size={14}/>{f.name}</button>)}</div></div></div>}
      {pending.includes(flow.state) && !busy && <button className={styles.primary} disabled={!canPrepare} onClick={() => void perform("advance")}>Continue · {flow.error ? "retry saved step" : "prepare next step"} <ArrowRight size={15}/></button>}
      {flow.state === "skipped" && <button className={styles.primary} disabled={busy} onClick={() => void perform("resume")}>Continue · resume company <ArrowRight size={15}/></button>}
      {!["handoff","skipped"].includes(flow.state) && <button className={styles.defer} disabled={busy} onClick={() => void perform("skip")}>Set this company aside</button>}
      <p className={styles.caption}>Closing this view pauses the remaining preparation. Reopen the company and Continue to resume from the saved step.</p>
    </article>}
  </div>;
}
