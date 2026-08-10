export type StartpageConfig = {
  greeting?: string;
  projects: { name: string; url: string; github?: string; vercel?: string; status?: string }[];
  folders: { title: string; subtitle: string; links: { name: string; url: string; note?: string }[] }[];
  markets: { symbol: string; name: string; type: string }[];
  cities: { name: string; country: string; latitude: number; longitude: number; timezone: string }[];
};

const ENGLISH_TEXT: Record<string, string> = {
  "Aktif": "Active",
  "Geliştiriliyor": "In development",
  "Çalışma Araçları": "Work Tools",
  "Kod, yayın ve operasyon": "Code, deployment and operations",
  "Kod ve repository": "Code and repositories",
  "Deploy ve domain": "Deployments and domains",
  "Veri ve storage": "Data and storage",
  "Yapay Zekâ": "AI Tools",
  "Üretim ve araştırma": "Creation and research",
  "Tasarım Kaynakları": "Design Resources",
  "İlham, arayüz ve tipografi": "Inspiration, interface and typography",
  "Sosyal": "Social",
  "İçerik ve iletişim": "Content and communication",
  "Altın": "Gold",
  "Euro / TL": "Euro / TRY",
  "Türkiye": "Turkey",
  "Belçika": "Belgium",
};

function englishText(value: string | undefined) {
  if (!value) return value;
  return ENGLISH_TEXT[value] || value;
}

export function normalizeEnglishConfig(config: StartpageConfig): StartpageConfig {
  return {
    ...config,
    greeting: englishText(config.greeting) || "",
    projects: config.projects.map((project) => ({
      ...project,
      status: englishText(project.status),
    })),
    folders: config.folders.map((folder) => ({
      ...folder,
      title: englishText(folder.title) || folder.title,
      subtitle: englishText(folder.subtitle) || folder.subtitle,
      links: folder.links.map((link) => ({
        ...link,
        note: englishText(link.note),
      })),
    })),
    markets: config.markets.map((market) => ({
      ...market,
      name: englishText(market.name) || market.name,
    })),
    cities: config.cities.map((city) => ({
      ...city,
      country: englishText(city.country) || city.country,
    })),
  };
}

export const defaultConfig: StartpageConfig = {
  greeting: "",
  projects: [
    { name: "omeryigitler.com", url: "https://omeryigitler.com", github: "https://github.com/omeryigitler/omeryigitler.com", status: "Active" },
    { name: "Built With Seyhan", url: "https://builtwithseyhan.com", status: "Active" },
    { name: "Berfin Akbaş", url: "https://berfinakbas.com", status: "Active" },
    { name: "Dawl Studio", url: "https://dawlstudio.com", status: "In development" },
    { name: "The History Archived", url: "https://start.omeryigitler.com/history", status: "Content Command Center" }
  ],
  folders: [
    { title: "Work Tools", subtitle: "Code, deployment and operations", links: [
      { name: "GitHub", url: "https://github.com", note: "Code and repositories" },
      { name: "Vercel", url: "https://vercel.com", note: "Deployments and domains" },
      { name: "Supabase", url: "https://supabase.com", note: "Data and storage" },
      { name: "Neon", url: "https://neon.tech", note: "PostgreSQL" }
    ]},
    { title: "AI Tools", subtitle: "Creation and research", links: [
      { name: "ChatGPT", url: "https://chatgpt.com" }, { name: "Claude", url: "https://claude.ai" },
      { name: "Gemini", url: "https://gemini.google.com" }, { name: "Perplexity", url: "https://perplexity.ai" }
    ]},
    { title: "Design Resources", subtitle: "Inspiration, interface and typography", links: [
      { name: "Awwwards", url: "https://awwwards.com" }, { name: "Mobbin", url: "https://mobbin.com" },
      { name: "Pinterest", url: "https://pinterest.com" }, { name: "Dribbble", url: "https://dribbble.com" }
    ]},
    { title: "Social", subtitle: "Content and communication", links: [
      { name: "Instagram", url: "https://instagram.com" }, { name: "LinkedIn", url: "https://linkedin.com" },
      { name: "X", url: "https://x.com" }, { name: "Reddit", url: "https://reddit.com" }
    ]}
  ],
  markets: [
    { symbol: "XAU", name: "Gold", type: "metal" }, { symbol: "BTC", name: "Bitcoin", type: "crypto" },
    { symbol: "EURTRY", name: "Euro / TRY", type: "fx" }, { symbol: "NVDA", name: "NVIDIA", type: "stock" }
  ],
  cities: [
    { name: "Sliema", country: "Malta", latitude: 35.9122, longitude: 14.5042, timezone: "Europe/Malta" },
    { name: "Eskişehir", country: "Turkey", latitude: 39.7767, longitude: 30.5206, timezone: "Europe/Istanbul" },
    { name: "Wetteren", country: "Belgium", latitude: 51.0069, longitude: 3.8855, timezone: "Europe/Brussels" }
  ]
};
