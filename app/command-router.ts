import type { StartpageConfig } from "./startpage-config";

export type CommandMode = "idle" | "web" | "agent" | "open";

export type CommandRoute =
  | { kind: "idle"; label: "⌘ K /" }
  | { kind: "google"; label: "WEB ↗"; query: string }
  | { kind: "agent"; label: "AGENT"; text: string }
  | { kind: "open"; label: "OPEN ↗"; url: string; name: string };

export type CommandItem = {
  name: string;
  url: string;
  group: string;
  aliases: string[];
};

const GENERIC_OPEN_WORDS = /\b(aç|ac|open|git|göster|goster|başlat|baslat)\b/giu;
const FILLER_WORDS = /\b(hesabımı|hesabimı|hesabim|hesabı|hesabi|panelini|paneli|sayfasını|sayfasini|sitesini|siteyi|lütfen|lutfen|bana|yeni sekmede)\b/giu;

const KNOWN_ALIASES: Record<string, string[]> = {
  vercel: ["deploy", "deployment", "yayın", "yayin", "hosting"],
  github: ["repo", "repolar", "repository", "kod deposu"],
  supabase: ["database", "veritabanı", "veritabani", "storage"],
  neon: ["postgres", "postgresql", "neon database"],
  chatgpt: ["openai", "chat gpt"],
  gemini: ["google gemini"],
  "omeryigitler.com": ["portföy", "portfoy", "ana site", "web sitem"],
};

export function normalizeCommand(value: string) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9çğıöşü.:/@?\-\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function aliasesFor(name: string) {
  const normalized = normalizeCommand(name);
  const compact = normalized.replace(/\s+/g, "");
  const firstWord = normalized.split(" ")[0] || normalized;
  const known = Object.entries(KNOWN_ALIASES).flatMap(([key, aliases]) =>
    normalized.includes(key) || key.includes(normalized) ? [key, ...aliases] : [],
  );
  return [...new Set([normalized, compact, firstWord, ...known.map(normalizeCommand)].filter(Boolean))];
}

export function commandItems(config: StartpageConfig): CommandItem[] {
  return [
    ...config.projects.map((project) => ({
      name: project.name,
      url: project.url,
      group: "Projeler",
      aliases: aliasesFor(project.name),
    })),
    ...config.folders.flatMap((folder) =>
      folder.links.map((link) => ({
        name: link.name,
        url: link.url,
        group: folder.title,
        aliases: aliasesFor(link.name),
      })),
    ),
  ].filter((item) => Boolean(safeHttpUrl(item.url)));
}

export function findOpenTarget(value: string, config: StartpageConfig) {
  const normalized = normalizeCommand(value);
  const wantsOpen = GENERIC_OPEN_WORDS.test(normalized);
  GENERIC_OPEN_WORDS.lastIndex = 0;

  let targetText = normalized
    .replace(GENERIC_OPEN_WORDS, " ")
    .replace(FILLER_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  GENERIC_OPEN_WORDS.lastIndex = 0;
  FILLER_WORDS.lastIndex = 0;

  if (!targetText && !wantsOpen) targetText = normalized;
  const items = commandItems(config);

  const scored = items
    .map((item) => {
      const itemName = normalizeCommand(item.name);
      let score = 0;
      if (targetText === itemName) score = 100;
      else if (item.aliases.some((alias) => targetText === alias)) score = 95;
      else if (item.aliases.some((alias) => targetText.includes(alias) && alias.length >= 3)) score = 75;
      else if (itemName.includes(targetText) && targetText.length >= 3) score = 55;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!scored[0]) return null;
  if (!wantsOpen && scored[0].score < 95) return null;
  return scored[0].item;
}

export function routeCommand(value: string, config: StartpageConfig): CommandRoute {
  const trimmed = String(value || "").trim();
  if (!trimmed) return { kind: "idle", label: "⌘ K /" };

  if (trimmed.startsWith("@")) {
    return { kind: "agent", label: "AGENT", text: trimmed.slice(1).trim() };
  }
  if (/^a\s*:/i.test(trimmed)) {
    return { kind: "agent", label: "AGENT", text: trimmed.replace(/^a\s*:/i, "").trim() };
  }
  if (trimmed.startsWith("?") || /^(g|web)\s*:/i.test(trimmed)) {
    return {
      kind: "google",
      label: "WEB ↗",
      query: trimmed.replace(/^\?|^(g|web)\s*:/i, "").trim(),
    };
  }

  const directUrl = safeHttpUrl(trimmed);
  if (directUrl) return { kind: "open", label: "OPEN ↗", url: directUrl, name: directUrl };

  const target = findOpenTarget(trimmed, config);
  if (target) return { kind: "open", label: "OPEN ↗", url: target.url, name: target.name };

  return { kind: "google", label: "WEB ↗", query: trimmed };
}

export function googleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
