"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  GripVertical,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  DEFAULT_HISTORY_WORKFLOW,
  type HistorySettings,
  type HistoryWorkflowStep,
  type Video,
  type VideoStatus,
} from "../../lib/history-model";

type SaveState = "idle" | "saving" | "saved" | "error";
type WorkflowView = "tracker" | "builder" | "handoff";
type TrackerEntry = {
  videoId: string;
  stepId: string;
  completed: boolean;
  note: string;
  completedAt: string;
  updatedAt: string;
};

type TrackerResponse = {
  entry: TrackerEntry;
  videoStatus: string;
  statusNotice?: string;
  completedRequired: number;
  totalRequired: number;
  completedAll: number;
  totalStages: number;
};

const SYSTEM_STAGE_IDS = new Set(["idea", "topic-validation", "story-angle", "published", "performance-review", "archived"]);

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <header className="thaSectionHeader"><div><p className="thaEyebrow">THE HISTORY ARCHIVED</p><h1>{title}</h1>{subtitle ? <p className="thaSubtitle">{subtitle}</p> : null}</div>{action ? <div className="thaHeaderAction">{action}</div> : null}</header>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="thaField"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

function cloneDefaultWorkflow() {
  return DEFAULT_HISTORY_WORKFLOW.map((step) => ({ ...step }));
}

function trackerKey(videoId: string, stepId: string) {
  return `${videoId}:${stepId}`;
}

export function buildAiWorkflowJson(settings: HistorySettings) {
  return {
    schema: "the-history-archived.production-workflow.v1",
    channel: {
      name: settings.channelName,
      language: "English",
      format: settings.defaultFormat,
      timezone: settings.timezone,
    },
    projectInput: {
      workingTitle: "[ENTER WORKING TITLE]",
      coreTopic: "[ENTER CORE TOPIC]",
      historicalPeriod: "[ENTER PERIOD]",
      geography: "[ENTER GEOGRAPHY]",
      targetLength: "[ENTER TARGET LENGTH]",
      sourceMaterial: "[PASTE OR ATTACH VERIFIED SOURCES / RESEARCH]",
      additionalInstructions: "[ENTER PROJECT-SPECIFIC REQUESTS]",
    },
    operatingRules: settings.aiMasterInstructions,
    executionRule: "Follow the workflow in order. For each stage, use only supplied project information and verified source material. Return the defined deliverables, check completion criteria, identify missing information, and do not silently advance past an incomplete required stage.",
    workflow: settings.workflow.map((step, index) => ({
      step: index + 1,
      id: step.id,
      name: step.name,
      phase: step.phase,
      required: step.required,
      progress: step.progress,
      objective: step.objective,
      instructions: step.instructions,
      deliverables: step.deliverables,
      completionCriteria: step.completionCriteria,
      aiPrompt: step.aiPrompt,
    })),
  };
}

