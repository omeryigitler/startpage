import part0 from "./logo-part0";
import part1 from "./logo-part1";
import part2 from "./logo-part2";
import part3 from "./logo-part3";

const logoBytes = Uint8Array.from(Buffer.from(part0 + part1 + part2 + part3, "base64"));

export function GET() {
  return new Response(logoBytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
