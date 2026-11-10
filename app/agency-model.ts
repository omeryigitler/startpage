export const AGENCY_ORIGIN = "https://omeryigitler.com";
export const agencySections = [
  { id: "overview", title: "Overview", description: "Your daily agency workspace" },
  { id: "sales", title: "Sales", description: "Prospect research across Malta and Türkiye" },
  { id: "studio", title: "Studio", description: "Research, private concepts and draft review" },
  { id: "projects", title: "Projects", description: "Project delivery and operations", view: "projects" },
  { id: "clients", title: "Clients", description: "Client records and relationships", view: "clients" },
  { id: "quotes", title: "Proposals", description: "Proposals, approvals and PDFs", view: "quotes" },
  { id: "pricing", title: "Pricing", description: "Independent pricing module for Türkiye and Malta", plugin: "pricing" },
  { id: "messages", title: "Inbox", description: "Incoming requests and conversations", view: "messages" },
  { id: "world", title: "World", description: "Live visitor intelligence and globe", view: "intelligence" },
  { id: "control", title: "AI controls", description: "Execution mode and usage limits" },
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
  research?: { score: number; status: string; signals: string[]; limitations: string[]; checkedUrl?: string; at: number };
  draft?: Concept;
};
export type Concept = { status: "review" | "approved" | "rejected"; revision: string; generatedBy: string; language: string; industryLabel: string; headline: string; subheading: string; cta: string; sections: { title: string; body: string }[]; brief: { goal: string; exclusions: string[] }; proposal: { request: Record<string, unknown>; breakdown: { finalTotal: number }; scope: string[]; disclaimer: string } };
export type StudioJob = { id: string; title: string; role: string; prospectId: string; status: string; reason?: string; kind?: string; errorCode?: string; attempts?: number; steps?: { label: string; at: number }[]; output?: string[] };
export type StudioRecords = { prospects: Prospect[]; jobs: StudioJob[]; stages: string[]; roles: string[]; limit: number; executorAvailable: boolean };
export type AISettings = { enabled: boolean; paused: boolean; mode: "FREE" | "HYBRID"; maxRequestsPerTask: number; maxRequestsPerDay: number; maxConcurrency: number };
export type RunnerStatus = { available: boolean; paused: boolean; maxCompanies: number; regions: { id: string; label: string; country: string }[]; industries: { id: string; label: string }[]; schedule: string };
export type StudioStatus = { settings: AISettings; provider: { configured: boolean; verified: boolean }; paidExecutionAvailable: boolean; runner: RunnerStatus };
