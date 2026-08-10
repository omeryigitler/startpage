export type VideoStatus = string;
export type Priority = "P1" | "P2" | "P3" | "P4";
export type VideoFormat = "Long Documentary" | "Short" | "Special";
export type TaskStatus = "To Do" | "Doing" | "Blocked" | "Review" | "Done";

export type HistoryWorkflowStep = {
  id: string;
  name: string;
  phase: string;
  objective: string;
  instructions: string;
  deliverables: string;
  completionCriteria: string;
  aiPrompt: string;
  progress: number;
  required: boolean;
};

export const DEFAULT_HISTORY_WORKFLOW: HistoryWorkflowStep[] = [
  {
    id: "idea",
    name: "Idea",
    phase: "Development",
    objective: "Capture the documentary concept and define the central historical question.",
    instructions: "Define the topic, period, geography, core mystery or conflict, audience promise and why the story matters now.",
    deliverables: "Working title; one-sentence premise; hook; core question; initial audience promise.",
    completionCriteria: "The idea is specific enough to research and has a clear reason for a viewer to click.",
    aiPrompt: "Turn the project input into a concise documentary concept. Do not invent facts. Flag assumptions that require research.",
    progress: 0,
    required: true,
  },
  {
    id: "topic-validation",
    name: "Topic Validation",
    phase: "Development",
    objective: "Decide whether the topic is strong enough to justify full production.",
    instructions: "Assess audience interest, uniqueness, evergreen potential, source availability, visual potential, competition and production difficulty.",
    deliverables: "Validation summary; strengths; risks; differentiation angle; go / revise / reject recommendation.",
    completionCriteria: "The project has a defensible angle, sufficient source potential and a clear production decision.",
    aiPrompt: "Evaluate the topic as a YouTube history documentary opportunity. Separate evidence from assumptions and identify what must be verified next.",
    progress: 5,
    required: true,
  },
  {
    id: "research",
    name: "Research",
    phase: "Editorial",
    objective: "Build a reliable factual foundation for the documentary.",
    instructions: "Collect primary and strong secondary sources, chronology, people, places, disputed claims, quotations, statistics, visual references and rights notes.",
    deliverables: "Source list; research notes; fact ledger; chronology; contradictions; citation requirements.",
    completionCriteria: "Major claims are traceable to sources and unresolved contradictions are explicitly marked.",
    aiPrompt: "Organize the supplied research into a source-grounded evidence pack. Never create a source, quote, date or fact that is not supported by the provided material.",
    progress: 12,
    required: true,
  },
  {
    id: "story-angle",
    name: "Story Angle",
    phase: "Editorial",
    objective: "Choose the narrative lens that turns the research into a compelling story.",
    instructions: "Define the protagonist or central force, dramatic question, tension, reveal structure, emotional stakes and what makes this version different.",
    deliverables: "Story angle; dramatic question; narrative promise; reveal strategy; opening direction.",
    completionCriteria: "The story has one coherent narrative spine and a clear viewer payoff.",
    aiPrompt: "Propose the strongest historically responsible story angle using only the verified research. Prioritize narrative clarity without sensationalizing uncertainty.",
    progress: 20,
    required: true,
  },
  {
    id: "outline",
    name: "Outline",
    phase: "Editorial",
    objective: "Create the complete documentary structure before script writing.",
    instructions: "Plan the cold open, setup, acts or chapters, reveals, transitions, evidence placement, visual opportunities and ending.",
    deliverables: "Beat-by-beat outline with chapter goals, evidence references and intended viewer questions.",
    completionCriteria: "Every section advances the central question and the ending resolves the narrative promise.",
    aiPrompt: "Create a documentary outline from the approved angle and verified evidence. Mark where citations, maps, archival visuals or uncertainty disclosures are needed.",
    progress: 28,
    required: true,
  },
  {
    id: "script-writing",
    name: "Script Writing",
    phase: "Editorial",
    objective: "Write the English narration script for the faceless documentary.",
    instructions: "Write for spoken delivery, maintain historical accuracy, preserve uncertainty, use strong transitions and avoid unsupported dramatization.",
    deliverables: "Complete narration draft with section headings and source markers where needed.",
    completionCriteria: "The script is complete, narratable, structurally aligned with the outline and contains no knowingly unsupported claims.",
    aiPrompt: "Write the documentary script from the approved outline and research. Use natural English narration. Do not invent dialogue, motives, facts or quotations.",
    progress: 38,
    required: true,
  },
  {
    id: "fact-check",
    name: "Fact Check",
    phase: "Editorial",
    objective: "Verify every material factual claim before production proceeds.",
    instructions: "Cross-check names, dates, places, quotations, numbers, causal claims and disputed interpretations against the research library.",
    deliverables: "Fact-check report; corrected script notes; unresolved claims; citation gaps; risk flags.",
    completionCriteria: "Material claims are verified, qualified or removed and unresolved issues are clearly documented.",
    aiPrompt: "Audit the script against the supplied source material line by line. Return unsupported, contradictory, overstated or ambiguous claims before suggesting corrections.",
    progress: 48,
    required: true,
  },
  {
    id: "voiceover",
    name: "Voiceover",
    phase: "Production",
    objective: "Prepare and produce the final narration audio.",
    instructions: "Lock pronunciation, pacing, emphasis, pauses, tone and any AI voice settings. Keep the final audio synchronized with the approved script.",
    deliverables: "Voiceover-ready script; pronunciation notes; final narration audio reference.",
    completionCriteria: "Narration is complete, intelligible, consistent and matches the approved script.",
    aiPrompt: "Prepare the approved script for voiceover with pronunciation and delivery notes. Do not change factual meaning while optimizing spoken flow.",
    progress: 58,
    required: true,
  },
  {
    id: "visual-production",
    name: "Visual Production",
    phase: "Production",
    objective: "Create and organize all primary visual material required by the edit.",
    instructions: "Break the script into visual beats and specify archival material, public-domain assets, AI-generated shots, reenactment-style visuals, documents and inserts.",
    deliverables: "Visual shot list; generation prompts; source links; rights status; approved visual assets.",
    completionCriteria: "Every narration segment has an approved visual plan and rights or AI-generation status is known.",
    aiPrompt: "Convert the approved script into a historically grounded visual plan and production prompts. Never depict an uncertain detail as confirmed without an explicit label.",
    progress: 68,
    required: true,
  },
  {
    id: "maps-graphics",
    name: "Maps / Graphics",
    phase: "Production",
    objective: "Produce maps, timelines, labels and explanatory graphics needed for comprehension.",
    instructions: "Identify geographic movement, territorial change, chronology, relationships, statistics and document details that require visual explanation.",
    deliverables: "Map list; graphic list; labels; timeline data; source references; final graphic assets.",
    completionCriteria: "All explanatory graphics are accurate, legible and consistent with the documentary visual system.",
    aiPrompt: "Specify the maps and graphics needed for the script. Use only verified geography, dates and quantities and state the source basis for each data-driven graphic.",
    progress: 74,
    required: false,
  },
  {
    id: "editing",
    name: "Editing",
    phase: "Post-production",
    objective: "Assemble narration, visuals, music, sound design and graphics into the final documentary cut.",
    instructions: "Build for clarity and retention, remove repetition, maintain factual context, control pacing and verify that visual claims match narration.",
    deliverables: "Rough cut; revision notes; picture lock; audio mix; caption or subtitle master if required.",
    completionCriteria: "The final cut is coherent, technically clean, factually aligned and ready for packaging review.",
    aiPrompt: "Review the edit plan or transcript for pacing, clarity, repetition, continuity and factual mismatch. Return actionable edit notes ordered by priority.",
    progress: 84,
    required: true,
  },
  {
    id: "thumbnail",
    name: "Thumbnail",
    phase: "Packaging",
    objective: "Create a high-clarity thumbnail concept that accurately represents the story.",
    instructions: "Develop multiple concepts with one dominant idea, readable focal hierarchy, minimal text and no misleading historical implication.",
    deliverables: "Thumbnail concepts; image prompts or asset plan; text options; selected final direction.",
    completionCriteria: "The chosen thumbnail is clear at small size, differentiated and truthful to the documentary.",
    aiPrompt: "Create thumbnail concepts based on the documentary's strongest truthful visual promise. Avoid fabricated events, misleading composites or clickbait that contradicts the story.",
    progress: 90,
    required: true,
  },
  {
    id: "youtube-packaging",
    name: "YouTube Packaging",
    phase: "Packaging",
    objective: "Prepare all metadata and viewer-facing text required for publication.",
    instructions: "Finalize title, description, keywords, chapters, tags, pinned comment, CTA, playlist and end-screen destination.",
    deliverables: "Final title; alternatives; description; chapters; tags; pinned comment; CTA; playlist and end-screen plan.",
    completionCriteria: "Metadata is accurate, consistent with the video and ready to paste into YouTube Studio.",
    aiPrompt: "Create the complete YouTube package from the approved documentary. Optimize clarity and discoverability without adding claims not supported by the video.",
    progress: 94,
    required: true,
  },
  {
    id: "legal-copyright-check",
    name: "Legal / Copyright Check",
    phase: "Review",
    objective: "Verify asset rights, citations, disclosure requirements and publication risks.",
    instructions: "Review copyright status, licenses, public-domain claims, AI disclosure, source attribution, risky factual claims and any third-party material.",
    deliverables: "Rights checklist; disclosure decision; unresolved risk list; replacement requirements; clearance status.",
    completionCriteria: "No known unresolved rights or disclosure blocker remains before final review.",
    aiPrompt: "Audit the supplied asset and source records for rights and disclosure risks. Flag uncertainty; do not provide invented legal clearance or assume a license exists.",
    progress: 96,
    required: true,
  },
  {
    id: "final-review",
    name: "Final Review",
    phase: "Review",
    objective: "Perform the final editorial, factual, visual and technical release check.",
    instructions: "Review the final cut, title, thumbnail, metadata, citations, legal status, audio, captions and export settings as one release package.",
    deliverables: "Final QA checklist; blocker list; release approval or revision request.",
    completionCriteria: "All required workflow gates are complete and no release blocker remains.",
    aiPrompt: "Perform a release-readiness review using the supplied project records. Return blockers first, then warnings, then optional improvements.",
    progress: 98,
    required: true,
  },
  {
    id: "scheduled",
    name: "Scheduled",
    phase: "Publishing",
    objective: "Prepare the approved video for its exact publication slot.",
    instructions: "Confirm upload, processing, thumbnail, metadata, visibility, playlist, end screen, subtitles and scheduled date/time.",
    deliverables: "Scheduled publication record and final pre-publish checklist.",
    completionCriteria: "The YouTube upload is fully configured and scheduled for the intended time.",
    aiPrompt: "Generate a concise pre-publish checklist from the project package and identify any missing publishing field.",
    progress: 99,
    required: true,
  },
  {
    id: "published",
    name: "Published",
    phase: "Publishing",
    objective: "Record the live YouTube release and preserve the canonical public link.",
    instructions: "Confirm that the public video is accessible and record the final URL and publication date.",
    deliverables: "Canonical YouTube URL; final publication timestamp; release confirmation.",
    completionCriteria: "A valid live YouTube video URL is stored in the project.",
    aiPrompt: "Create the immediate post-publish verification checklist. Do not claim the video is live unless a valid public URL is supplied.",
    progress: 100,
    required: true,
  },
  {
    id: "performance-review",
    name: "Performance Review",
    phase: "Learning",
    objective: "Turn actual performance data into lessons for future documentaries.",
    instructions: "Review views, CTR, retention, average view duration, watch time, subscribers, impressions, comments and qualitative production observations.",
    deliverables: "Performance summary; what worked; what failed; hypotheses; reusable lessons; next-video actions.",
    completionCriteria: "The review uses real entered metrics and produces concrete lessons for the next production cycle.",
    aiPrompt: "Analyze only the performance data supplied. Distinguish observed results from hypotheses and produce specific lessons for future videos.",
    progress: 100,
    required: true,
  },
  {
    id: "archived",
    name: "Archived",
    phase: "Archive",
    objective: "Close the project while preserving all production knowledge and source records.",
    instructions: "Confirm final files, prompts, sources, analytics, rights notes, lessons and YouTube link are retained and searchable.",
    deliverables: "Complete archived project record.",
    completionCriteria: "The project is closed and all reusable knowledge remains accessible.",
    aiPrompt: "Summarize the completed project into a concise archive record containing the final output, evidence base, reusable assets and key lessons.",
    progress: 100,
    required: true,
  },
];

