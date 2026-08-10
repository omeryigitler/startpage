import { neon } from "@neondatabase/serverless";
import {
  DEFAULT_HISTORY_SETTINGS,
  EMPTY_VIDEO_FIELDS,
  type HistorySeries,
  type HistorySettings,
  type HistorySource,
  type HistoryTask,
  type HistoryWorkflowStep,
  type PromptAsset,
  type Video,
  type WorkflowEvent,
} from "./history-model";

let schemaReady: Promise<void> | null = null;

export function historyDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function historyDb() {
  const connectionString = historyDatabaseUrl();
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  return neon(connectionString);
}

export async function ensureHistorySchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const sql = historyDb();
    await sql`CREATE SEQUENCE IF NOT EXISTS history_video_public_id_seq START WITH 1`;
    await sql`CREATE TABLE IF NOT EXISTS history_series (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS history_videos (
      id TEXT PRIMARY KEY,
      working_title TEXT NOT NULL DEFAULT '',
      final_title TEXT NOT NULL DEFAULT '',
      core_topic TEXT NOT NULL DEFAULT '',
      historical_period TEXT NOT NULL DEFAULT '',
      geography TEXT NOT NULL DEFAULT '',
      series_id TEXT REFERENCES history_series(id) ON DELETE SET NULL,
      format TEXT NOT NULL DEFAULT 'Long Documentary',
      target_length TEXT NOT NULL DEFAULT '',
      content_strategy JSONB NOT NULL DEFAULT '[]'::jsonb,
      primary_audience JSONB NOT NULL DEFAULT '[]'::jsonb,
      priority TEXT NOT NULL DEFAULT 'P2',
      status TEXT NOT NULL DEFAULT 'Idea',
      youtube_url TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      content_score JSONB NOT NULL DEFAULT '{}'::jsonb,
      checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
      legal JSONB NOT NULL DEFAULT '{}'::jsonb,
      packaging JSONB NOT NULL DEFAULT '{}'::jsonb,
      dates JSONB NOT NULL DEFAULT '{}'::jsonb,
      idea_bank JSONB NOT NULL DEFAULT '{}'::jsonb,
      production JSONB NOT NULL DEFAULT '{}'::jsonb,
      analytics JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS history_videos_status_idx ON history_videos(status)`;
    await sql`CREATE INDEX IF NOT EXISTS history_videos_series_idx ON history_videos(series_id)`;
    await sql`CREATE INDEX IF NOT EXISTS history_videos_updated_idx ON history_videos(updated_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS history_sources (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL REFERENCES history_videos(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      publication TEXT NOT NULL DEFAULT '',
      pub_date TEXT NOT NULL DEFAULT '',
      access_date TEXT NOT NULL DEFAULT '',
      reliability TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      facts TEXT NOT NULL DEFAULT '',
      quotes TEXT NOT NULL DEFAULT '',
      contradictions TEXT NOT NULL DEFAULT '',
      citation_needed BOOLEAN NOT NULL DEFAULT FALSE,
      used_in_script BOOLEAN NOT NULL DEFAULT FALSE,
      public_domain BOOLEAN NOT NULL DEFAULT FALSE,
      license TEXT NOT NULL DEFAULT '',
      rights_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS history_sources_video_idx ON history_sources(video_id)`;
    await sql`CREATE TABLE IF NOT EXISTS history_prompt_assets (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL REFERENCES history_videos(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      ai_tool TEXT NOT NULL DEFAULT '',
      full_prompt TEXT NOT NULL DEFAULT '',
      negative_prompt TEXT NOT NULL DEFAULT '',
      aspect_ratio TEXT NOT NULL DEFAULT '',
      historical_period TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      visual_style TEXT NOT NULL DEFAULT '',
      output_link TEXT NOT NULL DEFAULT '',
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      reusable BOOLEAN NOT NULL DEFAULT FALSE,
      quality_rating INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS history_assets_video_idx ON history_prompt_assets(video_id)`;
    await sql`CREATE TABLE IF NOT EXISTS history_tasks (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL REFERENCES history_videos(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'To Do',
      priority TEXT NOT NULL DEFAULT 'P2',
      due_date DATE,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS history_tasks_video_idx ON history_tasks(video_id)`;
    await sql`CREATE INDEX IF NOT EXISTS history_tasks_status_idx ON history_tasks(status)`;
    await sql`CREATE INDEX IF NOT EXISTS history_tasks_due_idx ON history_tasks(due_date)`;
    await sql`CREATE TABLE IF NOT EXISTS history_workflow_events (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL REFERENCES history_videos(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS history_workflow_events_video_idx ON history_workflow_events(video_id, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS history_settings (
      id TEXT PRIMARY KEY DEFAULT 'main',
      channel_name TEXT NOT NULL DEFAULT 'The History Archived',
      youtube_channel_url TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'Europe/Malta',
      default_format TEXT NOT NULL DEFAULT 'Long Documentary',
      ai_master_instructions TEXT NOT NULL DEFAULT '',
      workflow JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE history_settings ADD COLUMN IF NOT EXISTS ai_master_instructions TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE history_settings ADD COLUMN IF NOT EXISTS workflow JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await sql`INSERT INTO history_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING`;
    await sql.query(
      `UPDATE history_settings SET ai_master_instructions = $2 WHERE id = $1 AND COALESCE(ai_master_instructions, '') = ''`,
      ["main", DEFAULT_HISTORY_SETTINGS.aiMasterInstructions],
    );
    await sql.query(
      `UPDATE history_settings SET workflow = $2::jsonb WHERE id = $1 AND (workflow IS NULL OR jsonb_typeof(workflow) <> 'array' OR jsonb_array_length(workflow) = 0)`,
      ["main", JSON.stringify(DEFAULT_HISTORY_SETTINGS.workflow)],
    );
    await sql`DROP TABLE IF EXISTS history_workspace_state`;
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function mergeObject<T extends object>(defaults: T, value: unknown): T {
  return { ...defaults, ...(value && typeof value === "object" ? (value as Partial<T>) : {}) };
}

export function mapHistoryVideo(row: any): Video {
  return {
    id: row.id,
    workingTitle: row.working_title || "",
    finalTitle: row.final_title || "",
    coreTopic: row.core_topic || "",
    historicalPeriod: row.historical_period || "",
    geography: row.geography || "",
    seriesId: row.series_id || "",
    format: row.format || "Long Documentary",
    targetLength: row.target_length || "",
    contentStrategy: Array.isArray(row.content_strategy) ? row.content_strategy : [],
    primaryAudience: Array.isArray(row.primary_audience) ? row.primary_audience : [],
    priority: row.priority || "P2",
    status: row.status || "Idea",
    youtubeUrl: row.youtube_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    notes: row.notes || "",
    contentScore: mergeObject(EMPTY_VIDEO_FIELDS.contentScore, row.content_score),
    checklist: mergeObject(EMPTY_VIDEO_FIELDS.checklist, row.checklist),
    legal: mergeObject(EMPTY_VIDEO_FIELDS.legal, row.legal),
    packaging: mergeObject(EMPTY_VIDEO_FIELDS.packaging, row.packaging),
    dates: mergeObject(EMPTY_VIDEO_FIELDS.dates, row.dates),
    ideaBank: mergeObject(EMPTY_VIDEO_FIELDS.ideaBank, row.idea_bank),
    production: mergeObject(EMPTY_VIDEO_FIELDS.production, row.production),
    analytics: mergeObject(EMPTY_VIDEO_FIELDS.analytics, row.analytics),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Video;
}

export function mapHistorySource(row: any): HistorySource {
  return {
    id: row.id,
    videoId: row.video_id,
    name: row.name || "",
    type: row.type || "",
    url: row.url || "",
    author: row.author || "",
    publication: row.publication || "",
    pubDate: row.pub_date || "",
    accessDate: row.access_date || "",
    reliability: row.reliability || "",
    notes: row.notes || "",
    facts: row.facts || "",
    quotes: row.quotes || "",
    contradictions: row.contradictions || "",
    citationNeeded: Boolean(row.citation_needed),
    usedInScript: Boolean(row.used_in_script),
    publicDomain: Boolean(row.public_domain),
    license: row.license || "",
    rightsNotes: row.rights_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHistoryAsset(row: any): PromptAsset {
  return {
    id: row.id,
    videoId: row.video_id,
    name: row.name || "",
    category: row.category || "",
    aiTool: row.ai_tool || "",
    fullPrompt: row.full_prompt || "",
    negativePrompt: row.negative_prompt || "",
    aspectRatio: row.aspect_ratio || "",
    historicalPeriod: row.historical_period || "",
    location: row.location || "",
    visualStyle: row.visual_style || "",
    outputLink: row.output_link || "",
    approved: Boolean(row.approved),
    reusable: Boolean(row.reusable),
    qualityRating: Number(row.quality_rating || 0),
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHistoryTask(row: any): HistoryTask {
  return {
    id: row.id,
    videoId: row.video_id,
    title: row.title || "",
    department: row.department || "",
    status: row.status || "To Do",
    priority: row.priority || "P2",
    dueDate: row.due_date ? String(row.due_date).slice(0, 10) : "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHistorySeries(row: any): HistorySeries {
  return { id: row.id, name: row.name || "", description: row.description || "", createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapHistoryEvent(row: any): WorkflowEvent {
  return { id: row.id, videoId: row.video_id, fromStatus: row.from_status || "", toStatus: row.to_status || "", createdAt: row.created_at };
}

function validWorkflow(value: unknown): value is HistoryWorkflowStep[] {
  return Array.isArray(value) && value.length > 0 && value.every((step) => step && typeof step === "object" && typeof (step as HistoryWorkflowStep).name === "string");
}

export function mapHistorySettings(row: any): HistorySettings {
  if (!row) return DEFAULT_HISTORY_SETTINGS;
  return {
    channelName: row.channel_name || DEFAULT_HISTORY_SETTINGS.channelName,
    youtubeChannelUrl: row.youtube_channel_url || "",
    timezone: row.timezone || DEFAULT_HISTORY_SETTINGS.timezone,
    defaultFormat: row.default_format || DEFAULT_HISTORY_SETTINGS.defaultFormat,
    aiMasterInstructions: row.ai_master_instructions || DEFAULT_HISTORY_SETTINGS.aiMasterInstructions,
    workflow: validWorkflow(row.workflow) ? row.workflow : DEFAULT_HISTORY_SETTINGS.workflow,
  };
}
