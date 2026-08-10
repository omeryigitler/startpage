import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GATEWAY_SESSION_COOKIE, verifyGatewaySession } from "../../../lib/gateway-session";
import {
  DEFAULT_HISTORY_SETTINGS,
  EMPTY_VIDEO_FIELDS,
  getYouTubeVideoId,
  type HistoryBootstrap,
  type HistorySettings,
  type HistoryWorkflowStep,
  type Video,
} from "../../../lib/history-model";
import {
  ensureHistorySchema,
  historyDb,
  mapHistoryAsset,
  mapHistoryEvent,
  mapHistorySeries,
  mapHistorySettings,
  mapHistorySource,
  mapHistoryTask,
  mapHistoryVideo,
} from "../../../lib/history-db";

export const dynamic = "force-dynamic";

const FORMAT_VALUES = new Set(["Long Documentary", "Short", "Special"]);
const PRIORITY_VALUES = new Set(["P1", "P2", "P3", "P4"]);
const TASK_STATUS_VALUES = new Set(["To Do", "Doing", "Blocked", "Review", "Done"]);

function json(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

async function authorized() {
  const store = await cookies();
  return verifyGatewaySession(store.get(GATEWAY_SESSION_COOKIE)?.value);
}

async function requireAuthorized() {
  if (!(await authorized())) return json({ error: "Unauthorized." }, 401);
  return null;
}

function cleanString(value: unknown, max = 20000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, maxItems = 50, maxLength = 500) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function bool(value: unknown) {
  return value === true;
}

function rating(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 0;
}

function numberScore(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

function progressValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}

function cleanWorkflow(value: unknown): HistoryWorkflowStep[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  const steps: HistoryWorkflowStep[] = [];
  for (const raw of value.slice(0, 60)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const name = cleanString(item.name, 120);
    if (!name) continue;
    const key = name.toLocaleLowerCase("en-US");
    if (names.has(key)) continue;
    names.add(key);
    steps.push({
      id: cleanString(item.id, 120) || randomUUID(),
      name,
      phase: cleanString(item.phase, 120),
      objective: cleanString(item.objective, 4000),
      instructions: cleanString(item.instructions, 10000),
      deliverables: cleanString(item.deliverables, 10000),
      completionCriteria: cleanString(item.completionCriteria, 10000),
      aiPrompt: cleanString(item.aiPrompt, 12000),
      progress: progressValue(item.progress),
      required: item.required !== false,
    });
  }
  return steps;
}

function storedWorkflow(value: unknown) {
  const workflow = cleanWorkflow(value);
  return workflow.length ? workflow : DEFAULT_HISTORY_SETTINGS.workflow;
}

async function bootstrap(): Promise<HistoryBootstrap> {
  await ensureHistorySchema();
  const sql = historyDb();
  const [videos, sources, prompts, tasks, series, workflowEvents, settings] = await Promise.all([
    sql.query(`SELECT * FROM history_videos ORDER BY updated_at DESC`),
    sql.query(`SELECT * FROM history_sources ORDER BY updated_at DESC`),
    sql.query(`SELECT * FROM history_prompt_assets ORDER BY updated_at DESC`),
    sql.query(`SELECT * FROM history_tasks ORDER BY CASE status WHEN 'Blocked' THEN 0 WHEN 'Doing' THEN 1 WHEN 'Review' THEN 2 WHEN 'To Do' THEN 3 ELSE 4 END, due_date NULLS LAST, updated_at DESC`),
    sql.query(`SELECT * FROM history_series ORDER BY name ASC`),
    sql.query(`SELECT * FROM history_workflow_events ORDER BY created_at DESC LIMIT 1000`),
    sql.query(`SELECT * FROM history_settings WHERE id = 'main' LIMIT 1`),
  ]);
  return {
    videos: videos.map(mapHistoryVideo),
    sources: sources.map(mapHistorySource),
    prompts: prompts.map(mapHistoryAsset),
    tasks: tasks.map(mapHistoryTask),
    series: series.map(mapHistorySeries),
    workflowEvents: workflowEvents.map(mapHistoryEvent),
    settings: mapHistorySettings(settings[0]),
  };
}

export async function GET(request: Request) {
  const denied = await requireAuthorized();
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource") || "bootstrap";
    if (resource === "health") {
      await ensureHistorySchema();
      const sql = historyDb();
      const rows = await sql.query(`SELECT NOW() AS now`);
      return json({ ok: true, database: true, at: rows[0]?.now || new Date().toISOString() });
    }
    if (resource === "bootstrap") return json(await bootstrap());
    if (resource === "export") {
      return json(
        { exportedAt: new Date().toISOString(), ...(await bootstrap()) },
        200,
        { "Content-Disposition": `attachment; filename="the-history-archived-${new Date().toISOString().slice(0, 10)}.json"` },
      );
    }
    return json({ error: "Unknown resource." }, 404);
  } catch (error) {
    console.error("History GET failed", error);
    return json({ error: error instanceof Error ? error.message : "History workspace could not be loaded." }, 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireAuthorized();
  if (denied) return denied;
  try {
    await ensureHistorySchema();
    const sql = historyDb();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource") || "";
    const body = (await request.json()) as Record<string, unknown>;

    if (resource === "videos") {
      const sequence = await sql.query(`SELECT nextval('history_video_public_id_seq') AS n`);
      const id = `THA-${String(Number(sequence[0]?.n || 1)).padStart(3, "0")}`;
      const settingsRows = await sql.query(`SELECT default_format, workflow FROM history_settings WHERE id = 'main' LIMIT 1`);
      const requestedFormat = cleanString(body.format, 40);
      const format = FORMAT_VALUES.has(requestedFormat)
        ? requestedFormat
        : FORMAT_VALUES.has(settingsRows[0]?.default_format)
          ? settingsRows[0].default_format
          : DEFAULT_HISTORY_SETTINGS.defaultFormat;
      const workflow = storedWorkflow(settingsRows[0]?.workflow);
      const initialStatus = workflow[0]?.name || "Idea";
      const rows = await sql.query(
        `INSERT INTO history_videos (
          id, working_title, format, status, content_score, checklist, legal, packaging, dates, idea_bank, production, analytics
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb)
        RETURNING *`,
        [
          id,
          cleanString(body.workingTitle, 300),
          format,
          initialStatus,
          JSON.stringify(EMPTY_VIDEO_FIELDS.contentScore),
          JSON.stringify(EMPTY_VIDEO_FIELDS.checklist),
          JSON.stringify(EMPTY_VIDEO_FIELDS.legal),
          JSON.stringify(EMPTY_VIDEO_FIELDS.packaging),
          JSON.stringify(EMPTY_VIDEO_FIELDS.dates),
          JSON.stringify(EMPTY_VIDEO_FIELDS.ideaBank),
          JSON.stringify(EMPTY_VIDEO_FIELDS.production),
          JSON.stringify(EMPTY_VIDEO_FIELDS.analytics),
        ],
      );
      await sql.query(
        `INSERT INTO history_workflow_events (id, video_id, from_status, to_status) VALUES ($1,$2,$3,$4)`,
        [randomUUID(), id, null, initialStatus],
      );
      return json(mapHistoryVideo(rows[0]), 201);
    }

    if (resource === "sources") {
      const videoId = cleanString(body.videoId, 80);
      const name = cleanString(body.name, 500);
      if (!videoId || !name) return json({ error: "Video and source name are required." }, 400);
      const id = randomUUID();
      const rows = await sql.query(
        `INSERT INTO history_sources (
          id, video_id, name, type, url, author, publication, pub_date, access_date, reliability,
          notes, facts, quotes, contradictions, citation_needed, used_in_script, public_domain, license, rights_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
        [
          id, videoId, name, cleanString(body.type, 120), cleanString(body.url, 2000), cleanString(body.author, 300),
          cleanString(body.publication, 300), cleanString(body.pubDate, 40), cleanString(body.accessDate, 40), cleanString(body.reliability, 120),
          cleanString(body.notes), cleanString(body.facts), cleanString(body.quotes), cleanString(body.contradictions),
          bool(body.citationNeeded), bool(body.usedInScript), bool(body.publicDomain), cleanString(body.license, 500), cleanString(body.rightsNotes),
        ],
      );
      return json(mapHistorySource(rows[0]), 201);
    }

    if (resource === "assets") {
      const videoId = cleanString(body.videoId, 80);
      const name = cleanString(body.name, 500);
      if (!videoId || !name) return json({ error: "Video and asset name are required." }, 400);
      const id = randomUUID();
      const rows = await sql.query(
        `INSERT INTO history_prompt_assets (
          id, video_id, name, category, ai_tool, full_prompt, negative_prompt, aspect_ratio,
          historical_period, location, visual_style, output_link, approved, reusable, quality_rating, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
          id, videoId, name, cleanString(body.category, 200), cleanString(body.aiTool, 200), cleanString(body.fullPrompt),
          cleanString(body.negativePrompt), cleanString(body.aspectRatio, 80), cleanString(body.historicalPeriod, 300), cleanString(body.location, 300),
          cleanString(body.visualStyle, 500), cleanString(body.outputLink, 2000), bool(body.approved), bool(body.reusable), rating(body.qualityRating), cleanString(body.notes),
        ],
      );
      return json(mapHistoryAsset(rows[0]), 201);
    }

    if (resource === "tasks") {
      const videoId = cleanString(body.videoId, 80);
      const title = cleanString(body.title, 500);
      if (!videoId || !title) return json({ error: "Video and task title are required." }, 400);
      const id = randomUUID();
      const requestedStatus = cleanString(body.status, 40);
      const requestedPriority = cleanString(body.priority, 10);
      const rows = await sql.query(
        `INSERT INTO history_tasks (id, video_id, title, department, status, priority, due_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          id, videoId, title, cleanString(body.department, 200), TASK_STATUS_VALUES.has(requestedStatus) ? requestedStatus : "To Do",
          PRIORITY_VALUES.has(requestedPriority) ? requestedPriority : "P2", cleanString(body.dueDate, 20) || null, cleanString(body.notes),
        ],
      );
      return json(mapHistoryTask(rows[0]), 201);
    }

    if (resource === "series") {
      const name = cleanString(body.name, 300);
      if (!name) return json({ error: "Series name is required." }, 400);
      const id = randomUUID();
      const rows = await sql.query(
        `INSERT INTO history_series (id, name, description) VALUES ($1,$2,$3) RETURNING *`,
        [id, name, cleanString(body.description)],
      );
      return json(mapHistorySeries(rows[0]), 201);
    }

    return json({ error: "Unknown resource." }, 404);
  } catch (error) {
    console.error("History POST failed", error);
    return json({ error: error instanceof Error ? error.message : "Create operation failed." }, 500);
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAuthorized();
  if (denied) return denied;
  try {
    await ensureHistorySchema();
    const sql = historyDb();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource") || "";
    const body = (await request.json()) as Record<string, any>;

    if (resource === "videos") {
      const id = cleanString(body.id, 80);
      if (!id) return json({ error: "Video id is required." }, 400);
      const current = await sql.query(`SELECT status FROM history_videos WHERE id = $1 LIMIT 1`, [id]);
      if (!current[0]) return json({ error: "Video not found." }, 404);
      const workflowRows = await sql.query(`SELECT workflow FROM history_settings WHERE id = 'main' LIMIT 1`);
      const workflow = storedWorkflow(workflowRows[0]?.workflow);
      const statusValues = new Set(workflow.map((step) => step.name));
      const requestedStatus = cleanString(body.status, 120);
      const status = statusValues.has(requestedStatus) ? requestedStatus : current[0].status;
      const youtubeUrl = cleanString(body.youtubeUrl, 2000);
      if (status === "Published" && !getYouTubeVideoId(youtubeUrl)) {
        return json({ error: "A valid YouTube video URL is required before marking a video Published." }, 400);
      }
      const format = FORMAT_VALUES.has(body.format) ? body.format : "Long Documentary";
      const priority = PRIORITY_VALUES.has(body.priority) ? body.priority : "P2";
      const contentScore = {
        ctr: numberScore(body.contentScore?.ctr), retention: numberScore(body.contentScore?.retention), rpm: numberScore(body.contentScore?.rpm),
        search: numberScore(body.contentScore?.search), competition: numberScore(body.contentScore?.competition), evergreen: numberScore(body.contentScore?.evergreen),
        prodDiff: numberScore(body.contentScore?.prodDiff),
      };
      const checklist = {
        research: bool(body.checklist?.research), script: bool(body.checklist?.script), voice: bool(body.checklist?.voice), visuals: bool(body.checklist?.visuals),
        edit: bool(body.checklist?.edit), packaging: bool(body.checklist?.packaging), legal: bool(body.checklist?.legal), publish: bool(body.checklist?.publish),
      };
      const legal = {
        copyrightStatus: ["Not Reviewed", "Review Required", "Cleared", "Problem Found"].includes(body.legal?.copyrightStatus) ? body.legal.copyrightStatus : "Not Reviewed",
        aiDisclosure: ["Not Required", "Required", "Added", "Review"].includes(body.legal?.aiDisclosure) ? body.legal.aiDisclosure : "Not Required",
        assetRights: ["Cleared", "Partial", "Unknown", "Problem"].includes(body.legal?.assetRights) ? body.legal.assetRights : "Unknown",
        factRisk: ["Low", "Medium", "High"].includes(body.legal?.factRisk) ? body.legal.factRisk : "Low",
        sourcesVerified: bool(body.legal?.sourcesVerified), finalReview: bool(body.legal?.finalReview),
      };
      const packaging = {
        altTitles: stringList(body.packaging?.altTitles, 30, 300), thumbConcepts: stringList(body.packaging?.thumbConcepts, 30, 1000),
        thumbText: cleanString(body.packaging?.thumbText, 300), primaryKeyword: cleanString(body.packaging?.primaryKeyword, 300),
        secondaryKeywords: cleanString(body.packaging?.secondaryKeywords, 2000), description: cleanString(body.packaging?.description),
        chapters: cleanString(body.packaging?.chapters), tags: cleanString(body.packaging?.tags, 5000), pinnedComment: cleanString(body.packaging?.pinnedComment),
        cta: cleanString(body.packaging?.cta, 2000), endScreenTarget: cleanString(body.packaging?.endScreenTarget, 1000), relatedPlaylist: cleanString(body.packaging?.relatedPlaylist, 1000),
      };
      const dates = {
        targetPublish: cleanString(body.dates?.targetPublish, 30), finalPublish: cleanString(body.dates?.finalPublish, 30), uploadDate: cleanString(body.dates?.uploadDate, 30),
      };
      const ideaBank = {
        hook: cleanString(body.ideaBank?.hook), whyClick: cleanString(body.ideaBank?.whyClick), mysteryConflict: cleanString(body.ideaBank?.mysteryConflict),
        sourceAvailability: cleanString(body.ideaBank?.sourceAvailability), nextVideoConnection: cleanString(body.ideaBank?.nextVideoConnection),
      };
      const production = {
        researchNotes: cleanString(body.production?.researchNotes), outline: cleanString(body.production?.outline), scriptNotes: cleanString(body.production?.scriptNotes),
        voiceoverNotes: cleanString(body.production?.voiceoverNotes), visualNotes: cleanString(body.production?.visualNotes), editNotes: cleanString(body.production?.editNotes),
      };
      const analytics = {
        views30d: cleanString(body.analytics?.views30d, 100), ctr: cleanString(body.analytics?.ctr, 100), avd: cleanString(body.analytics?.avd, 100),
        watchHours: cleanString(body.analytics?.watchHours, 100), subscribers: cleanString(body.analytics?.subscribers, 100), impressions: cleanString(body.analytics?.impressions, 100),
        workedWell: cleanString(body.analytics?.workedWell), improve: cleanString(body.analytics?.improve), takeaways: cleanString(body.analytics?.takeaways),
      };
      const rows = await sql.query(
        `UPDATE history_videos SET
          working_title=$2, final_title=$3, core_topic=$4, historical_period=$5, geography=$6, series_id=$7,
          format=$8, target_length=$9, content_strategy=$10::jsonb, primary_audience=$11::jsonb, priority=$12,
          status=$13, youtube_url=$14, thumbnail_url=$15, notes=$16, content_score=$17::jsonb, checklist=$18::jsonb,
          legal=$19::jsonb, packaging=$20::jsonb, dates=$21::jsonb, idea_bank=$22::jsonb, production=$23::jsonb,
          analytics=$24::jsonb, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [
          id, cleanString(body.workingTitle, 500), cleanString(body.finalTitle, 500), cleanString(body.coreTopic), cleanString(body.historicalPeriod, 500),
          cleanString(body.geography, 500), cleanString(body.seriesId, 80) || null, format, cleanString(body.targetLength, 100), JSON.stringify(stringList(body.contentStrategy, 30, 300)),
          JSON.stringify(stringList(body.primaryAudience, 30, 300)), priority, status, youtubeUrl, cleanString(body.thumbnailUrl, 2000), cleanString(body.notes),
          JSON.stringify(contentScore), JSON.stringify(checklist), JSON.stringify(legal), JSON.stringify(packaging), JSON.stringify(dates), JSON.stringify(ideaBank),
          JSON.stringify(production), JSON.stringify(analytics),
        ],
      );
      if (current[0].status !== status) {
        await sql.query(
          `INSERT INTO history_workflow_events (id, video_id, from_status, to_status) VALUES ($1,$2,$3,$4)`,
          [randomUUID(), id, current[0].status, status],
        );
      }
      return json(mapHistoryVideo(rows[0]));
    }

    if (resource === "sources") {
      const id = cleanString(body.id, 80);
      if (!id) return json({ error: "Source id is required." }, 400);
      const rows = await sql.query(
        `UPDATE history_sources SET name=$2,type=$3,url=$4,author=$5,publication=$6,pub_date=$7,access_date=$8,reliability=$9,
         notes=$10,facts=$11,quotes=$12,contradictions=$13,citation_needed=$14,used_in_script=$15,public_domain=$16,license=$17,rights_notes=$18,updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [
          id, cleanString(body.name, 500), cleanString(body.type, 120), cleanString(body.url, 2000), cleanString(body.author, 300), cleanString(body.publication, 300),
          cleanString(body.pubDate, 40), cleanString(body.accessDate, 40), cleanString(body.reliability, 120), cleanString(body.notes), cleanString(body.facts), cleanString(body.quotes),
          cleanString(body.contradictions), bool(body.citationNeeded), bool(body.usedInScript), bool(body.publicDomain), cleanString(body.license, 500), cleanString(body.rightsNotes),
        ],
      );
      return rows[0] ? json(mapHistorySource(rows[0])) : json({ error: "Source not found." }, 404);
    }

    if (resource === "assets") {
      const id = cleanString(body.id, 80);
      if (!id) return json({ error: "Asset id is required." }, 400);
      const rows = await sql.query(
        `UPDATE history_prompt_assets SET name=$2,category=$3,ai_tool=$4,full_prompt=$5,negative_prompt=$6,aspect_ratio=$7,historical_period=$8,
         location=$9,visual_style=$10,output_link=$11,approved=$12,reusable=$13,quality_rating=$14,notes=$15,updated_at=NOW() WHERE id=$1 RETURNING *`,
        [
          id, cleanString(body.name, 500), cleanString(body.category, 200), cleanString(body.aiTool, 200), cleanString(body.fullPrompt), cleanString(body.negativePrompt),
          cleanString(body.aspectRatio, 80), cleanString(body.historicalPeriod, 300), cleanString(body.location, 300), cleanString(body.visualStyle, 500),
          cleanString(body.outputLink, 2000), bool(body.approved), bool(body.reusable), rating(body.qualityRating), cleanString(body.notes),
        ],
      );
      return rows[0] ? json(mapHistoryAsset(rows[0])) : json({ error: "Asset not found." }, 404);
    }

    if (resource === "tasks") {
      const id = cleanString(body.id, 80);
      if (!id) return json({ error: "Task id is required." }, 400);
      const status = TASK_STATUS_VALUES.has(body.status) ? body.status : "To Do";
      const priority = PRIORITY_VALUES.has(body.priority) ? body.priority : "P2";
      const rows = await sql.query(
        `UPDATE history_tasks SET title=$2,department=$3,status=$4,priority=$5,due_date=$6,notes=$7,updated_at=NOW() WHERE id=$1 RETURNING *`,
        [id, cleanString(body.title, 500), cleanString(body.department, 200), status, priority, cleanString(body.dueDate, 20) || null, cleanString(body.notes)],
      );
      return rows[0] ? json(mapHistoryTask(rows[0])) : json({ error: "Task not found." }, 404);
    }

    if (resource === "series") {
      const id = cleanString(body.id, 80);
      if (!id) return json({ error: "Series id is required." }, 400);
      const rows = await sql.query(
        `UPDATE history_series SET name=$2,description=$3,updated_at=NOW() WHERE id=$1 RETURNING *`,
        [id, cleanString(body.name, 300), cleanString(body.description)],
      );
      return rows[0] ? json(mapHistorySeries(rows[0])) : json({ error: "Series not found." }, 404);
    }

    if (resource === "settings") {
      const requested = body as Partial<HistorySettings>;
      const format = FORMAT_VALUES.has(requested.defaultFormat || "") ? requested.defaultFormat : DEFAULT_HISTORY_SETTINGS.defaultFormat;
      const workflow = cleanWorkflow(requested.workflow);
      if (!workflow.length) return json({ error: "Workflow must contain at least one stage." }, 400);
      const requestedNames = Array.isArray(requested.workflow)
        ? requested.workflow.map((item: any) => cleanString(item?.name, 120)).filter(Boolean)
        : [];
      if (new Set(requestedNames.map((name) => name.toLocaleLowerCase("en-US"))).size !== requestedNames.length) {
        return json({ error: "Workflow stage names must be unique." }, 400);
      }
      const usedStatuses = await sql.query(`SELECT DISTINCT status FROM history_videos WHERE status IS NOT NULL AND status <> ''`);
      const names = new Set(workflow.map((step) => step.name));
      const missing = usedStatuses.map((row) => row.status).filter((status) => !names.has(status));
      if (missing.length) {
        return json({ error: `Move videos out of these stages before removing or renaming them: ${missing.join(", ")}.` }, 409);
      }
      const rows = await sql.query(
        `UPDATE history_settings SET channel_name=$2,youtube_channel_url=$3,timezone=$4,default_format=$5,ai_master_instructions=$6,workflow=$7::jsonb,updated_at=NOW() WHERE id=$1 RETURNING *`,
        [
          "main",
          cleanString(requested.channelName, 300) || DEFAULT_HISTORY_SETTINGS.channelName,
          cleanString(requested.youtubeChannelUrl, 2000),
          cleanString(requested.timezone, 100) || "Europe/Malta",
          format,
          cleanString(requested.aiMasterInstructions, 20000) || DEFAULT_HISTORY_SETTINGS.aiMasterInstructions,
          JSON.stringify(workflow),
        ],
      );
      return json(mapHistorySettings(rows[0]));
    }

    return json({ error: "Unknown resource." }, 404);
  } catch (error) {
    console.error("History PATCH failed", error);
    return json({ error: error instanceof Error ? error.message : "Update operation failed." }, 500);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAuthorized();
  if (denied) return denied;
  try {
    await ensureHistorySchema();
    const sql = historyDb();
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource") || "";
    const id = cleanString(url.searchParams.get("id"), 100);
    if (!id) return json({ error: "id is required." }, 400);
    const tableByResource: Record<string, string> = {
      videos: "history_videos",
      sources: "history_sources",
      assets: "history_prompt_assets",
      tasks: "history_tasks",
      series: "history_series",
    };
    const table = tableByResource[resource];
    if (!table) return json({ error: "Unknown resource." }, 404);
    await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return json({ ok: true });
  } catch (error) {
    console.error("History DELETE failed", error);
    return json({ error: error instanceof Error ? error.message : "Delete operation failed." }, 500);
  }
}
