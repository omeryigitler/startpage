import { NextRequest, NextResponse } from "next/server";

const descriptions: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Rain showers",
  82: "Heavy showers", 95: "Thunderstorm", 96: "Thunderstorm with hail possible", 99: "Severe thunderstorm with hail"
};

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  const timezone = request.nextUrl.searchParams.get("timezone") || "auto";
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", timezone);

  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return NextResponse.json({ error: "Weather data could not be loaded" }, { status: 502 });
  const data = await response.json();
  const code = Number(data.current?.weather_code ?? -1);
  return NextResponse.json({
    temp: Math.round(data.current?.temperature_2m),
    feels: Math.round(data.current?.apparent_temperature),
    wind: Math.round(data.current?.wind_speed_10m),
    text: descriptions[code] || "Variable",
    high: Math.round(data.daily?.temperature_2m_max?.[0]),
    low: Math.round(data.daily?.temperature_2m_min?.[0]),
    rain: Math.round(data.daily?.precipitation_probability_max?.[0] ?? 0),
    code,
    isDay: Number(data.current?.is_day ?? 1) === 1
  }, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=300" }
  });
}
