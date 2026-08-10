import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GATEWAY_SESSION_COOKIE, verifyGatewaySession } from "../../../lib/gateway-session";

export const dynamic = "force-dynamic";

const STATE_ID = "main";
type PhaseId = "research" | "packaging" | "script" | "production" | "review" | "upload";
type WorkflowStep = {
  id: string;
  phase: PhaseId;
  title: string;
  completed: boolean;
  completedAt: string | null;
  required: boolean;
  active: boolean;
};
type HistoryWorkspaceState = { version: 3; videoTitle: string; workflow: WorkflowStep[] };
type StoredRow = { state: unknown; updated_at: string };

const PHASE_IDS = new Set<PhaseId>(["research", "packaging", "script", "production", "review", "upload"]);
const BASE_STEPS: Array<Omit<WorkflowStep, "completed" | "completedAt">> = [
  ["research-1", "research", "Collect current, reliable Roanoke sources", true],
  ["research-2", "research", "Build the verified event chronology", true],
  ["research-3", "research", "Map the leading historical theories", true],
  ["research-4", "research", "Review current archaeological evidence", true],
  ["research-5", "research", "Separate established facts from disputed claims", true],
  ["packaging-6", "packaging", "Create 10 title alternatives", true],
  ["packaging-7", "packaging", "Select the strongest 3 titles", true],
  ["packaging-8", "packaging", "Develop thumbnail concepts", true],
  ["packaging-9", "packaging", "Lock the final video angle and story promise", true],
  ["script-10", "script", "Draft hook options", true],
  ["script-11", "script", "Build the narrative outline", true],
  ["script-12", "script", "Write the final 9–12 minute English script", true],
  ["script-13", "script", "Run final fact-check and source pass", true],
  ["production-14", "production", "Build the scene-by-scene shot list", true],
  ["production-15", "production", "Write AI image prompts", true],
  ["production-16", "production", "Write AI video prompts where needed", false],
  ["production-17", "production", "Plan maps and timeline graphics", true],
  ["production-18", "production", "Plan music and sound design", true],
  ["review-26", "review", "Verify citations and disputed historical claims", true],
  ["review-27", "review", "Clear archive footage, images, and asset rights", true],
  ["review-28", "review", "Confirm music and sound licenses", true],
  ["review-29", "review", "Review YouTube altered / synthetic content disclosure", true],
  ["review-30", "review", "Complete final video and channel-safety QA", true],
  ["upload-19", "upload", "Lock the final YouTube title", true],
  ["upload-20", "upload", "Export the final thumbnail", true],
  ["upload-21", "upload", "Write the description and source list", true],
  ["upload-22", "upload", "Add chapters", true],
  ["upload-23", "upload", "Add tags and keyword variants", false],
  ["upload-24", "upload", "Write the pinned comment", true],
  ["upload-25", "upload", "Configure the end screen and next-video bridge", true],
].map(([id, phase, title, required]) => ({
  id: id as string,
  phase: phase as PhaseId,
  title: title as string,
  required: required as boolean,
  active: true,
}));

const LEGACY_TITLES: Record<string, string> = {
  "Roanoke hakkında güncel ve güvenilir kaynak araştırması": "Collect current, reliable Roanoke sources",
  "Doğrulanmış olayların kronolojisi": "Build the verified event chronology",
  "Ana teoriler": "Map the leading historical theories",
  "Güncel arkeolojik kanıtlar": "Review current archaeological evidence",
  "Güvenilir ve tartışmalı iddiaların ayrımı": "Separate established facts from disputed claims",
  "10 başlık alternatifi": "Create 10 title alternatives",
  "En güçlü 3 başlık": "Select the strongest 3 titles",
  "Thumbnail konseptleri": "Develop thumbnail concepts",
  "Final video angle / story promise": "Lock the final video angle and story promise",
  "Hook seçenekleri": "Draft hook options",
  "Ayrıntılı narrative outline": "Build the narrative outline",
  "9–12 dakikalık final İngilizce senaryo": "Write the final 9–12 minute English script",
  "Fact-check": "Run final fact-check and source pass",
  "Sahne sahne shot list": "Build the scene-by-scene shot list",
  "AI image prompts": "Write AI image prompts",
  "Gerekirse AI video prompts": "Write AI video prompts where needed",
  "Harita / timeline planı": "Plan maps and timeline graphics",
  "Müzik ve SFX planı": "Plan music and sound design",
  "Final title": "Lock the final YouTube title",
  "Final thumbnail": "Export the final thumbnail",
  "Description": "Write the description and source list",
  "Chapters": "Add chapters",
  "Tags / keywords": "Add tags and keyword variants",
  "Pinned comment": "Write the pinned comment",
  "End-screen / ikinci video geçişi": "Configure the end screen and next-video bridge",
};

