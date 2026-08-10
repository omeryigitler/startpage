"use client";

import {
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  Database,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Search,
  Trash2,
  Youtube,
  X,
} from "lucide-react";
import {
  HISTORY_PROGRESS,
  HISTORY_STATUSES,
  getYouTubeEmbedUrl,
  type HistoryBootstrap,
  type HistorySeries,
  type HistorySettings,
  type HistorySource,
  type HistoryTask,
  type PromptAsset,
  type Video,
  type VideoStatus,
} from "../../lib/history-model";
import { BANNER_IMAGE, LOGO_IMAGE } from "./assets";

type PageId = "videos" | "production" | "analytics";
type SaveState = "idle" | "saving" | "saved" | "error";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="thaField"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="thaEmpty"><div className="thaEmptyIcon"><Archive size={24} /></div><h3>{title}</h3><p>{text}</p>{action ? <div className="thaEmptyAction">{action}</div> : null}</div>;
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <header className="thaSectionHeader"><div><p className="thaEyebrow">THE HISTORY ARCHIVED</p><h1>{title}</h1>{subtitle ? <p className="thaSubtitle">{subtitle}</p> : null}</div>{action ? <div className="thaHeaderAction">{action}</div> : null}</header>;
}

function StatusChip({ status }: { status: string }) {
  return <span className={`thaChip ${status === "Published" ? "isSuccess" : status === "Blocked" ? "isDanger" : ""}`}>{status}</span>;
}

function legalCleared(video: Video) {
  return video.legal.copyrightStatus === "Cleared" && video.legal.assetRights === "Cleared" && video.legal.sourcesVerified && video.legal.finalReview;
}

