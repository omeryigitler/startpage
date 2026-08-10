"use client";

import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  FileText,
  Film,
  FolderKanban,
  Gauge,
  ImageIcon,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Menu,
  RefreshCw,
  Scale,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HISTORY_SETTINGS,
  type HistoryBootstrap,
  type HistorySeries,
  type HistorySettings,
  type HistorySource,
  type HistoryTask,
  type PromptAsset,
  type Video,
  type VideoStatus,
} from "../../lib/history-model";
import { LOGO_IMAGE } from "./assets";
import {
  AnalyticsPage,
  ArchivePage,
  AssetsPage,
  CalendarPage,
  Dashboard,
  IdeasPage,
  LegalPage,
  ResearchPage,
  SeriesPage,
  SettingsPage,
  VideosPage,
} from "./HistoryPages";
import { VideoEditor } from "./VideoEditor";
import { WorkflowPage, WorkflowProductionPage } from "./WorkflowPage";

type PageId =
  | "dashboard"
  | "videos"
  | "production"
  | "workflow"
  | "research"
  | "assets"
  | "ideas"
  | "series"
  | "calendar"
  | "analytics"
  | "legal"
  | "archive"
  | "settings";

type SaveState = "idle" | "saving" | "saved" | "error";

const NAV: Array<{ id: PageId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "videos", label: "Videos", icon: Film },
  { id: "production", label: "Production", icon: FolderKanban },
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "research", label: "Research", icon: FileText },
  { id: "assets", label: "Assets & Prompts", icon: ImageIcon },
  { id: "ideas", label: "Ideas", icon: Sparkles },
  { id: "series", label: "Series", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "analytics", label: "Analytics", icon: Gauge },
  { id: "legal", label: "Legal Review", icon: Scale },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "settings", label: "Settings", icon: Settings2 },
];

function emptyBootstrap(): HistoryBootstrap {
  return {
    videos: [],
    sources: [],
    prompts: [],
    tasks: [],
    series: [],
    workflowEvents: [],
    settings: DEFAULT_HISTORY_SETTINGS,
  };
}

function cloneVideo(video: Video): Video {
  return JSON.parse(JSON.stringify(video)) as Video;
}

