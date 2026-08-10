function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="The History Archived">
  <defs>
    <radialGradient id="logo-bg" cx="50%" cy="38%" r="68%">
      <stop offset="0" stop-color="#2b2112"/>
      <stop offset="0.58" stop-color="#100d08"/>
      <stop offset="1" stop-color="#050505"/>
    </radialGradient>
    <linearGradient id="logo-bronze" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0d08a"/>
      <stop offset="0.24" stop-color="#a8752d"/>
      <stop offset="0.52" stop-color="#f5d991"/>
      <stop offset="0.78" stop-color="#7b4d1f"/>
      <stop offset="1" stop-color="#d7ab5d"/>
    </linearGradient>
    <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="128" cy="128" r="121" fill="url(#logo-bg)" stroke="#49351d" stroke-width="2"/>
  <circle cx="128" cy="128" r="101" fill="none" stroke="url(#logo-bronze)" stroke-width="3"/>
  <circle cx="128" cy="128" r="88" fill="none" stroke="#6c4a24" stroke-width="1" opacity="0.8"/>
  <g fill="none" stroke="url(#logo-bronze)" stroke-linecap="round" filter="url(#logo-glow)">
    <path d="M128 35 L142 91 L128 116 L114 91 Z" stroke-width="2.4"/>
    <path d="M128 221 L114 165 L128 140 L142 165 Z" stroke-width="2.4"/>
    <path d="M35 128 L91 114 L116 128 L91 142 Z" stroke-width="2.4"/>
    <path d="M221 128 L165 142 L140 128 L165 114 Z" stroke-width="2.4"/>
    <circle cx="128" cy="128" r="24" stroke-width="2"/>
    <path d="M109 128 Q128 111 147 128 Q128 145 109 128 Z" stroke-width="2"/>
  </g>
  <circle cx="128" cy="128" r="6" fill="#d6aa55"/>
  <text x="128" y="78" text-anchor="middle" fill="#dbc183" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="700" letter-spacing="3">THA</text>
  <text x="128" y="190" text-anchor="middle" fill="#9f7b45" font-family="Arial, sans-serif" font-size="8" letter-spacing="4">ARCHIVE</text>
</svg>`;

const bannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 375" role="img" aria-label="The History Archived — Empires. Mysteries. Forgotten Truths.">
  <defs>
    <linearGradient id="banner-bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#090806"/>
      <stop offset="0.22" stop-color="#1c140b"/>
      <stop offset="0.5" stop-color="#0e0b07"/>
      <stop offset="0.78" stop-color="#1a1209"/>
      <stop offset="1" stop-color="#070706"/>
    </linearGradient>
    <radialGradient id="banner-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#9d6728" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#9d6728" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="banner-bronze" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f2d691"/>
      <stop offset="0.22" stop-color="#a56f2d"/>
      <stop offset="0.48" stop-color="#f0cf7e"/>
      <stop offset="0.72" stop-color="#7d4d1d"/>
      <stop offset="1" stop-color="#d9b263"/>
    </linearGradient>
    <filter id="banner-noise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="3" seed="9" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.38  0 0 0 0 0.16  0 0 0 .17 0"/>
    </filter>
    <filter id="banner-soft-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="1920" height="375" rx="18" fill="url(#banner-bg)"/>
  <rect width="1920" height="375" rx="18" fill="url(#banner-glow)" opacity="0.8"/>
  <rect x="0" y="0" width="1920" height="375" rx="18" filter="url(#banner-noise)" opacity="0.5"/>

  <g opacity="0.45" stroke="#704b21" stroke-width="1">
    <path d="M70 84 H455"/><path d="M70 292 H455"/>
    <path d="M1465 84 H1850"/><path d="M1465 292 H1850"/>
    <path d="M112 108 C215 68 320 67 425 109" fill="none"/>
    <path d="M1495 266 C1600 307 1707 307 1810 267" fill="none"/>
  </g>

  <g transform="translate(565 187.5)" filter="url(#banner-soft-glow)">
    <circle r="113" fill="#0a0907" stroke="#563b1e" stroke-width="2"/>
    <circle r="94" fill="none" stroke="url(#banner-bronze)" stroke-width="3"/>
    <circle r="82" fill="none" stroke="#684722" stroke-width="1"/>
    <g fill="none" stroke="url(#banner-bronze)" stroke-linecap="round">
      <path d="M0 -78 L11 -25 L0 -6 L-11 -25 Z" stroke-width="2.2"/>
      <path d="M0 78 L-11 25 L0 6 L11 25 Z" stroke-width="2.2"/>
      <path d="M-78 0 L-25 -11 L-6 0 L-25 11 Z" stroke-width="2.2"/>
      <path d="M78 0 L25 11 L6 0 L25 -11 Z" stroke-width="2.2"/>
      <path d="M-23 0 Q0 -18 23 0 Q0 18 -23 0 Z" stroke-width="2"/>
    </g>
    <circle r="5" fill="#d8ad58"/>
    <text x="0" y="-43" text-anchor="middle" fill="#e2c883" font-family="Georgia, 'Times New Roman', serif" font-size="24" font-weight="700" letter-spacing="3">THA</text>
  </g>

  <g transform="translate(720 0)">
    <text x="0" y="94" fill="#b79a66" font-family="Arial, sans-serif" font-size="22" letter-spacing="10">THE</text>
    <line x1="72" y1="86" x2="308" y2="86" stroke="#79613b" stroke-width="1"/>
    <text x="0" y="184" fill="url(#banner-bronze)" font-family="Georgia, 'Times New Roman', serif" font-size="86" letter-spacing="4">HISTORY</text>
    <text x="0" y="270" fill="url(#banner-bronze)" font-family="Georgia, 'Times New Roman', serif" font-size="76" letter-spacing="7">ARCHIVED</text>
    <text x="3" y="315" fill="#aa966f" font-family="Arial, sans-serif" font-size="18" letter-spacing="4">EMPIRES. MYSTERIES. FORGOTTEN TRUTHS.</text>
    <line x1="3" y1="337" x2="825" y2="337" stroke="#69502d" stroke-width="1" opacity="0.7"/>
    <path d="M407 327 l12 10 -12 10 -12 -10 z" fill="none" stroke="#87683a" stroke-width="1"/>
  </g>

  <rect x="1" y="1" width="1918" height="373" rx="17" fill="none" stroke="#30271a" stroke-width="2"/>
</svg>`;

export const LOGO_IMAGE = svgDataUri(logoSvg);
export const BANNER_IMAGE = svgDataUri(bannerSvg);
