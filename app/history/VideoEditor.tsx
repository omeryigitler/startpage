"use client";

import { ArrowLeft, Check, ChevronRight, Save, Trash2, Youtube, X } from "lucide-react";
import {
  getWorkflowProgress,
  getYouTubeEmbedUrl,
  type HistorySeries,
  type HistorySource,
  type HistoryTask,
  type HistoryWorkflowStep,
  type PromptAsset,
  type TaskStatus,
  type Video,
  type VideoStatus,
  type WorkflowEvent,
} from "../../lib/history-model";

type SaveState = "idle" | "saving" | "saved" | "error";
const TASK_STATUSES: TaskStatus[] = ["To Do", "Doing", "Blocked", "Review", "Done"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="thaField"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}
function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="thaCheck"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span><Check size={13} />{label}</span></label>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return <div className="thaEmpty"><h3>{title}</h3><p>{text}</p></div>;
}
function RecordForm({ title, children, onSubmit, onCancel, submitLabel }: { title: string; children: React.ReactNode; onSubmit: () => void; onCancel: () => void; submitLabel: string }) {
  return <section className="thaCard thaRecordForm"><div className="thaSectionLine"><h2>{title}</h2><button className="thaIconButton" onClick={onCancel} title="Clear form"><X size={16} /></button></div>{children}<div className="thaCardActions"><button className="thaPrimary" onClick={onSubmit}><Save size={15} />{submitLabel}</button></div></section>;
}
function splitLines(value: string) { return value.split("\n").map((x) => x.trim()).filter(Boolean); }
function joinLines(value: string[]) { return value.join("\n"); }

