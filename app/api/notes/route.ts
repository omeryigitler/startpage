import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, isAdminEmail } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export type NoteAttachment = {
  pathname: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

type NoteRow = {
  id: string;
  title: string;
  content: string;
  attachments: NoteAttachment[] | null;
  created_at: string;
  updated_at: string;
};

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

async function notesDb() {
  const connectionString = databaseUrl();
  if (!connectionString) return null;

  const sql = neon(connectionString);
  await sql`
    CREATE TABLE IF NOT EXISTS startpage_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const noteCount = await sql.query(`SELECT COUNT(*)::int AS count FROM startpage_notes`) as { count: number }[];
  if ((noteCount[0]?.count || 0) === 0) {
    const oldState = await sql.query(`SELECT note FROM startpage_state WHERE id = 'main' LIMIT 1`) as { note: string }[];
    const oldNote = oldState[0]?.note?.trim();
    if (oldNote) {
      await sql.query(
        `INSERT INTO startpage_notes (id, title, content) VALUES ($1, $2, $3)`,
        [crypto.randomUUID(), "Aktarılan Hızlı Not", oldNote]
      );
    }
  }

  return sql;
}

function normalizeNote(row: NoteRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const sql = await notesDb();
    if (!sql) return NextResponse.json({ error: "Veritabanı bağlı değil." }, { status: 503 });

    const rows = await sql.query(
      `SELECT id, title, content, attachments, created_at, updated_at
       FROM startpage_notes
       ORDER BY updated_at DESC`
    ) as NoteRow[];

    return NextResponse.json({ notes: rows.map(normalizeNote) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Notes GET failed", error);
    return NextResponse.json({ error: "Notlar okunamadı." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const sql = await notesDb();
    if (!sql) return NextResponse.json({ error: "Veritabanı bağlı değil." }, { status: 503 });

    const body = await request.json() as { title?: unknown; content?: unknown };
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
    const content = typeof body.content === "string" ? body.content.slice(0, 50000) : "";
    if (!title) return NextResponse.json({ error: "Not başlığı gerekli." }, { status: 400 });

    const id = crypto.randomUUID();
    const rows = await sql.query(
      `INSERT INTO startpage_notes (id, title, content)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, attachments, created_at, updated_at`,
      [id, title, content]
    ) as NoteRow[];

    return NextResponse.json({ note: normalizeNote(rows[0]) }, { status: 201 });
  } catch (error) {
    console.error("Notes POST failed", error);
    return NextResponse.json({ error: "Not oluşturulamadı." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const sql = await notesDb();
    if (!sql) return NextResponse.json({ error: "Veritabanı bağlı değil." }, { status: 503 });

    const body = await request.json() as { id?: unknown; title?: unknown; content?: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 180) : "";
    const content = typeof body.content === "string" ? body.content.slice(0, 50000) : "";
    if (!id || !title) return NextResponse.json({ error: "Not kimliği ve başlığı gerekli." }, { status: 400 });

    const rows = await sql.query(
      `UPDATE startpage_notes
       SET title = $2, content = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, content, attachments, created_at, updated_at`,
      [id, title, content]
    ) as NoteRow[];

    if (!rows[0]) return NextResponse.json({ error: "Not bulunamadı." }, { status: 404 });
    return NextResponse.json({ note: normalizeNote(rows[0]) });
  } catch (error) {
    console.error("Notes PUT failed", error);
    return NextResponse.json({ error: "Not güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const sql = await notesDb();
    if (!sql) return NextResponse.json({ error: "Veritabanı bağlı değil." }, { status: 503 });

    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "Not kimliği gerekli." }, { status: 400 });

    const rows = await sql.query(
      `DELETE FROM startpage_notes
       WHERE id = $1
       RETURNING attachments`,
      [id]
    ) as { attachments: NoteAttachment[] | null }[];

    if (!rows[0]) return NextResponse.json({ error: "Not bulunamadı." }, { status: 404 });

    const pathnames = Array.isArray(rows[0].attachments) ? rows[0].attachments.map(item => item.pathname) : [];
    if (pathnames.length && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(pathnames).catch(error => console.error("Blob cleanup failed", error));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notes DELETE failed", error);
    return NextResponse.json({ error: "Not silinemedi." }, { status: 500 });
  }
}
