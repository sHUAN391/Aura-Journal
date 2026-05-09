import { NextResponse } from "next/server";

type HealingImageRequest = {
  ventText?: string;
  profile?: {
    name?: string;
    birthLocation?: string;
    elements?: Array<{ name: string; value: number; note?: string }>;
  } | null;
  status?: string;
};

function dominantElement(profile: HealingImageRequest["profile"]) {
  if (!profile?.elements?.length) return "Water";
  return [...profile.elements].sort((a, b) => b.value - a.value)[0].name;
}

function elementColors(element: string) {
  const colors: Record<string, { bg: string; ink: string; soft: string }> = {
    Wood: { bg: "#e8f3e8", ink: "#047857", soft: "#bbf7d0" },
    Fire: { bg: "#fff5f0", ink: "#ea580c", soft: "#fed7aa" },
    Earth: { bg: "#fcf8ef", ink: "#ca8a04", soft: "#fef08a" },
    Metal: { bg: "#f5f5f5", ink: "#475569", soft: "#e2e8f0" },
    Water: { bg: "#f0f7ff", ink: "#2563eb", soft: "#bfdbfe" },
  };
  return colors[element] ?? colors.Water;
}

function buildPrompt({ ventText, profile, status }: HealingImageRequest) {
  const element = dominantElement(profile);
  const location = profile?.birthLocation || "their local place";
  return [
    "A gentle therapeutic illustration for an emotional journaling app.",
    `User dominant element: ${element}.`,
    `Emotional state: ${status || "reflective"}.`,
    `Location context: ${location}.`,
    `Venting text theme: ${ventText || "unnamed pressure"}.`,
    "Style: handmade paper texture, soft ink, quiet rain, warm spiritual diary, abstract and calming, no text in the image.",
  ].join(" ");
}

function fallbackSvgDataUrl(prompt: string, element: string, status?: string) {
  const colors = elementColors(element);
  const safeElement = element.replace(/[<>&]/g, "");
  const safeStatus = (status || "reflective").replace(/[<>&]/g, "");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${colors.bg}"/>
  <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer></filter>
  <rect width="1024" height="1024" filter="url(#paper)" opacity="0.45"/>
  <circle cx="512" cy="420" r="260" fill="${colors.soft}" opacity="0.55"/>
  <path d="M255 615 C360 500, 468 710, 610 540 S835 535, 772 710" fill="none" stroke="${colors.ink}" stroke-width="12" stroke-linecap="round" opacity="0.5"/>
  <path d="M330 320 C410 210, 560 210, 665 325 C760 430, 742 570, 633 645 C510 730, 350 672, 300 535 C270 455, 282 382, 330 320Z" fill="none" stroke="${colors.ink}" stroke-width="5" stroke-dasharray="18 18" opacity="0.45"/>
  <g opacity="0.35" stroke="${colors.ink}" stroke-width="4" stroke-linecap="round">
    <line x1="210" y1="120" x2="188" y2="174"/><line x1="790" y1="110" x2="770" y2="160"/><line x1="860" y1="440" x2="836" y2="500"/><line x1="145" y1="455" x2="120" y2="515"/><line x1="535" y1="790" x2="512" y2="850"/>
  </g>
  <text x="512" y="890" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${colors.ink}" opacity="0.68">${safeElement} · ${safeStatus}</text>
</svg>`;
  return {
    imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    prompt,
    provider: "fallback-svg",
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as HealingImageRequest;
  const element = dominantElement(body.profile);
  const prompt = buildPrompt(body);

  // Fallback first: this keeps the UI working before a real image model key is configured.
  // Later this route can call Gemini, OpenAI Images, Replicate, Fal, or Stability AI here.
  return NextResponse.json(fallbackSvgDataUrl(prompt, element, body.status));
}