export function Dashboard({ data, onOpen, onNavigate }: { data: HistoryBootstrap; onOpen: (video: Video) => void; onNavigate: (page: PageId) => void }) {
  const active = data.videos.filter((video) => !["Published", "Performance Review", "Archived"].includes(video.status));
  const published = data.videos.filter((video) => ["Published", "Performance Review", "Archived"].includes(video.status) && getYouTubeEmbedUrl(video.youtubeUrl));
  const openTasks = data.tasks.filter((task) => task.status !== "Done");
  const blocked = openTasks.filter((task) => task.status === "Blocked").length;
  const legalPending = active.filter((video) => !legalCleared(video)).length;
  const priorityRank = { P1: 1, P2: 2, P3: 3, P4: 4 } as const;
  const current = [...active].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || (a.dates.targetPublish || "9999").localeCompare(b.dates.targetPublish || "9999"))[0];
  const nextTasks = [...openTasks].sort((a, b) => (a.status === "Blocked" ? -1 : 0) - (b.status === "Blocked" ? -1 : 0) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).slice(0, 6);

  return (
    <div className="thaPage">
      <SectionTitle title="Content Command Center" subtitle="Live production, publishing and archive status. No demo records are inserted." />
      <img className="thaBanner" src={BANNER_IMAGE} alt="The History Archived — Empires. Mysteries. Forgotten Truths." />

      <div className="thaMetrics">
        <Metric label="Active videos" value={active.length} />
        <Metric label="Open tasks" value={openTasks.length} />
        <Metric label="Blocked" value={blocked} danger={blocked > 0} />
        <Metric label="Legal review" value={legalPending} />
        <Metric label="Published" value={published.length} />
      </div>

      {!data.videos.length ? (
        <Empty title="Workspace is ready" text="There are no video records yet. Create the first project in Videos or Ideas; all content will be entered by you." action={<button className="thaPrimary" onClick={() => onNavigate("videos")}><Plus size={16} /> Create first video</button>} />
      ) : null}

      {current ? (
        <section className="thaSection">
          <div className="thaSectionLine"><h2>Current priority</h2><button className="thaTextButton" onClick={() => onNavigate("production")}>Open production board <ChevronRight size={14} /></button></div>
          <div className="thaTwoCol">
            <article className="thaCard thaPriorityCard">
              <div className="thaChipRow"><span className="thaChip">{current.id}</span><StatusChip status={current.status} /><span className="thaChip">{current.priority}</span></div>
              <h3>{current.workingTitle || "Untitled video"}</h3>
              <p>{current.coreTopic || "No topic summary entered yet."}</p>
              <div className="thaProgressLabel"><span>Workflow progress</span><strong>{HISTORY_PROGRESS[current.status]}%</strong></div>
              <div className="thaProgress"><i style={{ width: `${HISTORY_PROGRESS[current.status]}%` }} /></div>
              <div className="thaCardActions"><button className="thaPrimary" onClick={() => onOpen(current)}>Continue project</button>{current.dates.targetPublish ? <span className="thaChip">Target {current.dates.targetPublish}</span> : null}</div>
            </article>
            <article className="thaCard">
              <div className="thaCardTitle">Next actions</div>
              {nextTasks.length ? nextTasks.map((task) => {
                const video = data.videos.find((item) => item.id === task.videoId);
                return <button key={task.id} className="thaTaskLine" onClick={() => video && onOpen(video)}><i className={task.status === "Blocked" ? "danger" : ""} /><span><strong>{task.title}</strong><small>{video?.id || task.videoId} · {task.status}{task.dueDate ? ` · ${task.dueDate}` : ""}</small></span></button>;
              }) : <p className="thaMuted">No open tasks.</p>}
            </article>
          </div>
        </section>
      ) : null}

      {published.length ? (
        <section className="thaSection">
          <div className="thaSectionLine"><h2>Published on YouTube</h2><button className="thaTextButton" onClick={() => onNavigate("analytics")}>Analytics <ChevronRight size={14} /></button></div>
          <div className="thaVideoGrid">
            {published.slice(0, 4).map((video) => {
              const embed = getYouTubeEmbedUrl(video.youtubeUrl);
              return <article className="thaCard thaPublished" key={video.id}><div className="thaEmbed"><iframe src={embed} title={video.finalTitle || video.workingTitle || video.id} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div><div className="thaPublishedBody"><div className="thaChipRow"><StatusChip status="Published" /><span className="thaChip">{video.id}</span></div><h3>{video.finalTitle || video.workingTitle || "Untitled video"}</h3><div className="thaCardActions"><button className="thaSecondary" onClick={() => onOpen(video)}>Open project</button><a className="thaSecondary" href={video.youtubeUrl} target="_blank" rel="noreferrer"><Youtube size={15} /> YouTube</a></div></div></article>;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return <article className="thaMetric"><span>{label}</span><strong className={danger ? "danger" : ""}>{value}</strong></article>;
}

export function VideosPage({ videos, query, setQuery, newTitle, setNewTitle, onCreate, onOpen, onDelete }: { videos: Video[]; query: string; setQuery: (value: string) => void; newTitle: string; setNewTitle: (value: string) => void; onCreate: () => void; onOpen: (video: Video) => void; onDelete: (id: string) => void }) {
  return <div className="thaPage"><SectionTitle title="Videos" subtitle="Create blank production records. Nothing is pre-filled beyond system defaults." />
    <div className="thaCreateBar"><Field label="New video working title"><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Optional — you can name it later" onKeyDown={(event) => event.key === "Enter" && onCreate()} /></Field><button className="thaPrimary" onClick={onCreate}><Plus size={16} /> New video</button></div>
    <div className="thaToolbar"><div className="thaSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos…" /></div><span>{videos.length} records</span></div>
    {!videos.length ? <Empty title="No videos yet" text="Create a blank project. Research, production, packaging and publishing data will be entered manually." /> : <div className="thaTableWrap"><table className="thaTable"><thead><tr><th>ID</th><th>Video</th><th>Status</th><th>Priority</th><th>Target</th><th /></tr></thead><tbody>{videos.map((video) => <tr key={video.id}><td><span className="thaMono">{video.id}</span></td><td><button className="thaTitleButton" onClick={() => onOpen(video)}><strong>{video.finalTitle || video.workingTitle || "Untitled video"}</strong><small>{video.coreTopic || "No topic entered"}</small></button></td><td><StatusChip status={video.status} /></td><td>{video.priority}</td><td>{video.dates.targetPublish || "—"}</td><td><div className="thaRowActions"><button onClick={() => onOpen(video)}>Open</button><button className="danger" onClick={() => onDelete(video.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>}
  </div>;
}

export function ProductionPage({ videos, onOpen, onStatus }: { videos: Video[]; onOpen: (video: Video) => void; onStatus: (video: Video, status: VideoStatus) => void }) {
  const activeStages = HISTORY_STATUSES.filter((status) => !["Performance Review", "Archived"].includes(status));
  return <div className="thaPage thaWidePage"><SectionTitle title="Production Board" subtitle="Move projects through the complete editorial and publishing workflow. Every status change is recorded." />
    {!videos.length ? <Empty title="Production board is empty" text="Create a video first; it will enter the workflow at Idea." /> : <div className="thaKanban">{activeStages.map((status) => { const stageVideos = videos.filter((video) => video.status === status); return <section className="thaKanbanColumn" key={status}><header><span>{status}</span><b>{stageVideos.length}</b></header><div>{stageVideos.length ? stageVideos.map((video) => <article className="thaKanbanCard" key={video.id}><button onClick={() => onOpen(video)}><small>{video.id} · {video.priority}</small><strong>{video.workingTitle || video.finalTitle || "Untitled video"}</strong></button><select value={video.status} onChange={(event) => onStatus(video, event.target.value as VideoStatus)}>{HISTORY_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></article>) : <p>Empty</p>}</div></section>; })}</div>}
  </div>;
}

export function ResearchPage({ videos, sources, draft, setDraft, onSubmit, onDelete, onOpen }: { videos: Video[]; sources: HistorySource[]; draft: Partial<HistorySource>; setDraft: (value: Partial<HistorySource>) => void; onSubmit: () => void; onDelete: (id: string) => void; onOpen: (video: Video) => void }) {
  return <div className="thaPage"><SectionTitle title="Research Library" subtitle="Sources, facts, contradictions, citation flags and rights notes are stored per video." />
    {!videos.length ? <Empty title="No project to research" text="Create a video first, then add sources here." /> : <><RecordForm title={draft.id ? "Edit source" : "Add source"} onSubmit={onSubmit} onCancel={() => setDraft({})} submitLabel={draft.id ? "Update source" : "Add source"}><div className="thaFormGrid"><Field label="Video"><select value={draft.videoId || ""} onChange={(e) => setDraft({ ...draft, videoId: e.target.value })}><option value="">Select video</option>{videos.map((video) => <option value={video.id} key={video.id}>{video.id} — {video.workingTitle || "Untitled"}</option>)}</select></Field><Field label="Source name"><input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Type"><input value={draft.type || ""} onChange={(e) => setDraft({ ...draft, type: e.target.value })} placeholder="Book, archive, paper, website…" /></Field><Field label="URL"><input value={draft.url || ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></Field><Field label="Author"><input value={draft.author || ""} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></Field><Field label="Publication"><input value={draft.publication || ""} onChange={(e) => setDraft({ ...draft, publication: e.target.value })} /></Field><Field label="Publication date"><input value={draft.pubDate || ""} onChange={(e) => setDraft({ ...draft, pubDate: e.target.value })} /></Field><Field label="Reliability"><input value={draft.reliability || ""} onChange={(e) => setDraft({ ...draft, reliability: e.target.value })} placeholder="Primary / strong / disputed…" /></Field></div><Field label="Key facts"><textarea value={draft.facts || ""} onChange={(e) => setDraft({ ...draft, facts: e.target.value })} /></Field><Field label="Contradictions / caveats"><textarea value={draft.contradictions || ""} onChange={(e) => setDraft({ ...draft, contradictions: e.target.value })} /></Field><div className="thaCheckGrid"><CheckBox label="Citation needed" checked={Boolean(draft.citationNeeded)} onChange={(value) => setDraft({ ...draft, citationNeeded: value })} /><CheckBox label="Used in script" checked={Boolean(draft.usedInScript)} onChange={(value) => setDraft({ ...draft, usedInScript: value })} /><CheckBox label="Public domain" checked={Boolean(draft.publicDomain)} onChange={(value) => setDraft({ ...draft, publicDomain: value })} /></div></RecordForm><div className="thaCards">{sources.length ? sources.map((source) => { const video = videos.find((item) => item.id === source.videoId); return <article className="thaCard" key={source.id}><div className="thaCardTop"><div><span className="thaChip">{source.videoId}</span><h3>{source.name}</h3><p>{source.author || source.publication || source.type || "Source"}</p></div><div className="thaRowActions"><button onClick={() => setDraft(source)}>Edit</button><button className="danger" onClick={() => onDelete(source.id)}><Trash2 size={14} /></button></div></div>{source.facts ? <p className="thaRecordText">{source.facts}</p> : null}<div className="thaChipRow">{source.reliability ? <span className="thaChip">{source.reliability}</span> : null}{source.citationNeeded ? <span className="thaChip isDanger">Citation</span> : null}{source.publicDomain ? <span className="thaChip isSuccess">Public domain</span> : null}</div>{video ? <button className="thaTextButton" onClick={() => onOpen(video)}>Open video <ChevronRight size={14} /></button> : null}</article>; }) : <Empty title="No sources yet" text="Add the first research source above." />}</div></>}
  </div>;
}

export function AssetsPage({ videos, prompts, draft, setDraft, onSubmit, onDelete, onOpen }: { videos: Video[]; prompts: PromptAsset[]; draft: Partial<PromptAsset>; setDraft: (value: Partial<PromptAsset>) => void; onSubmit: () => void; onDelete: (id: string) => void; onOpen: (video: Video) => void }) {
  return <div className="thaPage"><SectionTitle title="Assets & Prompts" subtitle="Track AI prompts, generated outputs, reusable visual assets and approval state." />
    {!videos.length ? <Empty title="No project for assets" text="Create a video before adding prompts or production assets." /> : <><RecordForm title={draft.id ? "Edit asset" : "Add asset / prompt"} onSubmit={onSubmit} onCancel={() => setDraft({})} submitLabel={draft.id ? "Update asset" : "Add asset"}><div className="thaFormGrid"><Field label="Video"><select value={draft.videoId || ""} onChange={(e) => setDraft({ ...draft, videoId: e.target.value })}><option value="">Select video</option>{videos.map((video) => <option key={video.id} value={video.id}>{video.id} — {video.workingTitle || "Untitled"}</option>)}</select></Field><Field label="Name"><input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Category"><input value={draft.category || ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Image, video, map, thumbnail…" /></Field><Field label="AI tool"><input value={draft.aiTool || ""} onChange={(e) => setDraft({ ...draft, aiTool: e.target.value })} /></Field><Field label="Aspect ratio"><input value={draft.aspectRatio || ""} onChange={(e) => setDraft({ ...draft, aspectRatio: e.target.value })} /></Field><Field label="Output link"><input value={draft.outputLink || ""} onChange={(e) => setDraft({ ...draft, outputLink: e.target.value })} /></Field></div><Field label="Full prompt"><textarea value={draft.fullPrompt || ""} onChange={(e) => setDraft({ ...draft, fullPrompt: e.target.value })} /></Field><Field label="Negative prompt"><textarea value={draft.negativePrompt || ""} onChange={(e) => setDraft({ ...draft, negativePrompt: e.target.value })} /></Field><div className="thaCheckGrid"><CheckBox label="Approved" checked={Boolean(draft.approved)} onChange={(value) => setDraft({ ...draft, approved: value })} /><CheckBox label="Reusable" checked={Boolean(draft.reusable)} onChange={(value) => setDraft({ ...draft, reusable: value })} /><Field label="Quality / 5"><input type="number" min="0" max="5" value={draft.qualityRating ?? 0} onChange={(e) => setDraft({ ...draft, qualityRating: Number(e.target.value) })} /></Field></div></RecordForm><div className="thaCards">{prompts.length ? prompts.map((asset) => { const video = videos.find((item) => item.id === asset.videoId); return <article className="thaCard" key={asset.id}><div className="thaCardTop"><div><span className="thaChip">{asset.videoId}</span><h3>{asset.name}</h3><p>{asset.category || asset.aiTool || "Production asset"}</p></div><div className="thaRowActions"><button onClick={() => setDraft(asset)}>Edit</button><button className="danger" onClick={() => onDelete(asset.id)}><Trash2 size={14} /></button></div></div>{asset.fullPrompt ? <p className="thaRecordText">{asset.fullPrompt}</p> : null}<div className="thaChipRow">{asset.approved ? <span className="thaChip isSuccess">Approved</span> : <span className="thaChip">Review</span>}{asset.reusable ? <span className="thaChip">Reusable</span> : null}<span className="thaChip">{asset.qualityRating}/5</span></div>{video ? <button className="thaTextButton" onClick={() => onOpen(video)}>Open video <ChevronRight size={14} /></button> : null}</article>; }) : <Empty title="No production assets" text="Add prompts and assets above." />}</div></>}
  </div>;
}

export function IdeasPage({ videos, onOpen, onCreate }: { videos: Video[]; onOpen: (video: Video) => void; onCreate: () => void }) {
  const ideas = videos.filter((video) => ["Idea", "Topic Validation", "Story Angle"].includes(video.status));
  return <div className="thaPage"><SectionTitle title="Idea Bank" subtitle="Early concepts remain here until they progress into research and production." action={<button className="thaPrimary" onClick={onCreate}><Plus size={16} /> New idea</button>} />{!ideas.length ? <Empty title="Idea bank is empty" text="Create a new video idea; no example concepts are preloaded." /> : <div className="thaCards">{ideas.map((video) => <article className="thaCard clickable" key={video.id} onClick={() => onOpen(video)}><div className="thaChipRow"><span className="thaChip">{video.id}</span><StatusChip status={video.status} /><span className="thaChip">{video.priority}</span></div><h3>{video.workingTitle || "Untitled idea"}</h3><p>{video.ideaBank.whyClick || video.coreTopic || "No idea notes entered yet."}</p></article>)}</div>}</div>;
}

export function SeriesPage({ series, videos, draft, setDraft, onSubmit, onDelete }: { series: HistorySeries[]; videos: Video[]; draft: Partial<HistorySeries>; setDraft: (value: Partial<HistorySeries>) => void; onSubmit: () => void; onDelete: (id: string) => void }) {
  return <div className="thaPage"><SectionTitle title="Series" subtitle="Group related documentaries and build repeatable editorial franchises." /><RecordForm title={draft.id ? "Edit series" : "Create series"} onSubmit={onSubmit} onCancel={() => setDraft({})} submitLabel={draft.id ? "Update series" : "Create series"}><div className="thaFormGrid"><Field label="Series name"><input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Description"><input value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field></div></RecordForm>{!series.length ? <Empty title="No series yet" text="Create a series only when you need one; the system does not insert defaults." /> : <div className="thaCards">{series.map((item) => <article className="thaCard" key={item.id}><div className="thaCardTop"><div><h3>{item.name}</h3><p>{item.description || "No description"}</p><span className="thaChip">{videos.filter((video) => video.seriesId === item.id).length} videos</span></div><div className="thaRowActions"><button onClick={() => setDraft(item)}>Edit</button><button className="danger" onClick={() => onDelete(item.id)}><Trash2 size={14} /></button></div></div></article>)}</div>}</div>;
}

export function CalendarPage({ videos, onOpen }: { videos: Video[]; onOpen: (video: Video) => void }) {
  const dated = videos.filter((video) => video.dates.targetPublish || video.dates.uploadDate || video.dates.finalPublish).sort((a, b) => (a.dates.targetPublish || a.dates.uploadDate || a.dates.finalPublish).localeCompare(b.dates.targetPublish || b.dates.uploadDate || b.dates.finalPublish));
  return <div className="thaPage"><SectionTitle title="Publishing Calendar" subtitle="Dates come directly from each video project." />{!dated.length ? <Empty title="No dates scheduled" text="Add target, upload or final publish dates inside a video project." /> : <div className="thaTimeline">{dated.map((video) => <button key={video.id} onClick={() => onOpen(video)}><CalendarDays size={18} /><span><strong>{video.finalTitle || video.workingTitle || "Untitled video"}</strong><small>{video.id} · {video.status}</small></span><div>{video.dates.targetPublish ? <span>Target {video.dates.targetPublish}</span> : null}{video.dates.uploadDate ? <span>Upload {video.dates.uploadDate}</span> : null}{video.dates.finalPublish ? <span>Published {video.dates.finalPublish}</span> : null}</div></button>)}</div>}</div>;
}

export function AnalyticsPage({ videos, onOpen }: { videos: Video[]; onOpen: (video: Video) => void }) {
  const published = videos.filter((video) => ["Published", "Performance Review", "Archived"].includes(video.status));
  return <div className="thaPage"><SectionTitle title="Analytics" subtitle="Only the performance numbers you enter are shown; no synthetic metrics are generated." />{!published.length ? <Empty title="No published videos" text="Published YouTube projects will appear here." /> : <div className="thaCards">{published.map((video) => <article className="thaCard clickable" key={video.id} onClick={() => onOpen(video)}><div className="thaChipRow"><span className="thaChip">{video.id}</span><StatusChip status={video.status} /></div><h3>{video.finalTitle || video.workingTitle || "Untitled video"}</h3><div className="thaMiniMetrics"><span>Views <b>{video.analytics.views30d || "—"}</b></span><span>CTR <b>{video.analytics.ctr || "—"}</b></span><span>AVD <b>{video.analytics.avd || "—"}</b></span><span>Watch h <b>{video.analytics.watchHours || "—"}</b></span><span>Subs <b>{video.analytics.subscribers || "—"}</b></span><span>Impressions <b>{video.analytics.impressions || "—"}</b></span></div></article>)}</div>}</div>;
}

export function LegalPage({ videos, sources, onOpen }: { videos: Video[]; sources: HistorySource[]; onOpen: (video: Video) => void }) {
  return <div className="thaPage"><SectionTitle title="Legal Review" subtitle="Copyright, asset rights, source verification and synthetic-content disclosure are tracked before publication." />{!videos.length ? <Empty title="No videos to review" text="Create a project first." /> : <div className="thaTimeline">{videos.map((video) => { const sourceCount = sources.filter((source) => source.videoId === video.id).length; const cleared = legalCleared(video); return <button key={video.id} onClick={() => onOpen(video)}><Scale size={18} /><span><strong>{video.workingTitle || video.finalTitle || "Untitled video"}</strong><small>{video.id} · {sourceCount} sources</small></span><div><span>{video.legal.copyrightStatus}</span><span>{video.legal.assetRights}</span><span className={cleared ? "success" : ""}>{cleared ? "Cleared" : "Review"}</span></div></button>; })}</div>}</div>;
}

export function ArchivePage({ videos, onOpen }: { videos: Video[]; onOpen: (video: Video) => void }) {
  const archived = videos.filter((video) => video.status === "Archived");
  return <div className="thaPage"><SectionTitle title="Archive" subtitle="Completed projects remain searchable with their research, production and YouTube records." />{!archived.length ? <Empty title="Archive is empty" text="Move completed projects to Archived when you are ready." /> : <div className="thaCards">{archived.map((video) => <article className="thaCard clickable" key={video.id} onClick={() => onOpen(video)}><Archive size={18} /><span className="thaChip">{video.id}</span><h3>{video.finalTitle || video.workingTitle || "Untitled video"}</h3>{video.youtubeUrl ? <span className="thaChip isSuccess">YouTube linked</span> : null}</article>)}</div>}</div>;
}

export function SettingsPage({ data, draft, setDraft, onSave, onRefresh, onCheckDb, onExport, dbState, saveState }: { data: HistoryBootstrap; draft: HistorySettings; setDraft: (value: HistorySettings) => void; onSave: () => void; onRefresh: () => void; onCheckDb: () => void; onExport: () => void; dbState: "idle" | "checking" | "online" | "error"; saveState: SaveState }) {
  return <div className="thaPage"><SectionTitle title="Settings" subtitle="Channel configuration, database health and safe local brand assets." /><div className="thaSettingsGrid"><article className="thaCard thaBrandCard"><img src={BANNER_IMAGE} alt="The History Archived banner" /><div><img src={LOGO_IMAGE} alt="The History Archived logo" /><span><strong>Brand assets</strong><small>Embedded in the Startpage build — no external hotlinks.</small></span></div></article><article className="thaCard"><div className="thaCardTitle">Channel</div><div className="thaFormGrid"><Field label="Channel name"><input value={draft.channelName} onChange={(e) => setDraft({ ...draft, channelName: e.target.value })} /></Field><Field label="YouTube channel URL"><input value={draft.youtubeChannelUrl} onChange={(e) => setDraft({ ...draft, youtubeChannelUrl: e.target.value })} /></Field><Field label="Timezone"><input value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} /></Field><Field label="Default format"><select value={draft.defaultFormat} onChange={(e) => setDraft({ ...draft, defaultFormat: e.target.value as HistorySettings["defaultFormat"] })}><option>Long Documentary</option><option>Short</option><option>Special</option></select></Field></div><button className="thaPrimary" onClick={onSave}><Save size={16} /> {saveState === "saving" ? "Saving…" : "Save settings"}</button></article><article className="thaCard thaDataCard"><div><Database size={20} /><span><strong>Workspace data</strong><small>All History production records are persisted in PostgreSQL. Browser storage is not used.</small></span></div><div className="thaDataActions"><button className="thaSecondary" onClick={onCheckDb}><Database size={15} /> {dbState === "checking" ? "Checking…" : dbState === "online" ? "Database online" : dbState === "error" ? "Database error" : "Check database"}</button><button className="thaSecondary" onClick={onRefresh}><RefreshCw size={15} /> Reload</button><button className="thaSecondary" onClick={onExport}>Export backup</button></div><div className="thaMiniMetrics"><span>Videos <b>{data.videos.length}</b></span><span>Sources <b>{data.sources.length}</b></span><span>Assets <b>{data.prompts.length}</b></span><span>Tasks <b>{data.tasks.length}</b></span><span>Series <b>{data.series.length}</b></span></div></article></div></div>;
}

function RecordForm({ title, children, onSubmit, onCancel, submitLabel }: { title: string; children: React.ReactNode; onSubmit: () => void; onCancel: () => void; submitLabel: string }) {
  return <section className="thaCard thaRecordForm"><div className="thaSectionLine"><h2>{title}</h2><button className="thaIconButton" onClick={onCancel} title="Clear form"><X size={16} /></button></div>{children}<div className="thaCardActions"><button className="thaPrimary" onClick={onSubmit}><Save size={15} /> {submitLabel}</button></div></section>;
}

function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="thaCheck"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span><Check size={13} />{label}</span></label>;
}
