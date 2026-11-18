"use client";
import { useRef, useState, type ReactNode } from "react";

/** A scrolling area with pull-to-refresh: drag down from the top and let go. */
export default function PullScroll({ onRefresh, className, children }: { onRefresh: () => Promise<unknown>; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const THRESHOLD = 56;

  const end = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !busy) {
      setBusy(true);
      setPull(THRESHOLD);
      Promise.resolve(onRefresh()).finally(() => { setBusy(false); setPull(0); });
    } else setPull(0);
  };

  return (
    <div
      ref={ref}
      className={className}
      onTouchStart={(e) => { startY.current = ref.current && ref.current.scrollTop <= 0 && !busy ? e.touches[0].clientY : null; }}
      onTouchMove={(e) => {
        if (startY.current === null) return;
        const dy = e.touches[0].clientY - startY.current;
        if (dy > 0 && ref.current && ref.current.scrollTop <= 0) setPull(Math.min(dy * 0.5, 90));
        else { startY.current = null; setPull(0); }
      }}
      onTouchEnd={end}
      onTouchCancel={end}
    >
      <div className="m-pull" style={{ height: pull, transition: startY.current === null ? "height .2s" : "none" }} aria-hidden={pull === 0}>
        {pull > 8 && <span>{busy ? "Refreshing…" : pull >= THRESHOLD ? "Release to refresh" : "Pull to refresh"}</span>}
      </div>
      {children}
    </div>
  );
}
