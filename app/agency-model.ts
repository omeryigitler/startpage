export const AGENCY_ORIGIN = "https://omeryigitler.com";
export const agencySections = [
  { id: "overview", title: "Genel bakış", description: "Ajansın günlük çalışma alanı" },
  { id: "sales", title: "Satış", description: "Malta ve Türkiye firma havuzu" },
  { id: "studio", title: "Stüdyo", description: "Ekip rolleri ve görev kuyruğu" },
  { id: "projects", title: "Projeler", description: "Teslimatlar ve proje yönetimi", view: "projects" },
  { id: "clients", title: "Müşteriler", description: "Müşteri kayıtları ve ilişkiler", view: "clients" },
  { id: "quotes", title: "Teklifler", description: "Teklifler, onaylar ve PDF", view: "quotes" },
  { id: "pricing", title: "Fiyatlandırma", description: "Türkiye ve Malta teklif hesabı", view: "pricing" },
  { id: "messages", title: "Mesajlar", description: "Gelen talepler ve iletişim", view: "messages" },
  { id: "world", title: "Dünya", description: "Canlı ziyaretçi ve dünya ekranı", view: "intelligence" },
  { id: "control", title: "AI kontrolü", description: "Çalışma modu ve kullanım sınırları" },
] as const;
export type AgencySection = typeof agencySections[number]["id"];
export function isAgencySection(value: unknown): value is AgencySection {
  return agencySections.some(section => section.id === value);
}
export function agencySectionFromHash(hash: string): AgencySection | null {
  const match = /^#agency(?:\/([a-z]+))?$/.exec(hash);
  if (!match) return null;
  return isAgencySection(match[1]) ? match[1] : "overview";
}
export type Prospect = {
  id: string; name: string; country: "MT" | "TR"; location: string; industry: string;
  website: string | null; source: string; notes: string; stage: string; currency: string;
};
export type StudioJob = { id: string; title: string; role: string; prospectId: string; status: string; reason?: string };
export type StudioRecords = { prospects: Prospect[]; jobs: StudioJob[]; stages: string[]; roles: string[]; limit: number; executorAvailable: boolean };
export type AISettings = { enabled: boolean; paused: boolean; mode: "FREE" | "HYBRID"; maxRequestsPerTask: number; maxRequestsPerDay: number; maxConcurrency: number };
export type StudioStatus = { settings: AISettings; provider: { configured: boolean; verified: boolean }; paidExecutionAvailable: boolean };