export function buildAiWorkflowBrief(settings: HistorySettings) {
  const lines: string[] = [
    "# THE HISTORY ARCHIVED — MASTER PRODUCTION WORKFLOW",
    "",
    "## CHANNEL",
    `- Name: ${settings.channelName}`,
    "- Language: English",
    `- Default format: ${settings.defaultFormat}`,
    `- Timezone: ${settings.timezone}`,
    "",
    "## PROJECT INPUT",
    "- Working title: [ENTER WORKING TITLE]",
    "- Core topic: [ENTER CORE TOPIC]",
    "- Historical period: [ENTER PERIOD]",
    "- Geography: [ENTER GEOGRAPHY]",
    "- Target length: [ENTER TARGET LENGTH]",
    "- Verified source material: [PASTE OR ATTACH SOURCES / RESEARCH]",
    "- Additional project instructions: [ENTER REQUESTS]",
    "",
    "## GLOBAL AI OPERATING RULES",
    settings.aiMasterInstructions,
    "",
    "## EXECUTION RULE",
    "Work through the stages in the exact order below. At each stage, use only supplied project information and verified source material. Produce the requested deliverables, evaluate the completion criteria, state what is missing, and do not silently advance past an incomplete required stage.",
    "",
    "## WORKFLOW",
  ];

  settings.workflow.forEach((step, index) => {
    lines.push(
      "",
      `### ${String(index + 1).padStart(2, "0")} — ${step.name}`,
      `Phase: ${step.phase || "General"}`,
      `Required: ${step.required ? "Yes" : "No"}`,
      `Progress: ${step.progress}%`,
      "",
      "Objective:", step.objective || "[DEFINE OBJECTIVE]",
      "", "Instructions:", step.instructions || "[DEFINE INSTRUCTIONS]",
      "", "Deliverables:", step.deliverables || "[DEFINE DELIVERABLES]",
      "", "Completion criteria:", step.completionCriteria || "[DEFINE COMPLETION CRITERIA]",
      "", "AI instruction:", step.aiPrompt || "[DEFINE AI INSTRUCTION]",
    );
  });

  lines.push(
    "",
    "## FINAL RESPONSE CONTRACT",
    "For every stage return: (1) stage name, (2) completed deliverables, (3) evidence/source gaps, (4) risks or unresolved questions, (5) completion status, and (6) the exact inputs needed for the next stage.",
  );
  return lines.join("\n");
}

