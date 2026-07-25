"use client";

import { useEffect } from "react";

function openSafely(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}

export default function SearchNewTabGuard() {
  useEffect(() => {
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form?.classList.contains("centerSearchForm")) return;

      const input = form.querySelector<HTMLInputElement>("input");
      const value = input?.value.trim() || "";
      if (!value) return;

      const firstResult = form.parentElement?.querySelector<HTMLAnchorElement>(".centerSearchResults a[href]");
      const destination = firstResult?.href || (
        /^https?:\/\//i.test(value)
          ? value
          : `https://www.google.com/search?q=${encodeURIComponent(value)}`
      );

      event.preventDefault();
      event.stopImmediatePropagation();
      openSafely(destination);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(".centerSearchResults a[href]") : null;
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openSafely(target.href);
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