const DEFAULT_STATE: HistoryWorkspaceState = {
  version: 3,
  videoTitle: "The Lost Colony of Roanoke",
  workflow: BASE_STEPS.map((step) => ({ ...step, completed: step.phase === "research", completedAt: null })),
};

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function normalizeState(value: unknown): HistoryWorkspaceState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as { version?: unknown; videoTitle?: unknown; workflow?: unknown };
  const sourceVersion = typeof state.version === "number" ? state.version : 1;
  if (typeof state.videoTitle !== "string" || state.videoTitle.trim().length === 0 || state.videoTitle.length > 200) return null;
  if (!Array.isArray(state.workflow) || state.workflow.length > 120) return null;

  const ids = new Set<string>();
  const workflow: WorkflowStep[] = [];
  for (const raw of state.workflow) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Partial<WorkflowStep> & { phase?: string };
    if (typeof item.id !== "string" || item.id.length === 0 || item.id.length > 120 || ids.has(item.id)) return null;
    if (typeof item.phase !== "string" || !PHASE_IDS.has(item.phase as PhaseId)) return null;
    if (typeof item.title !== "string" || item.title.trim().length === 0 || item.title.length > 200) return null;
    if (typeof item.completed !== "boolean") return null;
    if (item.completedAt !== undefined && item.completedAt !== null && typeof item.completedAt !== "string") return null;
    if (typeof item.completedAt === "string" && item.completedAt.length > 60) return null;
    if (item.required !== undefined && typeof item.required !== "boolean") return null;
    if (item.active !== undefined && typeof item.active !== "boolean") return null;
    ids.add(item.id);
    workflow.push({
      id: item.id,
      phase: item.phase as PhaseId,
      title: LEGACY_TITLES[item.title.trim()] ?? item.title.trim(),
      completed: item.completed,
      completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
      required: typeof item.required === "boolean" ? item.required : true,
      active: typeof item.active === "boolean" ? item.active : true,
    });
  }

  if (sourceVersion < 3) {
    const reviewSteps = BASE_STEPS.filter((step) => step.phase === "review");
    const firstUpload = workflow.findIndex((step) => step.phase === "upload");
    const insertAt = firstUpload >= 0 ? firstUpload : workflow.length;
    const missing = reviewSteps
      .filter((step) => !ids.has(step.id))
      .map((step) => ({ ...step, completed: false, completedAt: null }));
    workflow.splice(insertAt, 0, ...missing);
  }

  return { version: 3, videoTitle: state.videoTitle.trim(), workflow };
}

async function authorized() {
  const cookieStore = await cookies();
  return verifyGatewaySession(cookieStore.get(GATEWAY_SESSION_COOKIE)?.value);
}

async function ensureState(createIfMissing: boolean) {
  const connectionString = databaseUrl();
  if (!connectionString) return null;
  const sql = neon(connectionString);
  await sql`CREATE TABLE IF NOT EXISTS history_workspace_state (id TEXT PRIMARY KEY, state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  if (createIfMissing) {
    await sql.query(
      `INSERT INTO history_workspace_state (id, state) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
      [STATE_ID, JSON.stringify(DEFAULT_STATE)],
    );
  }
  const rows = (await sql.query(
    `SELECT state, updated_at FROM history_workspace_state WHERE id = $1 LIMIT 1`,
    [STATE_ID],
  )) as StoredRow[];
  return { sql, row: rows[0] };
}

export async function GET() {
  try {
    if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const store = await ensureState(true);
    if (!store?.row) {
      return NextResponse.json(
        { state: DEFAULT_STATE, setupRequired: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const normalized = normalizeState(store.row.state) ?? DEFAULT_STATE;
    return NextResponse.json(
      { state: normalized, updatedAt: store.row.updated_at, setupRequired: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("History state GET failed", error);
    return NextResponse.json(
      { state: DEFAULT_STATE, setupRequired: true, error: "Persistent workflow data could not be read." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await authorized())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = (await request.json()) as { state?: unknown };
    const normalized = normalizeState(body.state);
    if (!normalized) return NextResponse.json({ error: "Invalid workflow data." }, { status: 400 });
    const store = await ensureState(true);
    if (!store?.row) return NextResponse.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
    const rows = (await store.sql.query(
      `UPDATE history_workspace_state SET state = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING state, updated_at`,
      [STATE_ID, JSON.stringify(normalized)],
    )) as StoredRow[];
    return NextResponse.json(
      { ok: true, state: normalizeState(rows[0].state) ?? normalized, updatedAt: rows[0].updated_at },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("History state PUT failed", error);
    return NextResponse.json({ error: "Workflow save failed." }, { status: 500 });
  }
}
