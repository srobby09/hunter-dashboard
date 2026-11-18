"use client";
import { DOW, sameDay, shortMD, startOfWeek } from "@/lib/dates";
import type { DashboardData } from "@/lib/useDashboardData";
import PullScroll from "./PullScroll";

const local = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

export default function MealsTab({ data, today }: { data: DashboardData; today: Date }) {
  const days = [...data.mealDays].sort((a, b) => (a.date < b.date ? -1 : 1));
  const sub = data.mealsError
    ? data.mealsError === "pickle_not_configured" ? "Not connected to Pickle yet." : data.mealsError === "pickle_unauthorized" ? "Pickle refused the secret. See Settings." : "Pickle offline · showing the last update"
    : `Week of ${shortMD(startOfWeek(today))} · from Pickle`;

  return (
    <div className="m-tab">
      <header className="m-title"><h1>Meals</h1><p>{sub}</p></header>
      <PullScroll className="m-list" onRefresh={data.refreshAll}>
        <ul className="m-meals">
          {days.map((d) => {
            const date = local(d.date);
            const tonight = sameDay(date, today);
            const inner = (
              <>
                <span className="dd"><span className="a">{DOW[date.getDay()]}</span><span className="n">{date.getDate()}</span></span>
                <span className="mt">
                  {tonight && <span className="tonight">TONIGHT</span>}
                  <b className={d.meal ? "" : "none"}>{d.meal ?? "Nothing planned"}</b>
                </span>
              </>
            );
            return (
              <li key={d.date}>
                {data.mealsHome && d.meal
                  ? <a className={`m-meal${tonight ? " tonight" : ""}`} href={data.mealsHome} target="_blank" rel="noopener noreferrer">{inner}</a>
                  : <div className={`m-meal${tonight ? " tonight" : ""}`}>{inner}</div>}
              </li>
            );
          })}
        </ul>
        {days.length === 0 && !data.mealsError && <p className="m-empty">Loading the week…</p>}
      </PullScroll>
    </div>
  );
}
