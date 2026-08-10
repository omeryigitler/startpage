export type VideoStatus =
  | "Idea"
  | "Topic Validation"
  | "Research"
  | "Story Angle"
  | "Outline"
  | "Script Writing"
  | "Fact Check"
  | "Voiceover"
  | "Visual Production"
  | "Maps / Graphics"
  | "Editing"
  | "Thumbnail"
  | "YouTube Packaging"
  | "Legal / Copyright Check"
  | "Final Review"
  | "Scheduled"
  | "Published"
  | "Performance Review"
  | "Archived";

export type Priority = "P1" | "P2" | "P3" | "P4";
export type VideoFormat = "Long Documentary" | "Short" | "Special";
export type TaskStatus = "To Do" | "Doing" | "Blocked" | "Review" | "Done";

export const HISTORY_STATUSES: VideoStatus[] = [
  "Idea",
  "Topic Validation",
  "Research",
  "Story Angle",
  "Outline",
  "Script Writing",
  "Fact Check",
  "Voiceover",
  "Visual Production",
  "Maps / Graphics",
  "Editing",
  "Thumbnail",
  "YouTube Packaging",
  "Legal / Copyright Check",
  "Final Review",
  "Scheduled",
  "Published",
  "Performance Review",
  "Archived",
];

export const HISTORY_PROGRESS: Record<VideoStatus, number> = {
  Idea: 0,
  "Topic Validation": 5,
  Research: 12,
  "Story Angle": 20,
  Outline: 28,
  "Script Writing": 38,
  "Fact Check": 48,
  Voiceover: 58,
  "Visual Production": 68,
  "Maps / Graphics": 74,
  Editing: 84,
  Thumbnail: 90,
  "YouTube Packaging": 94,
  "Legal / Copyright Check": 96,
  "Final Review": 98,
  Scheduled: 99,
  Published: 100,
  "Performance Review": 100,
  Archived: 100,
};

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
};

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
