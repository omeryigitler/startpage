export type StartpageConfig = {
  greeting?: string;
  projects: { name: string; url: string; github?: string; vercel?: string; status?: string }[];
  folders: { title: string; subtitle: string; links: { name: string; url: string; note?: string }[] }[];
  markets: { symbol: string; name: string; type: string }[];
  cities: { name: string; country: string; latitude: number; longitude: number; timezone: string }[];
};

export const defaultConfig: StartpageConfig = {
  greeting: "",
  projects: [
    { name: "omeryigitler.com", url: "https://omeryigitler.com", github: "https://github.com/omeryigitler/omeryigitler.com", status: "Aktif" },
    { name: "Built With Seyhan", url: "https://builtwithseyhan.com", status: "Aktif" },
    { name: "Berfin Akbaş", url: "https://berfinakbas.com", status: "Aktif" },
    { name: "Dawl Studio", url: "https://dawlstudio.com", status: "Geliştiriliyor" },
    { name: "The History Archived", url: "https://start.omeryigitler.com/history", status: "Content Command Center" }
  ],
  folders: [
    { title: "Çalışma Araçları", subtitle: "Kod, yayın ve operasyon", links: [
      { name: "GitHub", url: "https://github.com", note: "Kod ve repository" },
      { name: "Vercel", url: "https://vercel.com", note: "Deploy ve domain" },
      { name: "Supabase", url: "https://supabase.com", note: "Veri ve storage" },
      { name: "Neon", url: "https://neon.tech", note: "PostgreSQL" }
    ]},
    { title: "Yapay Zekâ", subtitle: "Üretim ve araştırma", links: [
      { name: "ChatGPT", url: "https://chatgpt.com" }, { name: "Claude", url: "https://claude.ai" },
      { name: "Gemini", url: "https://gemini.google.com" }, { name: "Perplexity", url: "https://perplexity.ai" }
    ]},
    { title: "Tasarım Kaynakları", subtitle: "İlham, arayüz ve tipografi", links: [
      { name: "Awwwards", url: "https://awwwards.com" }, { name: "Mobbin", url: "https://mobbin.com" },
      { name: "Pinterest", url: "https://pinterest.com" }, { name: "Dribbble", url: "https://dribbble.com" }
    ]},
    { title: "Sosyal", subtitle: "İçerik ve iletişim", links: [
      { name: "Instagram", url: "https://instagram.com" }, { name: "LinkedIn", url: "https://linkedin.com" },
      { name: "X", url: "https://x.com" }, { name: "Reddit", url: "https://reddit.com" }
    ]}
  ],
  markets: [
    { symbol: "XAU", name: "Altın", type: "metal" }, { symbol: "BTC", name: "Bitcoin", type: "crypto" },
    { symbol: "EURTRY", name: "Euro / TL", type: "fx" }, { symbol: "NVDA", name: "NVIDIA", type: "stock" }
  ],
  cities: [
    { name: "Sliema", country: "Malta", latitude: 35.9122, longitude: 14.5042, timezone: "Europe/Malta" },
    { name: "Eskişehir", country: "Türkiye", latitude: 39.7767, longitude: 30.5206, timezone: "Europe/Istanbul" },
    { name: "Wetteren", country: "Belçika", latitude: 51.0069, longitude: 3.8855, timezone: "Europe/Brussels" }
  ]
};
