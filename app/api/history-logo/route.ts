import part0 from "./logo-part0";
import part1 from "./logo-part1";
import part2 from "./logo-part2";
import part3 from "./logo-part3";

export const runtime = "nodejs";

const LOGO = Buffer.from(part0 + part1 + part2 + part3, "base64");

export function GET() {
  return new Response(LOGO, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(LOGO.byteLength),
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
