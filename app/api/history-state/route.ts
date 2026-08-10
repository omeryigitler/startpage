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
};

type HistoryWorkspaceState = {
  videoTitle: string;
  workflow: WorkflowStep[];
};

type StoredRow = {
  state: HistoryWorkspaceState;
  updated_at: string;
};

const PHASE_IDS = new Set<PhaseId>(["research", "packaging", "script", "production", "upload"]);

const DEFAULT_STATE: HistoryWorkspaceState = {
  videoTitle: "The Lost Colony of Roanoke",
  workflow: [
    { id: "research-1", phase: "research", title: "Roanoke hakkında güncel ve güvenilir kaynak araştırması", completed: true },
    { id: "research-2", phase: "research", title: "Doğrulanmış olayların kronolojisi", completed: true },
    { id: "research-3", phase: "research", title: "Ana teoriler", completed: true },
    { id: "research-4", phase: "research", title: "Güncel arkeolojik kanıtlar", completed: true },
    { id: "research-5", phase: "research", title: "Güvenilir ve tartışmalı iddiaların ayrımı", completed: true },
    { id: "packaging-6", phase: "packaging", title: "10 başlık alternatifi", completed: false },
    { id: "packaging-7", phase: "packaging", title: "En güçlü 3 başlık", completed: false },
    { id: "packaging-8", phase: "packaging", title: "Thumbnail konseptleri", completed: false },
    { id: "packaging-9", phase: "packaging", title: "Final video angle / story promise", completed: false },
    { id: "script-10", phase: "script", title: "Hook seçenekleri", completed: false },
    { id: "script-11", phase: "script", title: "Ayrıntılı narrative outline", completed: false },
    { id: "script-12", phase: "script", title: "9–12 dakikalık final İngilizce senaryo", completed: false },
    { id: "script-13", phase: "script", title: "Fact-check", completed: false },
    { id: "production-14", phase: "production", title: "Sahne sahne shot list", completed: false },
    { id: "production-15", phase: "production", title: "AI image prompts", completed: false },
    { id: "production-16", phase: "production", title: "Gerekirse AI video prompts", completed: false },
    { id: "production-17", phase: "production", title: "Harita / timeline planı", completed: false },
    { id: "production-18", phase: "production", title: "Müzik ve SFX planı", completed: false },
    { id: "upload-19", phase: "upload", title: "Final title", completed: false },
    { id: "upload-20", phase: "upload", title: "Final thumbnail", completed: false },
    { id: "upload-21", phase: "upload", title: "Description", completed: false },
    { id: "upload-22", phase: "upload", title: "Chapters", completed: false },
    { id: "upload-23", phase: "upload", title: "Tags / keywords", completed: false },
    { id: "upload-24", phase: "upload", title: "Pinned comment", completed: false },
    { id: "upload-25", phase: "upload", title: "End-screen / ikinci video geçişi", completed: false },
  ],
};

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function validState(value: unknown): value is HistoryWorkspaceState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<HistoryWorkspaceState>;
  if (typeof state.videoTitle !== "string" || state.videoTitle.trim().length === 0 || state.videoTitle.length > 200) return false;
  if (!Array.isArray(state.workflow) || state.workflow.length > 100) return false;

  const ids = new Set<string>();
  return state.workflow.every((step) => {
    if (!step || typeof step !== "object") return false;
    const item = step as Partial<WorkflowStep>;
    if (
      typeof item.id !== "string" ||
      item.id.length === 0 ||
      item.id.length > 120 ||
      ids.has(item.id) ||
      typeof item.phase !== "string" ||
      !PHASE_IDS.has(item.phase as PhaseId) ||
      typeof item.title !== "string" ||
      item.title.trim().length === 0 ||
      item.title.length > 200 ||
      typeof item.completed !== "boolean"
    ) return false;
    ids.add(item.id);
    return true;
  });
}

async function authorized() {
  const cookieStore = await cookies();
  return verifyGatewaySession(cookieStore.get(GATEWAY_SESSION_COOKIE)?.value);
}

async function ensureState(createIfMissing: boolean) {
  const connectionString = databaseUrl();
  if (!connectionString) return null;

  const sql = neon(connectionString);
  await sql`
    CREATE TABLE IF NOT EXISTS history_workspace_state (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (createIfMissing) {
    await sql.query(
      `INSERT INTO history_workspace_state (id, state)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO NOTHING`,
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
    if (!(await authorized())) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

    const store = await ensureState(true);
    if (!store?.row) {
      return NextResponse.json(
        { state: DEFAULT_STATE, setupRequired: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { state: store.row.state, updatedAt: store.row.updated_at, setupRequired: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("History state GET failed", error);
    return NextResponse.json(
      { state: DEFAULT_STATE, setupRequired: true, error: "Kalıcı workflow verisi okunamadı." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await authorized())) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

    const body = (await request.json()) as { state?: unknown };
    if (!validState(body.state)) return NextResponse.json({ error: "Geçersiz workflow verisi." }, { status: 400 });

    const store = await ensureState(true);
    if (!store?.row) return NextResponse.json({ error: "DATABASE_URL yapılandırılmamış." }, { status: 503 });

    const rows = (await store.sql.query(
      `UPDATE history_workspace_state
       SET state = $2::jsonb, updated_at = NOW()
       WHERE id = $1
       RETURNING state, updated_at`,
      [STATE_ID, JSON.stringify(body.state)],
    )) as StoredRow[];

    return NextResponse.json(
      { ok: true, state: rows[0].state, updatedAt: rows[0].updated_at },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("History state PUT failed", error);
    return NextResponse.json({ error: "Workflow kaydı başarısız." }, { status: 500 });
  }
}
