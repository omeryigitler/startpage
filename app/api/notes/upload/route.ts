import { neon } from "@neondatabase/serverless";
import { del, put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, isAdminEmail } from "../../../../lib/auth";
import type { NoteAttachment } from "../route";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf"]);

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 100) || "file";
}

function fileAllowed(file: File) {
  return file.type.startsWith("image/") || ALLOWED_TYPES.has(file.type);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Dosya depolama bağlı değil." }, { status: 503 });
  }

  try {
    const connectionString = databaseUrl();
    if (!connectionString) return NextResponse.json({ error: "Veritabanı bağlı değil." }, { status: 503 });

    const form = await request.formData();
    const noteId = String(form.get("noteId") || "");
    const file = form.get("file");
    if (!noteId || !(file instanceof File)) {
      return NextResponse.json({ error: "Not ve dosya gerekli." }, { status: 400 });
    }
    if (!fileAllowed(file)) {
      return NextResponse.json({ error: "Yalnızca görsel veya PDF yüklenebilir." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Dosya en fazla 4 MB olabilir." }, { status: 400 });
    }

    const sql = neon(connectionString);
    const rows = await sql.query(
      `SELECT attachments FROM startpage_notes WHERE id = $1 LIMIT 1`,
      [noteId]
    ) as { attachments: NoteAttachment[] | null }[];
    if (!rows[0]) return NextResponse.json({ error: "Not bulunamadı." }, { status: 404 });

    const current = Array.isArray(rows[0].attachments) ? rows[0].attachments : [];
    if (current.length >= 12) {
      return NextResponse.json({ error: "Bir nota en fazla 12 dosya eklenebilir." }, { status: 400 });
    }

    const blob = await put(`notes/${noteId}/${Date.now()}-${safeName(file.name)}`, file, {
      access: "private",
      addRandomSuffix: true,
    });

    const attachment: NoteAttachment = {
      pathname: blob.pathname,
      name: file.name.slice(0, 180),
      contentType: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    const updated = [...current, attachment];
    await sql.query(
      `UPDATE startpage_notes
       SET attachments = $2::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [noteId, JSON.stringify(updated)]
    );

    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Attachment upload failed", error);
    return NextResponse.json({ error: "Dosya yüklenemedi." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Dosya depolama bağlı değil." }, { status: 503 });
  }

  try {
    const connectionString = databaseUrl();
    if (!connectionString) return NextResponse.json({ error: "Veritabanı bağlı değil." }, { status: 503 });

    const url = new URL(request.url);
    const noteId = url.searchParams.get("noteId") || "";
    const pathname = url.searchParams.get("pathname") || "";
    if (!noteId || !pathname) return NextResponse.json({ error: "Eksik dosya bilgisi." }, { status: 400 });

    const sql = neon(connectionString);
    const rows = await sql.query(
      `SELECT attachments FROM startpage_notes WHERE id = $1 LIMIT 1`,
      [noteId]
    ) as { attachments: NoteAttachment[] | null }[];
    if (!rows[0]) return NextResponse.json({ error: "Not bulunamadı." }, { status: 404 });

    const current = Array.isArray(rows[0].attachments) ? rows[0].attachments : [];
    const next = current.filter(item => item.pathname !== pathname);
    if (next.length === current.length) return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });

    await del(pathname);
    await sql.query(
      `UPDATE startpage_notes
       SET attachments = $2::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [noteId, JSON.stringify(next)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Attachment delete failed", error);
    return NextResponse.json({ error: "Dosya silinemedi." }, { status: 500 });
  }
}
