import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GATEWAY_SESSION_COOKIE, verifyGatewaySession } from "../../../lib/gateway-session";
import { DEFAULT_HISTORY_SETTINGS, getYouTubeVideoId, type HistoryWorkflowStep } from "../../../lib/history-model";
import { ensureHistorySchema, historyDb } from "../../../lib/history-db";

export const dynamic = "force-dynamic";

let trackerSchemaReady: Promise<void> | null = null;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function authorized() {
  const store = await cookies();
  return verifyGatewaySession(store.get(GATEWAY_SESSION_COOKIE)?.value);
}

async function requireAuthorized() {
  return (await authorized()) ? null : json({ error: "Unauthorized." }, 401);
}

function cleanString(value: unknown, max = 10000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function workflowFromValue(value: unknown): HistoryWorkflowStep[] {
  return Array.isArray(value) && value.length ? value as HistoryWorkflowStep[] : DEFAULT_HISTORY_SETTINGS.workflow;
}

async function ensureTrackerSchema() {
  if (trackerSchemaReady) return trackerSchemaReady;
  trackerSchemaReady = (async () => {
    await ensureHistorySchema();
    const sql = historyDb();
    await sql`CREATE TABLE IF NOT EXISTS history_workflow_tracking (
      video_id TEXT NOT NULL REFERENCES history_videos(id) ON DELETE CASCADE,
      step_id TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT NOT NULL DEFAULT '',
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (video_id, step_id)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS history_workflow_tracking_video_idx ON history_workflow_tracking(video_id, updated_at DESC)`;
  })().catch((error) => {
    trackerSchemaReady = null;
    throw error;
  });
  return trackerSchemaReady;
}

function mapEntry(row: any) {
  return {
    videoId: row.video_id,
    stepId: row.step_id,
    completed: Boolean(row.completed),
    note: row.note || "",
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : "",
  };
}

export async function GET(request: Request) {
  const denied = await requireAuthorized();
  if (denied) return denied;
  try {
    await ensureTrackerSchema();
    const sql = historyDb();
    const videoId = cleanString(new URL(request.url).searchParams.get("videoId"), 80);
    const rows = videoId
      ? await sql.query(`SELECT * FROM history_workflow_tracking WHERE video_id = $1 ORDER BY updated_at DESC`, [videoId])
      : await sql.query(`SELECT * FROM history_workflow_tracking ORDER BY updated_at DESC`);
    return json({ entries: rows.map(mapEntry) });
  } catch (error) {
    console.error("History tracker GET failed", error);
    return json({ error: error instanceof Error ? error.message : "Workflow tracker could not be loaded." }, 500);
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAuthorized();
  if (denied) return denied;
  try {
    await ensureTrackerSchema();
    const sql = historyDb();
    const body = await request.json() as Record<string, unknown>;
    const videoId = cleanString(body.videoId, 80);
    const stepId = cleanString(body.stepId, 120);
    const completed = body.completed === true;
    const note = cleanString(body.note, 10000);
    if (!videoId || !stepId) return json({ error: "Video and workflow stage are required." }, 400);

    const [videoRows, settingsRows] = await Promise.all([
      sql.query(`SELECT id, status, youtube_url FROM history_videos WHERE id = $1 LIMIT 1`, [videoId]),
      sql.query(`SELECT workflow FROM history_settings WHERE id = 'main' LIMIT 1`),
    ]);
    const video = videoRows[0];
    if (!video) return json({ error: "Video not found." }, 404);

    const workflow = workflowFromValue(settingsRows[0]?.workflow);
    const step = workflow.find((item) => item.id === stepId);
    if (!step) return json({ error: "Workflow stage no longer exists." }, 409);
    if (completed && step.id === "published" && !getYouTubeVideoId(video.youtube_url || "")) {
      return json({ error: "Add a valid YouTube video URL before completing the Published stage." }, 409);
    }

    const rows = await sql.query(
      `INSERT INTO history_workflow_tracking (video_id, step_id, completed, note, completed_at, updated_at)
       VALUES ($1,$2,$3,$4,CASE WHEN $3 THEN NOW() ELSE NULL END,NOW())
       ON CONFLICT (video_id, step_id) DO UPDATE SET
         completed = EXCLUDED.completed,
         note = EXCLUDED.note,
         completed_at = CASE
           WHEN EXCLUDED.completed THEN COALESCE(history_workflow_tracking.completed_at, NOW())
           ELSE NULL
         END,
         updated_at = NOW()
       RETURNING *`,
      [videoId, stepId, completed, note],
    );

    const trackingRows = await sql.query(`SELECT step_id, completed FROM history_workflow_tracking WHERE video_id = $1`, [videoId]);
    const completedIds = new Set(trackingRows.filter((row) => row.completed).map((row) => row.step_id));
    const requiredSteps = workflow.filter((item) => item.required);
    const completedRequired = requiredSteps.filter((item) => completedIds.has(item.id)).length;
    const completedAll = workflow.filter((item) => completedIds.has(item.id)).length;
    const firstIncompleteRequired = requiredSteps.find((item) => !completedIds.has(item.id));

    let nextStatus = firstIncompleteRequired?.name || workflow[workflow.length - 1]?.name || video.status;
    let statusNotice = "";
    if (firstIncompleteRequired?.id === "published" && !getYouTubeVideoId(video.youtube_url || "")) {
      nextStatus = video.status;
      statusNotice = "Published is the next required stage. Add the YouTube URL before the board advances to it.";
    }

    if (nextStatus && nextStatus !== video.status) {
      await sql.query(`UPDATE history_videos SET status = $2, updated_at = NOW() WHERE id = $1`, [videoId, nextStatus]);
      await sql.query(
        `INSERT INTO history_workflow_events (id, video_id, from_status, to_status) VALUES ($1,$2,$3,$4)`,
        [randomUUID(), videoId, video.status, nextStatus],
      );
    }

    return json({
      entry: mapEntry(rows[0]),
      videoStatus: nextStatus || video.status,
      statusNotice,
      completedRequired,
      totalRequired: requiredSteps.length,
      completedAll,
      totalStages: workflow.length,
    });
  } catch (error) {
    console.error("History tracker PATCH failed", error);
    return json({ error: error instanceof Error ? error.message : "Workflow progress could not be saved." }, 500);
  }
}
