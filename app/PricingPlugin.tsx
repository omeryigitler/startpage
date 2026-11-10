"use client";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { AGENCY_ORIGIN } from "./agency-model";
import styles from "./agency.module.css";
export default function PricingPlugin({ context }: { context?: Record<string, unknown> | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(context);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState(false);
  latest.current = context;
  useEffect(() => {
    setReady(false); setSlow(false);
    const timeout = setTimeout(() => setSlow(true), 14000);
    function message(event: MessageEvent) {
      if (event.origin !== AGENCY_ORIGIN || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "PRICING_TOOL_READY") {
        setReady(true); clearTimeout(timeout);
        if (latest.current) frame.current?.contentWindow?.postMessage({ type: "PRE_FILL_CLIENT", data: latest.current }, AGENCY_ORIGIN);
      }
      if (event.data?.type === "TAURUS_PRICING_SAVED") setSaved(true);
    }
    window.addEventListener("message", message);
    return () => { clearTimeout(timeout); window.removeEventListener("message", message); };
  }, [retry]);
  return <div className={styles.legacy}>
    {saved && <div className={styles.pluginStatus} role="status">Proposal and project saved. Final approval remains manual.</div>}
    {!ready && <div className={styles.connection} role="status"><RefreshCw size={25} /><h3>{slow ? "The pricing module is taking longer than expected" : "Opening Pricing"}</h3><p>Your calculator runs as an independent module with its own build and save interface.</p>{slow && <><button onClick={() => setRetry(value => value + 1)}>Retry module</button><a href={`${AGENCY_ORIGIN}/tools/pricing/index.html?plugin=agency`} target="_blank" rel="noopener noreferrer">Open module <ExternalLink size={14} /></a></>}</div>}
    <iframe key={retry} ref={frame} title="Taurus Pricing module" src={`${AGENCY_ORIGIN}/tools/pricing/index.html?plugin=agency&version=1`} className={ready ? styles.frame : styles.frameLoading} referrerPolicy="strict-origin" />
  </div>;
}
