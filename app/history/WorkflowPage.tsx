"use client";

import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  Clipboard,
  Download,
  GripVertical,
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

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <header className="thaSectionHeader"><div><p className="thaEyebrow">THE HISTORY ARCHIVED</p><h1>{title}</h1>{subtitle ? <p className="thaSubtitle">{subtitle}</p> : null}</div>{action ? <div className="thaHeaderAction">{action}</div> : null}</header>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="thaField"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

function cloneDefaultWorkflow() {
  return DEFAULT_HISTORY_WORKFLOW.map((step) => ({ ...step }));
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
    executionRule: "Follow the workflow in order. For each stage, use only the supplied project information and verified source material. Return the defined deliverables, check the completion criteria, identify missing information, and do not silently advance past an incomplete required stage.",
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
      "Objective:",
      step.objective || "[DEFINE OBJECTIVE]",
      "",
      "Instructions:",
      step.instructions || "[DEFINE INSTRUCTIONS]",
      "",
      "Deliverables:",
      step.deliverables || "[DEFINE DELIVERABLES]",
      "",
      "Completion criteria:",
      step.completionCriteria || "[DEFINE COMPLETION CRITERIA]",
      "",
      "AI instruction:",
      step.aiPrompt || "[DEFINE AI INSTRUCTION]",
    );
  });

  lines.push(
    "",
    "## FINAL RESPONSE CONTRACT",
    "For every stage return: (1) stage name, (2) completed deliverables, (3) evidence/source gaps, (4) risks or unresolved questions, (5) completion status, and (6) the exact inputs needed for the next stage.",
  );

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