export const HISTORY_STATUSES: VideoStatus[] = DEFAULT_HISTORY_WORKFLOW.map((step) => step.name);
export const HISTORY_PROGRESS: Record<string, number> = Object.fromEntries(DEFAULT_HISTORY_WORKFLOW.map((step) => [step.name, step.progress]));

export type Video = {
  id: string;
  workingTitle: string;
  finalTitle: string;
  coreTopic: string;
  historicalPeriod: string;
  geography: string;
  seriesId: string;
  format: VideoFormat;
  targetLength: string;
  contentStrategy: string[];
  primaryAudience: string[];
  priority: Priority;
  status: VideoStatus;
  youtubeUrl: string;
  thumbnailUrl: string;
  notes: string;
  contentScore: {
    ctr: number;
    retention: number;
    rpm: number;
    search: number;
    competition: number;
    evergreen: number;
    prodDiff: number;
  };
  checklist: {
    research: boolean;
    script: boolean;
    voice: boolean;
    visuals: boolean;
    edit: boolean;
    packaging: boolean;
    legal: boolean;
    publish: boolean;
  };
  legal: {
    copyrightStatus: "Not Reviewed" | "Review Required" | "Cleared" | "Problem Found";
    aiDisclosure: "Not Required" | "Required" | "Added" | "Review";
    assetRights: "Cleared" | "Partial" | "Unknown" | "Problem";
    factRisk: "Low" | "Medium" | "High";
    sourcesVerified: boolean;
    finalReview: boolean;
  };
  packaging: {
    altTitles: string[];
    thumbConcepts: string[];
    thumbText: string;
    primaryKeyword: string;
    secondaryKeywords: string;
    description: string;
    chapters: string;
    tags: string;
    pinnedComment: string;
    cta: string;
    endScreenTarget: string;
    relatedPlaylist: string;
  };
  dates: { targetPublish: string; finalPublish: string; uploadDate: string };
  ideaBank: {
    hook: string;
    whyClick: string;
    mysteryConflict: string;
    sourceAvailability: string;
    nextVideoConnection: string;
  };
  production: {
    researchNotes: string;
    outline: string;
    scriptNotes: string;
    voiceoverNotes: string;
    visualNotes: string;
    editNotes: string;
  };
  analytics: {
    views30d: string;
    ctr: string;
    avd: string;
    watchHours: string;
    subscribers: string;
    impressions: string;
    workedWell: string;
    improve: string;
    takeaways: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type HistorySource = {
  id: string;
  videoId: string;
  name: string;
  type: string;
  url: string;
  author: string;
  publication: string;
  pubDate: string;
  accessDate: string;
  reliability: string;
  notes: string;
  facts: string;
  quotes: string;
  contradictions: string;
  citationNeeded: boolean;
  usedInScript: boolean;
  publicDomain: boolean;
  license: string;
  rightsNotes: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PromptAsset = {
  id: string;
  videoId: string;
  name: string;
  category: string;
  aiTool: string;
  fullPrompt: string;
  negativePrompt: string;
  aspectRatio: string;
  historicalPeriod: string;
  location: string;
  visualStyle: string;
  outputLink: string;
  approved: boolean;
  reusable: boolean;
  qualityRating: number;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HistoryTask = {
  id: string;
  videoId: string;
  title: string;
  department: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HistorySeries = {
  id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowEvent = {
  id: string;
  videoId: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
};

export type HistorySettings = {
  channelName: string;
  youtubeChannelUrl: string;
  timezone: string;
  defaultFormat: VideoFormat;
  aiMasterInstructions: string;
  workflow: HistoryWorkflowStep[];
};

export type HistoryBootstrap = {
  videos: Video[];
  sources: HistorySource[];
  prompts: PromptAsset[];
  tasks: HistoryTask[];
  series: HistorySeries[];
  workflowEvents: WorkflowEvent[];
  settings: HistorySettings;
};

export const EMPTY_VIDEO_FIELDS = {
  contentScore: { ctr: 0, retention: 0, rpm: 0, search: 0, competition: 0, evergreen: 0, prodDiff: 0 },
  checklist: { research: false, script: false, voice: false, visuals: false, edit: false, packaging: false, legal: false, publish: false },
  legal: {
    copyrightStatus: "Not Reviewed" as const,
    aiDisclosure: "Not Required" as const,
    assetRights: "Unknown" as const,
    factRisk: "Low" as const,
    sourcesVerified: false,
    finalReview: false,
  },
  packaging: {
    altTitles: [] as string[],
    thumbConcepts: [] as string[],
    thumbText: "",
    primaryKeyword: "",
    secondaryKeywords: "",
    description: "",
    chapters: "",
    tags: "",
    pinnedComment: "",
    cta: "",
    endScreenTarget: "",
    relatedPlaylist: "",
  },
  dates: { targetPublish: "", finalPublish: "", uploadDate: "" },
  ideaBank: { hook: "", whyClick: "", mysteryConflict: "", sourceAvailability: "", nextVideoConnection: "" },
  production: { researchNotes: "", outline: "", scriptNotes: "", voiceoverNotes: "", visualNotes: "", editNotes: "" },
  analytics: {
    views30d: "",
    ctr: "",
    avd: "",
    watchHours: "",
    subscribers: "",
    impressions: "",
    workedWell: "",
    improve: "",
    takeaways: "",
  },
};

export const DEFAULT_HISTORY_SETTINGS: HistorySettings = {
  channelName: "The History Archived",
  youtubeChannelUrl: "",
  timezone: "Europe/Malta",
  defaultFormat: "Long Documentary",
  aiMasterInstructions: "Act as the production team for an English-language faceless history documentary channel. Work through the workflow in order. Never invent sources, quotations, dates, facts, rights status or performance data. Separate verified facts from uncertainty, preserve source references, flag missing information, and produce only the deliverables requested for the current stage unless explicitly asked for the complete project.",
  workflow: DEFAULT_HISTORY_WORKFLOW,
};

export function getWorkflowProgress(status: string, workflow: HistoryWorkflowStep[] = DEFAULT_HISTORY_WORKFLOW) {
  return workflow.find((step) => step.name === status)?.progress ?? HISTORY_PROGRESS[status] ?? 0;
}

export function getYouTubeVideoId(url: string) {
  const value = (url || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
    }
  } catch {}
  return "";
}

export function getYouTubeEmbedUrl(url: string) {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
}