function buildProjectAiBrief(settings: HistorySettings, video: Video, tracking: Record<string, TrackerEntry>) {
  const completed = settings.workflow.filter((step) => tracking[trackerKey(video.id, step.id)]?.completed);
  const next = settings.workflow.find((step) => step.required && !tracking[trackerKey(video.id, step.id)]?.completed);
  const lines = [
    "# THE HISTORY ARCHIVED — PROJECT CONTINUATION BRIEF",
    "",
    `Project ID: ${video.id}`,
    `Working title: ${video.workingTitle || "[NOT SET]"}`,
    `Final title: ${video.finalTitle || "[NOT SET]"}`,
    `Core topic: ${video.coreTopic || "[NOT SET]"}`,
    `Historical period: ${video.historicalPeriod || "[NOT SET]"}`,
    `Geography: ${video.geography || "[NOT SET]"}`,
    `Target length: ${video.targetLength || "[NOT SET]"}`,
    `Current board stage: ${video.status}`,
    "",
    "## COMPLETED WORKFLOW STAGES",
    ...(completed.length ? completed.map((step) => `- ${step.name}${tracking[trackerKey(video.id, step.id)]?.note ? ` — ${tracking[trackerKey(video.id, step.id)].note}` : ""}`) : ["- None yet"]),
    "",
    "## NEXT REQUIRED STAGE",
    next ? `Stage: ${next.name}\nObjective: ${next.objective}\nInstructions: ${next.instructions}\nDeliverables: ${next.deliverables}\nCompletion criteria: ${next.completionCriteria}\nAI instruction: ${next.aiPrompt}` : "All required workflow stages are complete.",
    "",
    "## GLOBAL AI RULES",
    settings.aiMasterInstructions,
    "",
    "Continue only from the next required stage. Do not redo completed stages unless a contradiction or missing prerequisite requires revision. Use Research Library, Assets & Prompts, Tasks and project fields as the source of truth; never invent missing facts or source material.",
  ];
  return lines.join("\n");
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function WorkflowPage({ settings, videos, setSettings, onSave, saveState }: {
  settings: HistorySettings;
  videos: Video[];
  setSettings: (settings: HistorySettings) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  const workflow = settings.workflow || [];
  const [view, setView] = useState<WorkflowView>("tracker");
  const [tracking, setTracking] = useState<Record<string, TrackerEntry>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(true);
  const [trackerNotice, setTrackerNotice] = useState("");
  const aiBrief = buildAiWorkflowBrief(settings);
  const aiJson = JSON.stringify(buildAiWorkflowJson(settings), null, 2);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/history-tracker", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Workflow tracker could not be loaded.");
        return payload as { entries: TrackerEntry[] };
      })
      .then((payload) => {
        if (cancelled) return;
        const next: Record<string, TrackerEntry> = {};
        const notes: Record<string, string> = {};
        payload.entries.forEach((entry) => {
          const key = trackerKey(entry.videoId, entry.stepId);
          next[key] = entry;
          notes[key] = entry.note || "";
        });
        setTracking(next);
        setNoteDrafts(notes);
      })
      .catch((error) => !cancelled && setTrackerNotice(error instanceof Error ? error.message : "Workflow tracker could not be loaded."))
      .finally(() => !cancelled && setTrackerLoading(false));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedVideoId && videos[0]) setSelectedVideoId(videos[0].id);
    if (selectedVideoId && !videos.some((video) => video.id === selectedVideoId)) setSelectedVideoId(videos[0]?.id || "");
  }, [videos, selectedVideoId]);

  const selectedVideo = videos.find((video) => video.id === selectedVideoId) || videos[0];

  const selectedStats = useMemo(() => {
    if (!selectedVideo) return { completed: 0, total: workflow.length, requiredCompleted: 0, requiredTotal: workflow.filter((step) => step.required).length };
    const completed = workflow.filter((step) => tracking[trackerKey(selectedVideo.id, step.id)]?.completed).length;
    const required = workflow.filter((step) => step.required);
    const requiredCompleted = required.filter((step) => tracking[trackerKey(selectedVideo.id, step.id)]?.completed).length;
    return { completed, total: workflow.length, requiredCompleted, requiredTotal: required.length };
  }, [selectedVideo, tracking, workflow]);

  function updateStep(index: number, patch: Partial<HistoryWorkflowStep>) {
    setSettings({ ...settings, workflow: workflow.map((step, current) => current === index ? { ...step, ...patch } : step) });
  }

  function addStep() {
    const last = workflow[workflow.length - 1];
    const next: HistoryWorkflowStep = {
      id: `stage-${Date.now()}`,
      name: "New Stage",
      phase: last?.phase || "Production",
      objective: "",
      instructions: "",
      deliverables: "",
      completionCriteria: "",
      aiPrompt: "",
      progress: last?.progress ?? 0,
      required: true,
    };
    setSettings({ ...settings, workflow: [...workflow, next] });
  }

  function removeStep(index: number) {
    const step = workflow[index];
    if (!step || workflow.length <= 1 || SYSTEM_STAGE_IDS.has(step.id)) return;
    const used = videos.filter((video) => video.status === step.name).length;
    if (used) {
      window.alert(`${used} video${used === 1 ? " is" : "s are"} currently in “${step.name}”. Move them to another stage before deleting this stage.`);
      return;
    }
    if (!window.confirm(`Delete workflow stage “${step.name}”?`)) return;
    setSettings({ ...settings, workflow: workflow.filter((_, current) => current !== index) });
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= workflow.length) return;
    const next = [...workflow];
    [next[index], next[target]] = [next[target], next[index]];
    setSettings({ ...settings, workflow: next });
  }

  function restoreDefaults() {
    if (!window.confirm("Restore the default documentary workflow? Your current workflow edits will be replaced after you save.")) return;
    setSettings({ ...settings, workflow: cloneDefaultWorkflow() });
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setTrackerNotice("Copied to clipboard.");
    } catch {
      window.alert("Clipboard access is unavailable in this browser.");
    }
  }

  async function saveTrackerEntry(video: Video, step: HistoryWorkflowStep, completed: boolean, note: string) {
    const key = trackerKey(video.id, step.id);
    setTrackerNotice("Saving workflow progress…");
    try {
      const response = await fetch("/api/history-tracker", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, stepId: step.id, completed, note }),
      });
      const payload = await response.json() as TrackerResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Workflow progress could not be saved.");
      setTracking((current) => ({ ...current, [key]: payload.entry }));
      setNoteDrafts((current) => ({ ...current, [key]: payload.entry.note || "" }));
      Object.assign(video, { status: payload.videoStatus });
      setTrackerNotice(payload.statusNotice || `Saved. ${payload.completedRequired}/${payload.totalRequired} required stages complete.`);
    } catch (error) {
      setTrackerNotice(error instanceof Error ? error.message : "Workflow progress could not be saved.");
    }
  }

  function projectProgress(video: Video) {
    const required = workflow.filter((step) => step.required);
    const done = required.filter((step) => tracking[trackerKey(video.id, step.id)]?.completed).length;
    return { done, total: required.length, percent: required.length ? Math.round((done / required.length) * 100) : 0 };
  }

  return (
    <div className="thaPage thaWorkflowPage">
      <SectionTitle
        title="Workflow"
        subtitle="One master workflow defines the production system. Project Tracker records completion separately for every video, so you can stop and continue later without losing where each project stands."
        action={view === "builder" ? <button className="thaPrimary" onClick={onSave}><Save size={16} /> {saveState === "saving" ? "Saving…" : "Save workflow"}</button> : undefined}
      />

      <div className="thaWorkflowModeTabs">
        <button className={view === "tracker" ? "active" : ""} onClick={() => setView("tracker")}><ListChecks size={15} /> Project Tracker</button>
        <button className={view === "builder" ? "active" : ""} onClick={() => setView("builder")}><GripVertical size={15} /> Workflow Builder</button>
        <button className={view === "handoff" ? "active" : ""} onClick={() => setView("handoff")}><Bot size={15} /> AI Handoff</button>
      </div>

      {view === "tracker" ? (
        <section className="thaWorkflowTracker">
          {!videos.length ? <div className="thaEmpty"><div className="thaEmptyIcon"><ListChecks size={22} /></div><h3>No video projects yet</h3><p>Create a video first. Every video gets its own independent workflow checklist automatically.</p></div> : <>
            <div className="thaTrackerProjectStrip">
              {videos.map((video) => {
                const stats = projectProgress(video);
                return <button key={video.id} className={selectedVideo?.id === video.id ? "active" : ""} onClick={() => setSelectedVideoId(video.id)}>
                  <span><b>{video.id}</b><small>{video.workingTitle || video.finalTitle || "Untitled video"}</small></span>
                  <strong>{stats.percent}%</strong>
                  <i><em style={{ width: `${stats.percent}%` }} /></i>
                </button>;
              })}
            </div>

            {selectedVideo ? <>
              <article className="thaCard thaTrackerHeader">
                <div>
                  <span className="thaChip">{selectedVideo.id}</span>
                  <h2>{selectedVideo.workingTitle || selectedVideo.finalTitle || "Untitled video"}</h2>
                  <p>Current Production Board stage: <strong>{selectedVideo.status}</strong></p>
                </div>
                <div className="thaTrackerMetrics">
                  <span><small>Required</small><strong>{selectedStats.requiredCompleted}/{selectedStats.requiredTotal}</strong></span>
                  <span><small>All stages</small><strong>{selectedStats.completed}/{selectedStats.total}</strong></span>
                  <span><small>Progress</small><strong>{selectedStats.requiredTotal ? Math.round((selectedStats.requiredCompleted / selectedStats.requiredTotal) * 100) : 0}%</strong></span>
                </div>
              </article>

              {trackerNotice ? <div className="thaTrackerNotice">{trackerNotice}</div> : null}
              {trackerLoading ? <div className="thaTrackerNotice">Loading workflow progress…</div> : null}

              <div className="thaTrackerStageList">
                {workflow.map((step, index) => {
                  const key = trackerKey(selectedVideo.id, step.id);
                  const entry = tracking[key];
                  const completed = Boolean(entry?.completed);
                  const note = noteDrafts[key] ?? entry?.note ?? "";
                  return <article className={`thaTrackerStage ${completed ? "done" : ""}`} key={step.id}>
                    <button className="thaTrackerCheck" type="button" onClick={() => void saveTrackerEntry(selectedVideo, step, !completed, note)} aria-label={`${completed ? "Mark incomplete" : "Mark complete"}: ${step.name}`}>
                      {completed ? <Check size={16} /> : <span />}
                    </button>
                    <div className="thaTrackerStageNumber">{String(index + 1).padStart(2, "0")}</div>
                    <div className="thaTrackerStageInfo">
                      <div><strong>{step.name}</strong><span>{step.phase || "General"}{step.required ? " · Required" : " · Optional"}</span></div>
                      <p>{step.objective || "No objective entered."}</p>
                      {completed && entry?.completedAt ? <small><CheckCircle2 size={12} /> Completed {new Date(entry.completedAt).toLocaleString("en-GB")}</small> : null}
                    </div>
                    <div className="thaTrackerStageNote">
                      <label>Progress note</label>
                      <textarea
                        value={note}
                        placeholder="Example: idea approved, thumbnail finished, voiceover exported…"
                        onChange={(event) => setNoteDrafts((current) => ({ ...current, [key]: event.target.value }))}
                        onBlur={() => { if (note !== (entry?.note || "")) void saveTrackerEntry(selectedVideo, step, completed, note); }}
                      />
                    </div>
                  </article>;
                })}
              </div>

              <div className="thaTrackerAiBar">
                <div><Bot size={19} /><span><strong>Continue this project with AI</strong><small>The handoff includes this video's metadata, completed stages, notes and the exact next required stage.</small></span></div>
                <button className="thaSecondary" onClick={() => void copy(buildProjectAiBrief(settings, selectedVideo, tracking))}><Clipboard size={15} /> Copy project AI brief</button>
              </div>
            </> : null}
          </>}
        </section>
      ) : null}

      {view === "builder" ? <>
        <section className="thaCard thaWorkflowRules">
          <div className="thaSectionLine"><div><h2>Global AI operating rules</h2><p>These instructions are included before every workflow stage when you copy or export the AI brief.</p></div></div>
          <Field label="Master instructions"><textarea className="tall" value={settings.aiMasterInstructions} onChange={(event) => setSettings({ ...settings, aiMasterInstructions: event.target.value })} /></Field>
        </section>

        <div className="thaWorkflowToolbar">
          <div><strong>{workflow.length} stages</strong><span>Production Board and Project Tracker use this exact order.</span></div>
          <div><button className="thaSecondary" onClick={restoreDefaults}><RotateCcw size={15} /> Restore defaults</button><button className="thaPrimary" onClick={addStep}><Plus size={15} /> Add stage</button></div>
        </div>

        <div className="thaWorkflowList">
          {workflow.map((step, index) => {
            const inUse = videos.filter((video) => video.status === step.name).length;
            const systemAnchor = SYSTEM_STAGE_IDS.has(step.id);
            return <article className="thaCard thaWorkflowStep" key={step.id}>
              <div className="thaWorkflowStepRail"><GripVertical size={18} /><b>{String(index + 1).padStart(2, "0")}</b><span>{step.progress}%</span></div>
              <div className="thaWorkflowStepBody">
                <div className="thaWorkflowStepHead">
                  <div className="thaWorkflowNameGrid">
                    <Field label="Stage name" hint={systemAnchor ? "System anchor used by Dashboard / Ideas / Analytics / Archive. Keep its name fixed so every section stays connected." : inUse ? `${inUse} video${inUse === 1 ? "" : "s"} currently use this status` : undefined}>
                      <input value={step.name} disabled={systemAnchor} onChange={(event) => updateStep(index, { name: event.target.value })} />
                    </Field>
                    <Field label="Phase"><input value={step.phase} onChange={(event) => updateStep(index, { phase: event.target.value })} /></Field>
                    <Field label="Progress %"><input type="number" min="0" max="100" value={step.progress} onChange={(event) => updateStep(index, { progress: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></Field>
                    <label className="thaWorkflowRequired"><input type="checkbox" checked={step.required} onChange={(event) => updateStep(index, { required: event.target.checked })} /><span><Check size={13} /> Required gate</span></label>
                  </div>
                  <div className="thaWorkflowStepActions">
                    <button className="thaIconButton" disabled={index === 0} onClick={() => moveStep(index, -1)} title="Move up"><ArrowUp size={15} /></button>
                    <button className="thaIconButton" disabled={index === workflow.length - 1} onClick={() => moveStep(index, 1)} title="Move down"><ArrowDown size={15} /></button>
                    <button className="thaIconButton danger" disabled={workflow.length <= 1 || systemAnchor} onClick={() => removeStep(index)} title={systemAnchor ? "System anchor cannot be deleted" : "Delete stage"}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="thaWorkflowFields">
                  <Field label="Objective"><textarea value={step.objective} onChange={(event) => updateStep(index, { objective: event.target.value })} /></Field>
                  <Field label="Instructions"><textarea value={step.instructions} onChange={(event) => updateStep(index, { instructions: event.target.value })} /></Field>
                  <Field label="Deliverables"><textarea value={step.deliverables} onChange={(event) => updateStep(index, { deliverables: event.target.value })} /></Field>
                  <Field label="Completion criteria"><textarea value={step.completionCriteria} onChange={(event) => updateStep(index, { completionCriteria: event.target.value })} /></Field>
                  <Field label="AI instruction / prompt" hint="This prompt is appended to the global operating rules for this stage."><textarea className="tall" value={step.aiPrompt} onChange={(event) => updateStep(index, { aiPrompt: event.target.value })} /></Field>
                </div>
              </div>
            </article>;
          })}
        </div>
      </> : null}

      {view === "handoff" ? <section className="thaCard thaAiHandoff">
        <div className="thaAiHandoffHead">
          <div><Bot size={22} /><span><strong>AI Handoff</strong><small>Use the Markdown brief for ChatGPT / Claude / Gemini. JSON is for structured agents or automation.</small></span></div>
          <div><button className="thaSecondary" onClick={() => void copy(aiBrief)}><Clipboard size={15} /> Copy AI brief</button><button className="thaSecondary" onClick={() => downloadText("the-history-archived-workflow.md", aiBrief, "text/markdown;charset=utf-8")}><Download size={15} /> Markdown</button><button className="thaSecondary" onClick={() => downloadText("the-history-archived-workflow.json", aiJson, "application/json;charset=utf-8")}><Download size={15} /> JSON</button></div>
        </div>
        <pre className="thaWorkflowPreview">{aiBrief}</pre>
      </section> : null}
    </div>
  );
}

export function WorkflowProductionPage({ videos, workflow, onOpen, onStatus, onConfigure }: {
  videos: Video[];
  workflow: HistoryWorkflowStep[];
  onOpen: (video: Video) => void;
  onStatus: (video: Video, status: VideoStatus) => void;
  onConfigure: () => void;
}) {
  const stages = workflow.length ? workflow : cloneDefaultWorkflow();
  return <div className="thaPage"><SectionTitle title="Production Board" subtitle="Every column comes from Workflow Builder. Project Tracker automatically keeps the board on the first incomplete required stage." action={<button className="thaSecondary" onClick={onConfigure}>Edit workflow</button>} />
    {!videos.length ? <div className="thaEmpty"><div className="thaEmptyIcon"><Bot size={24} /></div><h3>Production board is empty</h3><p>The workflow is configured with {stages.length} stages. Create a video first; it will enter the first stage automatically.</p><div className="thaEmptyAction"><button className="thaSecondary" onClick={onConfigure}>Review workflow</button></div></div> : <div className="thaKanban thaWorkflowKanban">{stages.map((stage, index) => { const stageVideos = videos.filter((video) => video.status === stage.name); return <section className="thaKanbanColumn" key={stage.id}><header><span>{String(index + 1).padStart(2, "0")} · {stage.name}</span><b>{stageVideos.length}</b></header><div>{stageVideos.length ? stageVideos.map((video) => <article className="thaKanbanCard" key={video.id}><button onClick={() => onOpen(video)}><small>{video.id} · {video.priority}</small><strong>{video.workingTitle || video.finalTitle || "Untitled video"}</strong></button><select value={video.status} onChange={(event) => onStatus(video, event.target.value)}>{stages.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></article>) : <p>Empty</p>}</div></section>; })}</div>}
  </div>;
}
