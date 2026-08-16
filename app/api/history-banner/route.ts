import part0 from "./banner-part0";
import part1 from "./banner-part1";
import part2 from "./banner-part2";
import part3 from "./banner-part3";
import part4 from "./banner-part4";

export const runtime = "nodejs";

const BANNER = Buffer.from(part0 + part1 + part2 + part3 + part4, "base64");

export function GET() {
  return new Response(BANNER, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(BANNER.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
