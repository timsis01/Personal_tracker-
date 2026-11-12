import React from "react";
import { week, weekday } from "./tracking";
export function StreakPanel({
  streak,
  burst,
}: {
  streak: import("./types").GlobalStreak;
  burst: number;
}) {
  const label = (n: number) =>
    n % 10 === 1 && n % 100 !== 11
      ? "день"
      : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
        ? "дня"
        : "дней";
  return (
    <section
      className={"global-streak " + (streak.current > 0 ? "active" : "dormant")}
      aria-label="Общая серия всех привычек"
    >
      <div className="fire-wrap" key={burst}>
        <div className={"fire-halo " + (burst ? "celebrate" : "")} />
        <svg className="living-flame" viewBox="0 0 64 64" aria-hidden="true">
          <path
            className="flame-outer"
            d="M33 6C35 17 49 23 49 37C49 48 42 56 32 56C21 56 14 48 14 38C14 30 19 24 23 20C22 29 25 33 29 28C34 21 35 14 33 6Z"
          />
          <path
            className="flame-inner"
            d="M32 32C33 38 39 40 39 45C39 50 35 52 32 52C27 52 24 49 24 45C24 40 29 37 32 32Z"
          />
        </svg>
        <i className="ember one" />
        <i className="ember two" />
        <i className="ember three" />
      </div>
      <div className="streak-copy">
        <span>Серия всех привычек</span>
        <div className="global-streak-value">
          <strong>{streak.current}</strong>
          <span>{label(streak.current)} подряд</span>
        </div>
        <div className="streak-record">
          Рекорд: <strong>{streak.best}</strong>
        </div>
        <p>
          {streak.todayComplete
            ? "Сегодня всё выполнено — серия продолжается."
            : streak.today.total
              ? "Выполните весь план на день, чтобы " +
                (streak.current ? "сохранить огонь." : "зажечь огонь.")
              : "Серия растёт в дни, когда выполнен весь запланированный набор привычек."}
        </p>
      </div>
      <div className="streak-week">
        {streak.recent.map((d) => (
          <div
            key={d.date}
            className={
              d.complete ? "complete" : d.date === streak.today.date ? "current" : ""
            }
            title={d.date + ": " + d.completed + "/" + d.total}
          >
            <span>{week[weekday(d.date)]}</span>
            <b>{d.complete ? "✓" : d.total ? "—" : "·"}</b>
          </div>
        ))}
      </div>
      <span className="sr-only" role="status">
        {burst && streak.todayComplete
          ? "Все привычки выполнены! Серия: " +
            streak.current +
            " " +
            label(streak.current)
          : ""}
      </span>
    </section>
  );
}
