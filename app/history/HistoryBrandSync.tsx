"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LOGO_SRC = "/api/history-logo";

type BannerRect = { left: number; top: number; size: number } | null;

export default function HistoryBrandSync() {
  const [mounted, setMounted] = useState(false);
  const [bannerRect, setBannerRect] = useState<BannerRect>(null);

  useEffect(() => {
    setMounted(true);
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document
          .querySelectorAll<HTMLImageElement>(".thaBrand img, .thaMobileBar img, .thaBrandCard > img:first-child")
          .forEach((image) => {
            if (image.getAttribute("src") !== LOGO_SRC) image.setAttribute("src", LOGO_SRC);
          });

        const banner = document.querySelector<HTMLImageElement>(".thaBanner");
        if (!banner) {
          setBannerRect(null);
          return;
        }

        const rect = banner.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > window.innerHeight) {
          setBannerRect(null);
          return;
        }

        const size = Math.min(rect.width * 0.17, rect.height * 0.92);
        setBannerRect({
          left: rect.left + rect.width * 0.302,
          top: rect.top + rect.height * 0.5,
          size,
        });
      });
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, []);

  if (!mounted || !bannerRect) return null;

  return createPortal(
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden="true"
      className="thaBannerLogoOverlay"
      style={{
        left: bannerRect.left,
        top: bannerRect.top,
        width: bannerRect.size,
        height: bannerRect.size,
      }}
    />,
    document.body,
  );
}
