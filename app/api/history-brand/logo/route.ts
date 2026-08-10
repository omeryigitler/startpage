import { LOGO_IMAGE } from "../../../history/assets";

export const dynamic = "force-static";

export async function GET() {
  const match = LOGO_IMAGE.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return new Response("Brand asset unavailable", { status: 500 });

  const [, contentType, payload] = match;
  return new Response(Buffer.from(payload, "base64"), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