export function WorkflowPage({
  settings,
  videos,
  setSettings,
  onSave,
  saveState,
}: {
  settings: HistorySettings;
  videos: Video[];
  setSettings: (settings: HistorySettings) => void;
  onSave: () => void;
  saveState: SaveState;
}) {
  const workflow = settings.workflow || [];
  const aiBrief = buildAiWorkflowBrief(settings);
  const aiJson = JSON.stringify(buildAiWorkflowJson(settings), null, 2);

  function updateStep(index: number, patch: Partial<HistoryWorkflowStep>) {
    setSettings({
      ...settings,
      workflow: workflow.map((step, current) => current === index ? { ...step, ...patch } : step),
    });
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
    if (!step || workflow.length <= 1) return;
    const used = videos.filter((video) => video.status === step.name).length;
    if (used) {
      window.alert(`${used} video${used === 1 ? " is" : "s are"} currently in “${step.name}”. Move them to another stage before deleting or renaming this stage.`);
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
      window.alert("Copied to clipboard.");
    } catch {
      window.alert("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <div className="thaPage thaWorkflowPage">
      <SectionTitle
        title="Workflow Builder"
        subtitle="This is the single source of truth for the Production Board. Add, remove, reorder and define every stage, then export the same structure as an AI-ready master production brief."
        action={<button className="thaPrimary" onClick={onSave}><Save size={16} /> {saveState === "saving" ? "Saving…" : "Save workflow"}</button>}
      />

      <section className="thaCard thaWorkflowRules">
        <div className="thaSectionLine"><div><h2>Global AI operating rules</h2><p>These instructions are included before every workflow stage when you copy or export the AI brief.</p></div></div>
        <Field label="Master instructions">
          <textarea className="tall" value={settings.aiMasterInstructions} onChange={(event) => setSettings({ ...settings, aiMasterInstructions: event.target.value })} />
        </Field>
      </section>

      <div className="thaWorkflowToolbar">
        <div><strong>{workflow.length} stages</strong><span>Production uses this exact order.</span></div>
        <div>
          <button className="thaSecondary" onClick={restoreDefaults}><RotateCcw size={15} /> Restore defaults</button>
          <button className="thaPrimary" onClick={addStep}><Plus size={15} /> Add stage</button>
        </div>
      </div>

      <div className="thaWorkflowList">
        {workflow.map((step, index) => {
          const inUse = videos.filter((video) => video.status === step.name).length;
          return (
            <article className="thaCard thaWorkflowStep" key={step.id}>
              <div className="thaWorkflowStepRail">
                <GripVertical size={18} />
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{step.progress}%</span>
              </div>
              <div className="thaWorkflowStepBody">
                <div className="thaWorkflowStepHead">
                  <div className="thaWorkflowNameGrid">
                    <Field label="Stage name" hint={inUse ? `${inUse} video${inUse === 1 ? "" : "s"} currently use this status` : undefined}>
                      <input value={step.name} onChange={(event) => updateStep(index, { name: event.target.value })} />
                    </Field>
                    <Field label="Phase"><input value={step.phase} onChange={(event) => updateStep(index, { phase: event.target.value })} /></Field>
                    <Field label="Progress %"><input type="number" min="0" max="100" value={step.progress} onChange={(event) => updateStep(index, { progress: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></Field>
                    <label className="thaWorkflowRequired"><input type="checkbox" checked={step.required} onChange={(event) => updateStep(index, { required: event.target.checked })} /><span><Check size={13} /> Required gate</span></label>
                  </div>
                  <div className="thaWorkflowStepActions">
                    <button className="thaIconButton" disabled={index === 0} onClick={() => moveStep(index, -1)} title="Move up"><ArrowUp size={15} /></button>
                    <button className="thaIconButton" disabled={index === workflow.length - 1} onClick={() => moveStep(index, 1)} title="Move down"><ArrowDown size={15} /></button>
                    <button className="thaIconButton danger" disabled={workflow.length <= 1} onClick={() => removeStep(index)} title="Delete stage"><Trash2 size={15} /></button>
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
            </article>
          );
        })}
      </div>

      <section className="thaCard thaAiHandoff">
        <div className="thaAiHandoffHead">
          <div><Bot size={22} /><span><strong>AI Handoff</strong><small>Use the Markdown brief for ChatGPT / Claude / Gemini. Use JSON when another system or agent needs a structured workflow.</small></span></div>
          <div>
            <button className="thaSecondary" onClick={() => void copy(aiBrief)}><Clipboard size={15} /> Copy AI brief</button>
            <button className="thaSecondary" onClick={() => downloadText("the-history-archived-workflow.md", aiBrief, "text/markdown;charset=utf-8")}><Download size={15} /> Markdown</button>
            <button className="thaSecondary" onClick={() => downloadText("the-history-archived-workflow.json", aiJson, "application/json;charset=utf-8")}><Download size={15} /> JSON</button>
          </div>
        </div>
        <textarea className="thaWorkflowPreview" readOnly value={aiBrief} />
      </section>
    </div>
  );
}

export function WorkflowProductionPage({
  videos,
  workflow,
  onOpen,
  onStatus,
  onConfigure,
}: {
  videos: Video[];
  workflow: HistoryWorkflowStep[];
  onOpen: (video: Video) => void;
  onStatus: (video: Video, status: VideoStatus) => void;
  onConfigure: () => void;
}) {
  const stages = workflow.length ? workflow : cloneDefaultWorkflow();

  return (
    <div className="thaPage">
      <SectionTitle
        title="Production Board"
        subtitle="Every column comes from Workflow Builder. Reordering or editing the workflow changes this board after the workflow is saved."
        action={<button className="thaSecondary" onClick={onConfigure}>Edit workflow</button>}
      />
      {!videos.length ? (
        <div className="thaEmpty">
          <div className="thaEmptyIcon"><Bot size={24} /></div>
          <h3>Production board is empty</h3>
          <p>The workflow is configured with {stages.length} stages. Create a video first; it will enter the first stage automatically.</p>
          <div className="thaEmptyAction"><button className="thaSecondary" onClick={onConfigure}>Review workflow</button></div>
        </div>
      ) : (
        <div className="thaKanban thaWorkflowKanban">
          {stages.map((stage, index) => {
            const stageVideos = videos.filter((video) => video.status === stage.name);
            return (
              <section className="thaKanbanColumn" key={stage.id}>
                <header><span>{String(index + 1).padStart(2, "0")} · {stage.name}</span><b>{stageVideos.length}</b></header>
                <div>
                  {stageVideos.length ? stageVideos.map((video) => (
                    <article className="thaKanbanCard" key={video.id}>
                      <button onClick={() => onOpen(video)}><small>{video.id} · {video.priority}</small><strong>{video.workingTitle || video.finalTitle || "Untitled video"}</strong></button>
                      <select value={video.status} onChange={(event) => onStatus(video, event.target.value)}>
                        {stages.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}
                      </select>
                    </article>
                  )) : <p>Empty</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