export function VideoEditor({ video, setVideo, sources, prompts, tasks, events, series, workflow, tab, setTab, saveState, onBack, onSave, onDelete, onStatus, sourceDraft, setSourceDraft, assetDraft, setAssetDraft, taskDraft, setTaskDraft, onSubmitSource, onSubmitAsset, onSubmitTask, onDeleteItem }: {
  video: Video;
  setVideo: (video: Video) => void;
  sources: HistorySource[];
  prompts: PromptAsset[];
  tasks: HistoryTask[];
  events: WorkflowEvent[];
  series: HistorySeries[];
  workflow: HistoryWorkflowStep[];
  tab: string;
  setTab: (tab: string) => void;
  saveState: SaveState;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
  onStatus: (status: VideoStatus) => void;
  sourceDraft: Partial<HistorySource>;
  setSourceDraft: (value: Partial<HistorySource>) => void;
  assetDraft: Partial<PromptAsset>;
  setAssetDraft: (value: Partial<PromptAsset>) => void;
  taskDraft: Partial<HistoryTask>;
  setTaskDraft: (value: Partial<HistoryTask>) => void;
  onSubmitSource: () => void;
  onSubmitAsset: () => void;
  onSubmitTask: () => void;
  onDeleteItem: (resource: "sources" | "assets" | "tasks", id: string) => void;
}) {
  const tabs = ["overview", "idea", "production", "packaging", "legal", "analytics", "sources", "assets", "tasks", "history"];
  const statuses = workflow.map((step) => step.name);
  const currentIndex = Math.max(0, statuses.indexOf(video.status));
  const nextStatus = statuses[Math.min(currentIndex + 1, Math.max(0, statuses.length - 1))] || video.status;
  const embed = getYouTubeEmbedUrl(video.youtubeUrl);
  const set = <K extends keyof Video>(key: K, value: Video[K]) => setVideo({ ...video, [key]: value });

  return <div className="thaEditor">
    <header className="thaEditorHeader">
      <div>
        <button className="thaTextButton" onClick={onBack}><ArrowLeft size={15} /> All videos</button>
        <div className="thaEditorTitle"><span className="thaChip">{video.id}</span><h1>{video.finalTitle || video.workingTitle || "Untitled video"}</h1></div>
        <p>{video.coreTopic || "No topic summary entered."}</p>
      </div>
      <div className="thaEditorActions">
        <select className="thaStatusSelect" value={video.status} onChange={(e) => onStatus(e.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
        <button className="thaPrimary" onClick={onSave}><Save size={16} />{saveState === "saving" ? "Saving…" : "Save video"}</button>
        <button className="thaIconButton danger" onClick={onDelete}><Trash2 size={16} /></button>
      </div>
    </header>
    <div className="thaProgress"><i style={{ width: `${getWorkflowProgress(video.status, workflow)}%` }} /></div>
    <nav className="thaEditorTabs">{tabs.map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
    <main className="thaEditorBody">
      {tab === "overview" ? <div className="thaEditorGrid">
        <section className="thaCard"><div className="thaCardTitle">Project basics</div><div className="thaFormGrid">
          <Field label="Working title"><input value={video.workingTitle} onChange={(e) => set("workingTitle", e.target.value)} /></Field>
          <Field label="Final title"><input value={video.finalTitle} onChange={(e) => set("finalTitle", e.target.value)} /></Field>
          <Field label="Core topic"><input value={video.coreTopic} onChange={(e) => set("coreTopic", e.target.value)} /></Field>
          <Field label="Historical period"><input value={video.historicalPeriod} onChange={(e) => set("historicalPeriod", e.target.value)} /></Field>
          <Field label="Geography"><input value={video.geography} onChange={(e) => set("geography", e.target.value)} /></Field>
          <Field label="Series"><select value={video.seriesId} onChange={(e) => set("seriesId", e.target.value)}><option value="">No series</option>{series.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Format"><select value={video.format} onChange={(e) => set("format", e.target.value as Video["format"])}><option>Long Documentary</option><option>Short</option><option>Special</option></select></Field>
          <Field label="Target length"><input value={video.targetLength} onChange={(e) => set("targetLength", e.target.value)} placeholder="e.g. 12–15 min" /></Field>
          <Field label="Priority"><select value={video.priority} onChange={(e) => set("priority", e.target.value as Video["priority"])}><option>P1</option><option>P2</option><option>P3</option><option>P4</option></select></Field>
        </div><Field label="General notes"><textarea value={video.notes} onChange={(e) => set("notes", e.target.value)} /></Field></section>
        <section className="thaCard"><div className="thaCardTitle">Publishing</div>
          <Field label="YouTube video URL" hint="Required before Published status"><input value={video.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} placeholder="https://youtube.com/watch?v=…" /></Field>
          <Field label="Thumbnail URL"><input value={video.thumbnailUrl} onChange={(e) => set("thumbnailUrl", e.target.value)} /></Field>
          <div className="thaFormGrid"><Field label="Target publish"><input type="date" value={video.dates.targetPublish} onChange={(e) => setVideo({ ...video, dates: { ...video.dates, targetPublish: e.target.value } })} /></Field><Field label="Upload date"><input type="date" value={video.dates.uploadDate} onChange={(e) => setVideo({ ...video, dates: { ...video.dates, uploadDate: e.target.value } })} /></Field><Field label="Final publish"><input type="date" value={video.dates.finalPublish} onChange={(e) => setVideo({ ...video, dates: { ...video.dates, finalPublish: e.target.value } })} /></Field></div>
          {embed ? <div className="thaEmbed thaEditorEmbed"><iframe src={embed} title={video.finalTitle || video.workingTitle || video.id} allowFullScreen /></div> : <div className="thaYouTubePlaceholder"><Youtube size={27} /><span>Published YouTube preview appears here after a valid URL is entered.</span></div>}
          <button className="thaSecondary thaFullButton" disabled={nextStatus === video.status} onClick={() => onStatus(nextStatus)}>Move to next workflow stage <ChevronRight size={15} /></button>
        </section>
      </div> : null}

      {tab === "idea" ? <div className="thaEditorGrid">
        <section className="thaCard"><div className="thaCardTitle">Idea & positioning</div><Field label="Hook"><textarea value={video.ideaBank.hook} onChange={(e) => setVideo({ ...video, ideaBank: { ...video.ideaBank, hook: e.target.value } })} /></Field><Field label="Why will people click?"><textarea value={video.ideaBank.whyClick} onChange={(e) => setVideo({ ...video, ideaBank: { ...video.ideaBank, whyClick: e.target.value } })} /></Field><Field label="Mystery / conflict"><textarea value={video.ideaBank.mysteryConflict} onChange={(e) => setVideo({ ...video, ideaBank: { ...video.ideaBank, mysteryConflict: e.target.value } })} /></Field></section>
        <section className="thaCard"><div className="thaCardTitle">Strategy</div><Field label="Source availability"><textarea value={video.ideaBank.sourceAvailability} onChange={(e) => setVideo({ ...video, ideaBank: { ...video.ideaBank, sourceAvailability: e.target.value } })} /></Field><Field label="Next-video connection"><textarea value={video.ideaBank.nextVideoConnection} onChange={(e) => setVideo({ ...video, ideaBank: { ...video.ideaBank, nextVideoConnection: e.target.value } })} /></Field><Field label="Content strategy — one per line"><textarea value={joinLines(video.contentStrategy)} onChange={(e) => set("contentStrategy", splitLines(e.target.value))} /></Field><Field label="Primary audience — one per line"><textarea value={joinLines(video.primaryAudience)} onChange={(e) => set("primaryAudience", splitLines(e.target.value))} /></Field></section>
      </div> : null}

      {tab === "production" ? <div className="thaEditorGrid">
        <section className="thaCard"><div className="thaCardTitle">Research & script</div><Field label="Research notes"><textarea className="tall" value={video.production.researchNotes} onChange={(e) => setVideo({ ...video, production: { ...video.production, researchNotes: e.target.value } })} /></Field><Field label="Narrative outline"><textarea className="tall" value={video.production.outline} onChange={(e) => setVideo({ ...video, production: { ...video.production, outline: e.target.value } })} /></Field><Field label="Script notes"><textarea className="tall" value={video.production.scriptNotes} onChange={(e) => setVideo({ ...video, production: { ...video.production, scriptNotes: e.target.value } })} /></Field></section>
        <section className="thaCard"><div className="thaCardTitle">Audio, visuals & edit</div><Field label="Voiceover notes"><textarea value={video.production.voiceoverNotes} onChange={(e) => setVideo({ ...video, production: { ...video.production, voiceoverNotes: e.target.value } })} /></Field><Field label="Visual / map notes"><textarea className="tall" value={video.production.visualNotes} onChange={(e) => setVideo({ ...video, production: { ...video.production, visualNotes: e.target.value } })} /></Field><Field label="Editing notes"><textarea className="tall" value={video.production.editNotes} onChange={(e) => setVideo({ ...video, production: { ...video.production, editNotes: e.target.value } })} /></Field><div className="thaCheckGrid">{Object.entries(video.checklist).map(([key, checked]) => <CheckBox key={key} label={key} checked={checked} onChange={(value) => setVideo({ ...video, checklist: { ...video.checklist, [key]: value } })} />)}</div></section>
      </div> : null}

      {tab === "packaging" ? <div className="thaEditorGrid">
        <section className="thaCard"><div className="thaCardTitle">Titles & thumbnail</div><Field label="Alternative titles — one per line"><textarea className="tall" value={joinLines(video.packaging.altTitles)} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, altTitles: splitLines(e.target.value) } })} /></Field><Field label="Thumbnail concepts — one per line"><textarea className="tall" value={joinLines(video.packaging.thumbConcepts)} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, thumbConcepts: splitLines(e.target.value) } })} /></Field><Field label="Thumbnail text"><input value={video.packaging.thumbText} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, thumbText: e.target.value } })} /></Field></section>
        <section className="thaCard"><div className="thaCardTitle">YouTube package</div><div className="thaFormGrid"><Field label="Primary keyword"><input value={video.packaging.primaryKeyword} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, primaryKeyword: e.target.value } })} /></Field><Field label="Secondary keywords"><input value={video.packaging.secondaryKeywords} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, secondaryKeywords: e.target.value } })} /></Field><Field label="Related playlist"><input value={video.packaging.relatedPlaylist} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, relatedPlaylist: e.target.value } })} /></Field><Field label="End screen target"><input value={video.packaging.endScreenTarget} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, endScreenTarget: e.target.value } })} /></Field></div><Field label="Description"><textarea className="tall" value={video.packaging.description} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, description: e.target.value } })} /></Field><Field label="Chapters"><textarea value={video.packaging.chapters} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, chapters: e.target.value } })} /></Field><Field label="Tags"><textarea value={video.packaging.tags} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, tags: e.target.value } })} /></Field><Field label="Pinned comment"><textarea value={video.packaging.pinnedComment} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, pinnedComment: e.target.value } })} /></Field><Field label="CTA"><textarea value={video.packaging.cta} onChange={(e) => setVideo({ ...video, packaging: { ...video.packaging, cta: e.target.value } })} /></Field></section>
      </div> : null}

      {tab === "legal" ? <div className="thaEditorGrid">
        <section className="thaCard"><div className="thaCardTitle">Rights & disclosure</div><div className="thaFormGrid"><Field label="Copyright"><select value={video.legal.copyrightStatus} onChange={(e) => setVideo({ ...video, legal: { ...video.legal, copyrightStatus: e.target.value as Video["legal"]["copyrightStatus"] } })}><option>Not Reviewed</option><option>Review Required</option><option>Cleared</option><option>Problem Found</option></select></Field><Field label="Asset rights"><select value={video.legal.assetRights} onChange={(e) => setVideo({ ...video, legal: { ...video.legal, assetRights: e.target.value as Video["legal"]["assetRights"] } })}><option>Unknown</option><option>Partial</option><option>Cleared</option><option>Problem</option></select></Field><Field label="AI disclosure"><select value={video.legal.aiDisclosure} onChange={(e) => setVideo({ ...video, legal: { ...video.legal, aiDisclosure: e.target.value as Video["legal"]["aiDisclosure"] } })}><option>Not Required</option><option>Required</option><option>Added</option><option>Review</option></select></Field><Field label="Fact risk"><select value={video.legal.factRisk} onChange={(e) => setVideo({ ...video, legal: { ...video.legal, factRisk: e.target.value as Video["legal"]["factRisk"] } })}><option>Low</option><option>Medium</option><option>High</option></select></Field></div><div className="thaCheckGrid"><CheckBox label="Sources verified" checked={video.legal.sourcesVerified} onChange={(value) => setVideo({ ...video, legal: { ...video.legal, sourcesVerified: value } })} /><CheckBox label="Final legal review complete" checked={video.legal.finalReview} onChange={(value) => setVideo({ ...video, legal: { ...video.legal, finalReview: value } })} /></div></section>
        <section className="thaCard"><div className="thaCardTitle">Source rights summary</div>{sources.length ? sources.map((source) => <div className="thaCompactRow" key={source.id}><span><strong>{source.name}</strong><small>{source.license || "No license entered"}</small></span><div>{source.publicDomain ? <span className="thaChip isSuccess">Public domain</span> : <span className="thaChip">Rights review</span>}</div></div>) : <Empty title="No sources" text="Add sources in the Sources tab before final review." />}</section>
      </div> : null}

      {tab === "analytics" ? <div className="thaEditorGrid"><section className="thaCard"><div className="thaCardTitle">Performance data</div><div className="thaFormGrid"><Field label="Views — 30d"><input value={video.analytics.views30d} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, views30d: e.target.value } })} /></Field><Field label="CTR"><input value={video.analytics.ctr} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, ctr: e.target.value } })} /></Field><Field label="Average view duration"><input value={video.analytics.avd} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, avd: e.target.value } })} /></Field><Field label="Watch hours"><input value={video.analytics.watchHours} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, watchHours: e.target.value } })} /></Field><Field label="Subscribers"><input value={video.analytics.subscribers} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, subscribers: e.target.value } })} /></Field><Field label="Impressions"><input value={video.analytics.impressions} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, impressions: e.target.value } })} /></Field></div></section><section className="thaCard"><div className="thaCardTitle">Post-publish review</div><Field label="What worked well"><textarea value={video.analytics.workedWell} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, workedWell: e.target.value } })} /></Field><Field label="What to improve"><textarea value={video.analytics.improve} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, improve: e.target.value } })} /></Field><Field label="Takeaways for next video"><textarea value={video.analytics.takeaways} onChange={(e) => setVideo({ ...video, analytics: { ...video.analytics, takeaways: e.target.value } })} /></Field></section></div> : null}

      {tab === "sources" ? <div className="thaEditorGrid"><RecordForm title={sourceDraft.id ? "Edit source" : "Add source"} onSubmit={onSubmitSource} onCancel={() => setSourceDraft({ videoId: video.id })} submitLabel={sourceDraft.id ? "Update source" : "Add source"}><Field label="Source name"><input value={sourceDraft.name || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, name: e.target.value })} /></Field><div className="thaFormGrid"><Field label="Type"><input value={sourceDraft.type || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, type: e.target.value })} /></Field><Field label="URL"><input value={sourceDraft.url || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, url: e.target.value })} /></Field><Field label="Author"><input value={sourceDraft.author || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, author: e.target.value })} /></Field><Field label="Publication"><input value={sourceDraft.publication || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, publication: e.target.value })} /></Field><Field label="Reliability"><input value={sourceDraft.reliability || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, reliability: e.target.value })} /></Field><Field label="License"><input value={sourceDraft.license || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, license: e.target.value })} /></Field></div><Field label="Key facts"><textarea value={sourceDraft.facts || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, facts: e.target.value })} /></Field><Field label="Contradictions / caveats"><textarea value={sourceDraft.contradictions || ""} onChange={(e) => setSourceDraft({ ...sourceDraft, videoId: video.id, contradictions: e.target.value })} /></Field><div className="thaCheckGrid"><CheckBox label="Citation needed" checked={Boolean(sourceDraft.citationNeeded)} onChange={(value) => setSourceDraft({ ...sourceDraft, videoId: video.id, citationNeeded: value })} /><CheckBox label="Used in script" checked={Boolean(sourceDraft.usedInScript)} onChange={(value) => setSourceDraft({ ...sourceDraft, videoId: video.id, usedInScript: value })} /><CheckBox label="Public domain" checked={Boolean(sourceDraft.publicDomain)} onChange={(value) => setSourceDraft({ ...sourceDraft, videoId: video.id, publicDomain: value })} /></div></RecordForm><section className="thaCard"><div className="thaCardTitle">Linked research</div>{sources.length ? sources.map((source) => <div className="thaCompactRow" key={source.id}><span><strong>{source.name}</strong><small>{source.author || source.publication || source.type || "Source"}</small></span><div><button onClick={() => setSourceDraft(source)}>Edit</button><button className="danger" onClick={() => onDeleteItem("sources", source.id)}><Trash2 size={13} /></button></div></div>) : <Empty title="No sources" text="Add the first source using the form." />}</section></div> : null}

      {tab === "assets" ? <div className="thaEditorGrid"><RecordForm title={assetDraft.id ? "Edit asset" : "Add asset / prompt"} onSubmit={onSubmitAsset} onCancel={() => setAssetDraft({ videoId: video.id })} submitLabel={assetDraft.id ? "Update asset" : "Add asset"}><Field label="Name"><input value={assetDraft.name || ""} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, name: e.target.value })} /></Field><div className="thaFormGrid"><Field label="Category"><input value={assetDraft.category || ""} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, category: e.target.value })} /></Field><Field label="AI tool"><input value={assetDraft.aiTool || ""} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, aiTool: e.target.value })} /></Field><Field label="Aspect ratio"><input value={assetDraft.aspectRatio || ""} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, aspectRatio: e.target.value })} /></Field><Field label="Output link"><input value={assetDraft.outputLink || ""} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, outputLink: e.target.value })} /></Field></div><Field label="Full prompt"><textarea className="tall" value={assetDraft.fullPrompt || ""} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, fullPrompt: e.target.value })} /></Field><Field label="Negative prompt"><textarea value={assetDraft.negativePrompt || ""} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, negativePrompt: e.target.value })} /></Field><div className="thaCheckGrid"><CheckBox label="Approved" checked={Boolean(assetDraft.approved)} onChange={(value) => setAssetDraft({ ...assetDraft, videoId: video.id, approved: value })} /><CheckBox label="Reusable" checked={Boolean(assetDraft.reusable)} onChange={(value) => setAssetDraft({ ...assetDraft, videoId: video.id, reusable: value })} /><Field label="Quality / 5"><input type="number" min="0" max="5" value={assetDraft.qualityRating ?? 0} onChange={(e) => setAssetDraft({ ...assetDraft, videoId: video.id, qualityRating: Number(e.target.value) })} /></Field></div></RecordForm><section className="thaCard"><div className="thaCardTitle">Production assets</div>{prompts.length ? prompts.map((asset) => <div className="thaCompactRow" key={asset.id}><span><strong>{asset.name}</strong><small>{asset.category || asset.aiTool || "Asset"} · {asset.qualityRating}/5</small></span><div><button onClick={() => setAssetDraft(asset)}>Edit</button><button className="danger" onClick={() => onDeleteItem("assets", asset.id)}><Trash2 size={13} /></button></div></div>) : <Empty title="No assets" text="Add prompts and output records with the form." />}</section></div> : null}

      {tab === "tasks" ? <div className="thaEditorGrid"><RecordForm title={taskDraft.id ? "Edit task" : "Add task"} onSubmit={onSubmitTask} onCancel={() => setTaskDraft({ videoId: video.id, status: "To Do", priority: "P2" })} submitLabel={taskDraft.id ? "Update task" : "Add task"}><Field label="Task title"><input value={taskDraft.title || ""} onChange={(e) => setTaskDraft({ ...taskDraft, videoId: video.id, title: e.target.value })} /></Field><div className="thaFormGrid"><Field label="Department"><input value={taskDraft.department || ""} onChange={(e) => setTaskDraft({ ...taskDraft, videoId: video.id, department: e.target.value })} /></Field><Field label="Status"><select value={taskDraft.status || "To Do"} onChange={(e) => setTaskDraft({ ...taskDraft, videoId: video.id, status: e.target.value as TaskStatus })}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field><Field label="Priority"><select value={taskDraft.priority || "P2"} onChange={(e) => setTaskDraft({ ...taskDraft, videoId: video.id, priority: e.target.value as HistoryTask["priority"] })}><option>P1</option><option>P2</option><option>P3</option><option>P4</option></select></Field><Field label="Due date"><input type="date" value={taskDraft.dueDate || ""} onChange={(e) => setTaskDraft({ ...taskDraft, videoId: video.id, dueDate: e.target.value })} /></Field></div><Field label="Notes"><textarea value={taskDraft.notes || ""} onChange={(e) => setTaskDraft({ ...taskDraft, videoId: video.id, notes: e.target.value })} /></Field></RecordForm><section className="thaCard"><div className="thaCardTitle">Task list</div>{tasks.length ? tasks.map((task) => <div className="thaCompactRow" key={task.id}><span><strong>{task.title}</strong><small>{task.department || "General"} · {task.status}{task.dueDate ? ` · ${task.dueDate}` : ""}</small></span><div><span className={`thaChip ${task.status === "Blocked" ? "isDanger" : task.status === "Done" ? "isSuccess" : ""}`}>{task.priority}</span><button onClick={() => setTaskDraft(task)}>Edit</button><button className="danger" onClick={() => onDeleteItem("tasks", task.id)}><Trash2 size={13} /></button></div></div>) : <Empty title="No tasks" text="Add production tasks with the form." />}</section></div> : null}

      {tab === "history" ? <section className="thaCard"><div className="thaCardTitle">Workflow history</div>{events.length ? <div className="thaHistoryList">{events.map((event) => <div key={event.id}><i /><span><strong>{event.fromStatus || "Created"}</strong><ChevronRight size={13} /><b>{event.toStatus}</b><small>{new Date(event.createdAt).toLocaleString()}</small></span></div>)}</div> : <Empty title="No workflow events" text="Status changes will be recorded here." />}</section> : null}
    </main>
  </div>;
}
