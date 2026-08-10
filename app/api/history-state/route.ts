import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GATEWAY_SESSION_COOKIE, verifyGatewaySession } from "../../../lib/gateway-session";

export const dynamic = "force-dynamic";

const STATE_ID = "main";
type PhaseId = "research" | "packaging" | "script" | "production" | "upload";
type WorkflowStep = {
  id: string;
  phase: PhaseId;
  title: string;
  completed: boolean;
  completedAt: string | null;
  required: boolean;
  active: boolean;
};
type HistoryWorkspaceState = { version: 2; videoTitle: string; workflow: WorkflowStep[] };
type StoredRow = { state: unknown; updated_at: string };

const PHASE_IDS = new Set<PhaseId>(["research", "packaging", "script", "production", "upload"]);
const BASE_STEPS: Array<Omit<WorkflowStep, "completed" | "completedAt">> = [
  ["research-1", "research", "Roanoke hakkında güncel ve güvenilir kaynak araştırması", true],
  ["research-2", "research", "Doğrulanmış olayların kronolojisi", true],
  ["research-3", "research", "Ana teoriler", true],
  ["research-4", "research", "Güncel arkeolojik kanıtlar", true],
  ["research-5", "research", "Güvenilir ve tartışmalı iddiaların ayrımı", true],
  ["packaging-6", "packaging", "10 başlık alternatifi", true],
  ["packaging-7", "packaging", "En güçlü 3 başlık", true],
  ["packaging-8", "packaging", "Thumbnail konseptleri", true],
  ["packaging-9", "packaging", "Final video angle / story promise", true],
  ["script-10", "script", "Hook seçenekleri", true],
  ["script-11", "script", "Ayrıntılı narrative outline", true],
  ["script-12", "script", "9–12 dakikalık final İngilizce senaryo", true],
  ["script-13", "script", "Fact-check", true],
  ["production-14", "production", "Sahne sahne shot list", true],
  ["production-15", "production", "AI image prompts", true],
  ["production-16", "production", "Gerekirse AI video prompts", false],
  ["production-17", "production", "Harita / timeline planı", true],
  ["production-18", "production", "Müzik ve SFX planı", true],
  ["upload-19", "upload", "Final title", true],
  ["upload-20", "upload", "Final thumbnail", true],
  ["upload-21", "upload", "Description", true],
  ["upload-22", "upload", "Chapters", true],
  ["upload-23", "upload", "Tags / keywords", false],
  ["upload-24", "upload", "Pinned comment", true],
  ["upload-25", "upload", "End-screen / ikinci video geçişi", true],
].map(([id, phase, title, required]) => ({ id: id as string, phase: phase as PhaseId, title: title as string, required: required as boolean, active: true }));

const DEFAULT_STATE: HistoryWorkspaceState = {
  version: 2,
  videoTitle: "The Lost Colony of Roanoke",
  workflow: BASE_STEPS.map((step) => ({ ...step, completed: step.phase === "research", completedAt: null })),
};

function databaseUrl() { return process.env.DATABASE_URL || process.env.POSTGRES_URL || ""; }

function normalizeState(value: unknown): HistoryWorkspaceState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as { videoTitle?: unknown; workflow?: unknown };
  if (typeof state.videoTitle !== "string" || state.videoTitle.trim().length === 0 || state.videoTitle.length > 200) return null;
  if (!Array.isArray(state.workflow) || state.workflow.length > 100) return null;
  const ids = new Set<string>();
  const workflow: WorkflowStep[] = [];
  for (const raw of state.workflow) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Partial<WorkflowStep>;
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
      title: item.title.trim(),
      completed: item.completed,
      completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
      required: typeof item.required === "boolean" ? item.required : true,
      active: typeof item.active === "boolean" ? item.active : true,
    });
  }
  return { version: 2, videoTitle: state.videoTitle.trim(), workflow };
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
  const rows = (await sql.query(`SELECT state, updated_at FROM history_workspace_state WHERE id = $1 LIMIT 1`, [STATE_ID])) as StoredRow[];
  return { sql, row: rows[0] };
}

export async function GET() {
  try {
    if (!(await authorized())) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    const store = await ensureState(true);
    if (!store?.row) return NextResponse.json({ state: DEFAULT_STATE, setupRequired: true }, { headers: { "Cache-Control": "no-store" } });
    const normalized = normalizeState(store.row.state) ?? DEFAULT_STATE;
    return NextResponse.json({ state: normalized, updatedAt: store.row.updated_at, setupRequired: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("History state GET failed", error);
    return NextResponse.json({ state: DEFAULT_STATE, setupRequired: true, error: "Kalıcı workflow verisi okunamadı." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await authorized())) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    const body = (await request.json()) as { state?: unknown };
    const normalized = normalizeState(body.state);
    if (!normalized) return NextResponse.json({ error: "Geçersiz workflow verisi." }, { status: 400 });
    const store = await ensureState(true);
    if (!store?.row) return NextResponse.json({ error: "DATABASE_URL yapılandırılmamış." }, { status: 503 });
    const rows = (await store.sql.query(
      `UPDATE history_workspace_state SET state = $2::jsonb, updated_at = NOW() WHERE id = $1 RETURNING state, updated_at`,
      [STATE_ID, JSON.stringify(normalized)],
    )) as StoredRow[];
    return NextResponse.json({ ok: true, state: normalizeState(rows[0].state) ?? normalized, updatedAt: rows[0].updated_at }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("History state PUT failed", error);
    return NextResponse.json({ error: "Workflow kaydı başarısız." }, { status: 500 });
  }
}
