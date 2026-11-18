"use client";

/** The black screen: a full-screen button so the first touch only wakes the dashboard and doesn't press anything underneath. */
export default function NightScreen({ onWake }: { onWake: () => void }) {
  return (
    <button
      type="button"
      aria-label="Wake the screen"
      onClick={onWake}
      style={{ position: "fixed", inset: 0, zIndex: 1000, width: "100%", height: "100%", border: 0, padding: 0, margin: 0, background: "#000", cursor: "default" }}
    />
  );
}
