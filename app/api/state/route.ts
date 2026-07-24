import { neon } from "@neondatabase/serverless";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, isAdminEmail } from "../../../lib/auth";
import { defaultConfig, type StartpageConfig } from "../../startpage-config";

export const dynamic = "force-dynamic";

const STATE_ID = "main";

type StoredRow = {
  config: StartpageConfig;
  note: string;
  updated_at: string;
};

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function validConfig(value: unknown): value is StartpageConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<StartpageConfig>;
  return Array.isArray(config.projects) && Array.isArray(config.folders) && Array.isArray(config.markets) && Array.isArray(config.cities);
}

async function getAdminStatus() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

async function ensureState(createIfMissing: boolean) {
  const connectionString = databaseUrl();
  if (!connectionString) return null;

  const sql = neon(connectionString);
  await sql`
    CREATE TABLE IF NOT EXISTS startpage_state (
      id TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  let inserted: unknown[] = [];
  if (createIfMissing) {
    inserted = await sql.query(
      `INSERT INTO startpage_state (id, config, note)
       VALUES ($1, $2::jsonb, '')
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [STATE_ID, JSON.stringify(defaultConfig)]
    );
  }

  const rows = await sql.query(
    `SELECT config, note, updated_at FROM startpage_state WHERE id = $1 LIMIT 1`,
    [STATE_ID]
  ) as StoredRow[];

  return { sql, row: rows[0], isNew: inserted.length > 0 };
}

export async function GET() {
  try {
    const canEdit = await getAdminStatus();
    const state = await ensureState(canEdit);

    if (!state?.row) {
      return NextResponse.json({
        config: defaultConfig,
        note: "",
        canEdit,
        setupRequired: !databaseUrl(),
        isNew: false,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      config: state.row.config,
      note: canEdit ? state.row.note : "",
      canEdit,
      setupRequired: false,
      isNew: state.isNew,
      updatedAt: state.row.updated_at,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("State GET failed", error);
    return NextResponse.json({
      config: defaultConfig,
      note: "",
      canEdit: false,
      setupRequired: true,
      isNew: false,
      error: "Kalıcı veri okunamadı.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await getAdminStatus())) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const state = await ensureState(true);
    if (!state?.row) {
      return NextResponse.json({ error: "DATABASE_URL yapılandırılmamış." }, { status: 503 });
    }

    const body = await request.json() as { config?: unknown; note?: unknown };
    const nextConfig = body.config === undefined ? state.row.config : body.config;
    const nextNote = body.note === undefined ? state.row.note : body.note;

    if (!validConfig(nextConfig)) {
      return NextResponse.json({ error: "Geçersiz yapılandırma." }, { status: 400 });
    }
    if (typeof nextNote !== "string") {
      return NextResponse.json({ error: "Geçersiz not." }, { status: 400 });
    }

    const trimmedNote = nextNote.slice(0, 10000);
    const rows = await state.sql.query(
      `UPDATE startpage_state
       SET config = $2::jsonb, note = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING config, note, updated_at`,
      [STATE_ID, JSON.stringify(nextConfig), trimmedNote]
    ) as StoredRow[];

    return NextResponse.json({
      ok: true,
      config: rows[0].config,
      note: rows[0].note,
      updatedAt: rows[0].updated_at,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("State PUT failed", error);
    return NextResponse.json({ error: "Kalıcı kayıt başarısız." }, { status: 500 });
  }
}
