import { NextRequest, NextResponse } from "next/server";

const descriptions: Record<number, string> = {
  0: "Açık", 1: "Çoğunlukla açık", 2: "Parçalı bulutlu", 3: "Kapalı",
  45: "Sisli", 48: "Kırağılı sis", 51: "Hafif çiseleme", 53: "Çiseleme",
  55: "Yoğun çiseleme", 61: "Hafif yağmur", 63: "Yağmur", 65: "Kuvvetli yağmur",
  71: "Hafif kar", 73: "Kar", 75: "Yoğun kar", 80: "Sağanak", 81: "Sağanak",
  82: "Kuvvetli sağanak", 95: "Gök gürültülü", 96: "Dolu ihtimali", 99: "Kuvvetli dolu"
};

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  const timezone = request.nextUrl.searchParams.get("timezone") || "auto";
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Geçersiz koordinat" }, { status: 400 });
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", timezone);

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) return NextResponse.json({ error: "Hava durumu alınamadı" }, { status: 502 });
  const data = await response.json();
  const code = Number(data.current?.weather_code ?? -1);
  return NextResponse.json({
    temp: Math.round(data.current?.temperature_2m),
    feels: Math.round(data.current?.apparent_temperature),
    wind: Math.round(data.current?.wind_speed_10m),
    text: descriptions[code] || "Değişken",
    high: Math.round(data.daily?.temperature_2m_max?.[0]),
    low: Math.round(data.daily?.temperature_2m_min?.[0]),
    rain: Math.round(data.daily?.precipitation_probability_max?.[0] ?? 0),
    code,
    isDay: Number(data.current?.is_day ?? 1) === 1
  });
}
