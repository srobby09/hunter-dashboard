"use client";
import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import MobileApp from "./mobile/MobileApp";

// Phone layout below 600px wide, or in portrait under 700px. The iPad / wall layout is used above that.
const PHONE = "(max-width: 599px), (orientation: portrait) and (max-width: 699px)";

export default function App() {
  const [phone, setPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  if (phone === null) return <div className="app" />; // before the screen size is known
  return phone ? <MobileApp /> : <Dashboard />;
}
