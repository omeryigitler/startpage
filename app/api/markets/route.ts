import { NextRequest, NextResponse } from "next/server";

const twelveAliases: Record<string, string> = {
  XAU: "XAU/USD",
  BTC: "BTC/USD",
  EURTRY: "EUR/TRY",
};

const yahooAliases: Record<string, string> = {
  XAU: "GC=F",
  BTC: "BTC-USD",
  EURTRY: "EURTRY=X",
};

type Quote = { value: string; change: string };

function formatQuote(price: number, previous: number): Quote | null {
  if (!Number.isFinite(price)) return null;
  const percent = Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : 0;
  return {
    value: new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: price < 10 ? 4 : 2,
    }).format(price),
    change: `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`,
  };
}

async function fetchFromTwelveData(original: string, apiKey: string): Promise<Quote | null> {
  try {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", twelveAliases[original] || original);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status === "error") return null;

    const price = Number(data.close);
    const previous = Number(data.previous_close);
    const directPercent = Number(data.percent_change);
    const quote = formatQuote(price, previous);
    if (!quote) return null;

    if (Number.isFinite(directPercent)) {
      quote.change = `${directPercent >= 0 ? "+" : ""}${directPercent.toFixed(2)}%`;
    }
    return quote;
  } catch {
    return null;
  }
}

async function fetchFromYahoo(original: string): Promise<Quote | null> {
  try {
    const symbol = yahooAliases[original] || original;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const closes = (result.indicators?.quote?.[0]?.close || []).filter((value: unknown) => Number.isFinite(Number(value)));
    const price = Number(meta.regularMarketPrice ?? closes.at(-1));
    const previous = Number(meta.chartPreviousClose ?? meta.previousClose ?? closes.at(-2));
    return formatQuote(price, previous);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get("symbols") || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 12);

  const apiKey = process.env.TWELVE_DATA_API_KEY || "";
  const output: Record<string, Quote> = {};

  await Promise.all(
    symbols.map(async (original) => {
      const primary = apiKey ? await fetchFromTwelveData(original, apiKey) : null;
      const quote = primary || (await fetchFromYahoo(original));
      if (quote) output[original] = quote;
    }),
  );

  return NextResponse.json(output, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
