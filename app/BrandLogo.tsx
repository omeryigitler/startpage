"use client";

import { useState } from "react";

const linkStyle: React.CSSProperties = {
  justifySelf: "start",
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  borderRadius: 14,
  overflow: "hidden",
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
};

const fallbackStyle: React.CSSProperties = {
  fontFamily: "Space Grotesk, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-.07em",
};

export default function BrandLogo() {
  const [missing, setMissing] = useState(false);

  return (
    <a
      href="https://omeryigitler.com/agent.html"
      target="_blank"
      rel="noreferrer"
      aria-label="Taurus Agent'i aç"
      title="Taurus Agent'i aç"
      style={linkStyle}
    >
      {missing ? (
        <span style={fallbackStyle}>OY<span style={{ color: "#dfff00" }}>.</span></span>
      ) : (
        <img
          src="/logo.png"
          alt="Ömer Yiğitler"
          style={imageStyle}
          onError={() => setMissing(true)}
        />
      )}
    </a>
  );
}
