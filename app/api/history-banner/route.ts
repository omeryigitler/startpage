import { LOGO_IMAGE } from "../../history/assets";

const HERO_WIDTH = 2400;
const HERO_HEIGHT = 468;

function buildHeroSvg() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${HERO_WIDTH}" height="${HERO_HEIGHT}" viewBox="0 0 ${HERO_WIDTH} ${HERO_HEIGHT}" role="img" aria-label="The History Archived — Empires. Mysteries. Forgotten Truths.">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050403"/>
      <stop offset=".24" stop-color="#100a05"/>
      <stop offset=".52" stop-color="#090604"/>
      <stop offset=".78" stop-color="#120b05"/>
      <stop offset="1" stop-color="#050403"/>
    </linearGradient>
    <radialGradient id="warmGlow" cx="52%" cy="48%" r="48%">
      <stop offset="0" stop-color="#8b531e" stop-opacity=".26"/>
      <stop offset=".42" stop-color="#5a3414" stop-opacity=".11"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6d995"/>
      <stop offset=".18" stop-color="#d9a94e"/>
      <stop offset=".52" stop-color="#f1ca75"/>
      <stop offset=".78" stop-color="#9c6326"/>
      <stop offset="1" stop-color="#e6b962"/>
    </linearGradient>
    <linearGradient id="lineGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6c401c" stop-opacity=".12"/>
      <stop offset=".5" stop-color="#c48b43" stop-opacity=".78"/>
      <stop offset="1" stop-color="#6c401c" stop-opacity=".12"/>
    </linearGradient>
    <filter id="texture" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".018 .065" numOctaves="3" seed="41" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values=".45 0 0 0 .12  0 .25 0 0 .06  0 0 .08 0 .02  0 0 0 .5 0" result="brownNoise"/>
      <feBlend in="SourceGraphic" in2="brownNoise" mode="screen"/>
    </filter>
    <filter id="logoShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur"/>
      <feOffset dy="8" result="offset"/>
      <feColorMatrix in="offset" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .72 0" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="blur"/>
      <feOffset dy="2" result="offset"/>
      <feColorMatrix in="offset" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .85 0" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="logoClip"><circle cx="724" cy="234" r="183"/></clipPath>
    <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".76"/>
    </radialGradient>
  </defs>

  <rect width="2400" height="468" fill="url(#bg)"/>
  <rect width="2400" height="468" fill="url(#warmGlow)"/>
  <rect x="0" y="0" width="2400" height="468" opacity=".46" filter="url(#texture)"/>

  <!-- Fine bronze fracture lines: deliberately subtle, decorative only. -->
  <g fill="none" stroke="#9c5d26" stroke-opacity=".20" stroke-width="1.4">
    <path d="M0 99 L145 72 211 105 340 51 488 85 560 43 650 78"/>
    <path d="M35 390 L180 347 265 376 375 321 520 351"/>
    <path d="M1760 58 L1840 95 1948 53 2050 102 2195 58 2400 89"/>
    <path d="M1725 395 L1845 345 1940 378 2080 324 2190 365 2400 328"/>
    <path d="M120 22 L171 115 149 181 216 249 164 332"/>
    <path d="M2290 16 L2237 103 2264 176 2201 248 2240 348"/>
  </g>
  <g fill="none" stroke="#d39a4b" stroke-opacity=".11" stroke-width=".8">
    <path d="M0 129 C240 83 351 157 522 119 S786 71 939 107"/>
    <path d="M1440 98 C1631 68 1795 137 1952 99 S2240 67 2400 120"/>
    <path d="M0 342 C223 305 383 364 560 329"/>
    <path d="M1785 344 C1960 300 2150 369 2400 324"/>
  </g>

  <!-- Side archival compass motifs. -->
  <g fill="none" stroke="#9d672d" stroke-opacity=".19">
    <circle cx="260" cy="234" r="176" stroke-width="2"/>
    <circle cx="260" cy="234" r="126"/>
    <circle cx="260" cy="234" r="74"/>
    <path d="M260 41 V427 M67 234 H453 M124 98 L396 370 M396 98 L124 370"/>
    <circle cx="260" cy="234" r="5" fill="#9d672d" fill-opacity=".30"/>
  </g>
  <g fill="none" stroke="#9d672d" stroke-opacity=".19">
    <circle cx="2140" cy="234" r="176" stroke-width="2"/>
    <circle cx="2140" cy="234" r="126"/>
    <circle cx="2140" cy="234" r="74"/>
    <path d="M2140 41 V427 M1947 234 H2333 M2004 98 L2276 370 M2276 98 L2004 370"/>
    <circle cx="2140" cy="234" r="5" fill="#9d672d" fill-opacity=".30"/>
  </g>

  <!-- Original supplied THA medallion, circularly clipped so no square image field is visible. -->
  <circle cx="724" cy="234" r="190" fill="#060403" stroke="#9d642d" stroke-opacity=".35" stroke-width="2"/>
  <image href="${LOGO_IMAGE}" x="535" y="45" width="378" height="378" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)" filter="url(#logoShadow)"/>

  <!-- Wordmark. -->
  <g transform="translate(1000 0)" filter="url(#textShadow)">
    <g fill="url(#gold)">
      <text x="67" y="135" font-family="Georgia, 'Times New Roman', serif" font-size="37" letter-spacing="18">THE</text>
      <text x="0" y="278" font-family="Georgia, 'Times New Roman', serif" font-size="112" letter-spacing="6">HISTORY</text>
      <text x="0" y="401" font-family="Georgia, 'Times New Roman', serif" font-size="101" letter-spacing="4">ARCHIVED</text>
    </g>
    <rect x="0" y="112" width="49" height="2" rx="1" fill="#bd8140" fill-opacity=".72"/>
    <rect x="209" y="112" width="391" height="2" rx="1" fill="url(#lineGold)"/>
    <rect x="0" y="419" width="675" height="1.5" rx="1" fill="url(#lineGold)"/>
    <text x="0" y="453" fill="#d5a85f" font-family="Georgia, 'Times New Roman', serif" font-size="24" letter-spacing="4.2">EMPIRES. MYSTERIES. FORGOTTEN TRUTHS.</text>
  </g>

  <rect width="2400" height="468" fill="url(#vignette)"/>
  <rect x="1" y="1" width="2398" height="466" rx="28" fill="none" stroke="#9b642e" stroke-opacity=".24" stroke-width="2"/>
</svg>`;
}

export function GET() {
  return new Response(buildHeroSvg(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