async function request<T>(resource: string, init?: RequestInit, id?: string): Promise<T> {
  const params = new URLSearchParams({ resource });
  if (id) params.set("id", id);
  const response = await fetch(`/api/history?${params.toString()}`, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
  return payload as T;
}

export default function HistoryArchivedWorkspace() {
  const [data, setData] = useState<HistoryBootstrap>(emptyBootstrap);
  const [page, setPage] = useState<PageId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [videoDraft, setVideoDraft] = useState<Video | null>(null);
  const [videoTab, setVideoTab] = useState("overview");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [query, setQuery] = useState("");
  const [sourceDraft, setSourceDraft] = useState<Partial<HistorySource>>({});
  const [assetDraft, setAssetDraft] = useState<Partial<PromptAsset>>({});
  const [taskDraft, setTaskDraft] = useState<Partial<HistoryTask>>({ status: "To Do", priority: "P2" });
  const [seriesDraft, setSeriesDraft] = useState<Partial<HistorySeries>>({});
  const [settingsDraft, setSettingsDraft] = useState<HistorySettings>(DEFAULT_HISTORY_SETTINGS);
  const [dbState, setDbState] = useState<"idle" | "checking" | "online" | "error">("idle");

  const load = useCallback(async () => {
    setLoading(true);
    setFatalError("");
    try {
      const next = await request<HistoryBootstrap>("bootstrap");
      setData(next);
      setSettingsDraft(next.settings || DEFAULT_HISTORY_SETTINGS);
      if (selectedId) {
        const selected = next.videos.find((video) => video.id === selectedId);
        if (selected) setVideoDraft(cloneVideo(selected));
        else {
          setSelectedId("");
          setVideoDraft(null);
        }
      }
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : "Workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  function openVideo(video: Video) {
    setSelectedId(video.id);
    setVideoDraft(cloneVideo(video));
    setSourceDraft({ videoId: video.id });
    setAssetDraft({ videoId: video.id });
    setTaskDraft({ videoId: video.id, status: "To Do", priority: "P2" });
    setVideoTab("overview");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeVideo() {
    setSelectedId("");
    setVideoDraft(null);
  }

  async function createVideo() {
    setSaveState("saving");
    try {
      const video = await request<Video>("videos", {
        method: "POST",
        body: JSON.stringify({ workingTitle: newVideoTitle }),
      });
      setData((current) => ({ ...current, videos: [video, ...current.videos] }));
      setNewVideoTitle("");
      setSaveState("saved");
      openVideo(video);
      showNotice("Video project created.");
    } catch (error) {
      setSaveState("error");
      showNotice(error instanceof Error ? error.message : "Video could not be created.");
    }
  }

  async function saveVideo(nextVideo = videoDraft) {
    if (!nextVideo) return;
    setSaveState("saving");
    try {
      const saved = await request<Video>("videos", { method: "PATCH", body: JSON.stringify(nextVideo) });
      setData((current) => ({
        ...current,
        videos: current.videos.map((video) => video.id === saved.id ? saved : video),
      }));
      setVideoDraft(cloneVideo(saved));
      setSaveState("saved");
      showNotice("Video saved to database.");
    } catch (error) {
      setSaveState("error");
      showNotice(error instanceof Error ? error.message : "Video could not be saved.");
    }
  }

  async function changeStatus(video: Video, status: VideoStatus) {
    try {
      const saved = await request<Video>("videos", { method: "PATCH", body: JSON.stringify({ ...video, status }) });
      setData((current) => ({
        ...current,
        videos: current.videos.map((item) => item.id === saved.id ? saved : item),
        workflowEvents: [{ id: `local-${Date.now()}`, videoId: saved.id, fromStatus: video.status, toStatus: saved.status, createdAt: new Date().toISOString() }, ...current.workflowEvents],
      }));
      if (selectedId === saved.id) setVideoDraft(cloneVideo(saved));
      showNotice(`Moved to ${status}.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Workflow status could not be changed.");
    }
  }

  async function deleteVideo(id: string) {
    if (!window.confirm("Delete this video and all linked research, assets and tasks?")) return;
    try {
      await request<{ ok: boolean }>("videos", { method: "DELETE" }, id);
      setData((current) => ({
        ...current,
        videos: current.videos.filter((video) => video.id !== id),
        sources: current.sources.filter((source) => source.videoId !== id),
        prompts: current.prompts.filter((asset) => asset.videoId !== id),
        tasks: current.tasks.filter((task) => task.videoId !== id),
        workflowEvents: current.workflowEvents.filter((event) => event.videoId !== id),
      }));
      if (selectedId === id) closeVideo();
      showNotice("Video deleted.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Video could not be deleted.");
    }
  }

  async function saveResource<T extends { id: string }>(resource: string, draft: Partial<T>, create: boolean) {
    const item = await request<T>(resource, {
      method: create ? "POST" : "PATCH",
      body: JSON.stringify(draft),
    });
    return item;
  }

  async function deleteResource(resource: string, id: string) {
    await request<{ ok: boolean }>(resource, { method: "DELETE" }, id);
  }

  async function submitSource() {
    const videoId = String(sourceDraft.videoId || selectedId || "");
    if (!videoId || !String(sourceDraft.name || "").trim()) return showNotice("Select a video and enter a source name.");
    try {
      const create = !sourceDraft.id;
      const item = await saveResource<HistorySource>("sources", { ...sourceDraft, videoId }, create);
      setData((current) => ({ ...current, sources: create ? [item, ...current.sources] : current.sources.map((x) => x.id === item.id ? item : x) }));
      setSourceDraft({ videoId });
      showNotice(create ? "Source added." : "Source updated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Source could not be saved.");
    }
  }

  async function submitAsset() {
    const videoId = String(assetDraft.videoId || selectedId || "");
    if (!videoId || !String(assetDraft.name || "").trim()) return showNotice("Select a video and enter an asset name.");
    try {
      const create = !assetDraft.id;
      const item = await saveResource<PromptAsset>("assets", { ...assetDraft, videoId }, create);
      setData((current) => ({ ...current, prompts: create ? [item, ...current.prompts] : current.prompts.map((x) => x.id === item.id ? item : x) }));
      setAssetDraft({ videoId });
      showNotice(create ? "Asset added." : "Asset updated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Asset could not be saved.");
    }
  }

  async function submitTask() {
    const videoId = String(taskDraft.videoId || selectedId || "");
    if (!videoId || !String(taskDraft.title || "").trim()) return showNotice("Select a video and enter a task title.");
    try {
      const create = !taskDraft.id;
      const item = await saveResource<HistoryTask>("tasks", { ...taskDraft, videoId }, create);
      setData((current) => ({ ...current, tasks: create ? [item, ...current.tasks] : current.tasks.map((x) => x.id === item.id ? item : x) }));
      setTaskDraft({ videoId, status: "To Do", priority: "P2" });
      showNotice(create ? "Task added." : "Task updated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Task could not be saved.");
    }
  }

  async function submitSeries() {
    if (!String(seriesDraft.name || "").trim()) return showNotice("Enter a series name.");
    try {
      const create = !seriesDraft.id;
      const item = await saveResource<HistorySeries>("series", seriesDraft, create);
      setData((current) => ({ ...current, series: (create ? [...current.series, item] : current.series.map((x) => x.id === item.id ? item : x)).sort((a, b) => a.name.localeCompare(b.name)) }));
      setSeriesDraft({});
      showNotice(create ? "Series created." : "Series updated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Series could not be saved.");
    }
  }

  async function deleteItem(resource: "sources" | "assets" | "tasks" | "series", id: string) {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteResource(resource, id);
      setData((current) => ({
        ...current,
        sources: resource === "sources" ? current.sources.filter((x) => x.id !== id) : current.sources,
        prompts: resource === "assets" ? current.prompts.filter((x) => x.id !== id) : current.prompts,
        tasks: resource === "tasks" ? current.tasks.filter((x) => x.id !== id) : current.tasks,
        series: resource === "series" ? current.series.filter((x) => x.id !== id) : current.series,
        videos: resource === "series" ? current.videos.map((video) => video.seriesId === id ? { ...video, seriesId: "" } : video) : current.videos,
      }));
      showNotice("Record deleted.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Record could not be deleted.");
    }
  }

  async function saveSettings() {
    setSaveState("saving");
    try {
      const settings = await request<HistorySettings>("settings", { method: "PATCH", body: JSON.stringify(settingsDraft) });
      setData((current) => ({ ...current, settings }));
      setSettingsDraft(settings);
      setSaveState("saved");
      showNotice("Settings saved.");
    } catch (error) {
      setSaveState("error");
      showNotice(error instanceof Error ? error.message : "Settings could not be saved.");
    }
  }

  async function checkDb() {
    setDbState("checking");
    try {
      await request("health");
      setDbState("online");
    } catch {
      setDbState("error");
    }
  }

  async function exportBackup() {
    try {
      const params = new URLSearchParams({ resource: "export" });
      const response = await fetch(`/api/history?${params.toString()}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Backup export failed.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `the-history-archived-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Backup could not be exported.");
    }
  }

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.videos;
    return data.videos.filter((video) => `${video.id} ${video.workingTitle} ${video.finalTitle} ${video.coreTopic} ${video.historicalPeriod} ${video.geography}`.toLowerCase().includes(q));
  }, [data.videos, query]);

  if (loading) {
    return <div className="thaLoading"><LoaderCircle className="thaSpin" /><span>Loading History workspace…</span></div>;
  }

  if (fatalError) {
    return (
      <div className="thaFatal">
        <CircleAlert size={34} />
        <h1>History workspace could not load</h1>
        <p>{fatalError}</p>
        <button className="thaPrimary" onClick={() => void load()}><RefreshCw size={16} /> Retry</button>
      </div>
    );
  }

  if (videoDraft) {
    return (
      <VideoEditor
        video={videoDraft}
        setVideo={setVideoDraft}
        sources={data.sources.filter((source) => source.videoId === videoDraft.id)}
        prompts={data.prompts.filter((asset) => asset.videoId === videoDraft.id)}
        tasks={data.tasks.filter((task) => task.videoId === videoDraft.id)}
        events={data.workflowEvents.filter((event) => event.videoId === videoDraft.id)}
        series={data.series}
        workflow={data.settings.workflow}
        tab={videoTab}
        setTab={setVideoTab}
        saveState={saveState}
        onBack={closeVideo}
        onSave={() => void saveVideo()}
        onDelete={() => void deleteVideo(videoDraft.id)}
        onStatus={(status) => void changeStatus(videoDraft, status)}
        sourceDraft={sourceDraft}
        setSourceDraft={setSourceDraft}
        assetDraft={assetDraft}
        setAssetDraft={setAssetDraft}
        taskDraft={taskDraft}
        setTaskDraft={setTaskDraft}
        onSubmitSource={() => void submitSource()}
        onSubmitAsset={() => void submitAsset()}
        onSubmitTask={() => void submitTask()}
        onDeleteItem={(resource, id) => void deleteItem(resource, id)}
      />
    );
  }

  return (
    <div className="thaApp">
      {notice ? <div className="thaToast">{notice}</div> : null}
      <aside className={`thaSidebar ${menuOpen ? "isOpen" : ""}`}>
        <div className="thaBrand">
          <img src={LOGO_IMAGE} alt="The History Archived logo" />
          <div><strong>THE HISTORY</strong><span>ARCHIVED</span></div>
        </div>
        <nav>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setMenuOpen(false); }}>
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="thaSidebarBottom">
          <Link href="/"><ArrowLeft size={16} /> Startpage</Link>
          <span>PostgreSQL workspace</span>
        </div>
      </aside>

      <main className="thaMain">
        <div className="thaMobileBar">
          <button onClick={() => setMenuOpen(true)}><Menu size={19} /></button>
          <div><img src={LOGO_IMAGE} alt="" /><strong>The History Archived</strong></div>
        </div>
        {menuOpen ? <button className="thaMenuScrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}

        {page === "dashboard" && <Dashboard data={data} onOpen={openVideo} onNavigate={setPage} />}
        {page === "videos" && <VideosPage videos={filteredVideos} query={query} setQuery={setQuery} newTitle={newVideoTitle} setNewTitle={setNewVideoTitle} onCreate={() => void createVideo()} onOpen={openVideo} onDelete={(id) => void deleteVideo(id)} />}
        {page === "production" && <WorkflowProductionPage videos={data.videos} workflow={data.settings.workflow} onOpen={openVideo} onStatus={(video, status) => void changeStatus(video, status)} onConfigure={() => setPage("workflow")} />}
        {page === "workflow" && <WorkflowPage settings={settingsDraft} videos={data.videos} setSettings={setSettingsDraft} onSave={() => void saveSettings()} saveState={saveState} />}
        {page === "research" && <ResearchPage videos={data.videos} sources={data.sources} draft={sourceDraft} setDraft={setSourceDraft} onSubmit={() => void submitSource()} onDelete={(id) => void deleteItem("sources", id)} onOpen={openVideo} />}
        {page === "assets" && <AssetsPage videos={data.videos} prompts={data.prompts} draft={assetDraft} setDraft={setAssetDraft} onSubmit={() => void submitAsset()} onDelete={(id) => void deleteItem("assets", id)} onOpen={openVideo} />}
        {page === "ideas" && <IdeasPage videos={data.videos} onOpen={openVideo} onCreate={() => void createVideo()} />}
        {page === "series" && <SeriesPage series={data.series} videos={data.videos} draft={seriesDraft} setDraft={setSeriesDraft} onSubmit={() => void submitSeries()} onDelete={(id) => void deleteItem("series", id)} />}
        {page === "calendar" && <CalendarPage videos={data.videos} onOpen={openVideo} />}
        {page === "analytics" && <AnalyticsPage videos={data.videos} onOpen={openVideo} />}
        {page === "legal" && <LegalPage videos={data.videos} sources={data.sources} onOpen={openVideo} />}
        {page === "archive" && <ArchivePage videos={data.videos} onOpen={openVideo} />}
        {page === "settings" && <SettingsPage data={data} draft={settingsDraft} setDraft={setSettingsDraft} onSave={() => void saveSettings()} onRefresh={() => void load()} onCheckDb={() => void checkDb()} onExport={() => void exportBackup()} dbState={dbState} saveState={saveState} />}
      </main>
    </div>
  );
}
