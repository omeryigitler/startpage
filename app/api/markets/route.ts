import { NextRequest, NextResponse } from "next/server";

const aliases: Record<string, string> = {
  XAU: "XAU/USD",
  BTC: "BTC/USD",
  EURTRY: "EUR/TRY"
};

export async function GET(request: NextRequest) {
  const symbols = (request.nextUrl.searchParams.get("symbols") || "")
    .split(",")
    .map(value => value.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 12);

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "TWELVE_DATA_API_KEY missing" }, { status: 503 });

  const output: Record<string, { value: string; change: string }> = {};

  await Promise.all(symbols.map(async original => {
    const symbol = aliases[original] || original;
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return;
    const data = await response.json();
    if (data.status === "error") return;
    const close = Number(data.close);
    const percent = Number(data.percent_change);
    if (!Number.isFinite(close)) return;
    output[original] = {
      value: new Intl.NumberFormat("en-US", { maximumFractionDigits: close < 10 ? 4 : 2 }).format(close),
      change: `${percent >= 0 ? "+" : ""}${Number.isFinite(percent) ? percent.toFixed(2) : "0.00"}%`
    };
  }));

  return NextResponse.json(output, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } });
}
