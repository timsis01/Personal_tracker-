import type { Schedule, ProgressHabit, GlobalStreak, DayProgress } from "./types";
export const week = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dayDate = (s: string) => new Date(s + "T12:00:00Z");
export const key = (d: Date) => d.toISOString().slice(0, 10);
export const shift = (s: string, n: number) => {
  const d = dayDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return key(d);
};
export const weekday = (s: string) => (dayDate(s).getUTCDay() + 6) % 7;
export const planned = (h: Schedule, d: string) =>
  d >= h.start_date && h.weekdays.includes(weekday(d));
export function recentPlannedDate(habit: Schedule, today: string): string | null {
  for (let offset = 0; offset < 7; offset++) {
    const date = shift(today, -offset);
    if (planned(habit, date)) return date;
  }
  return null;
}

export function calendarPeriod(anchor: string, range: "month" | "week") {
  const start =
    range === "month" ? anchor.slice(0, 7) + "-01" : shift(anchor, -weekday(anchor));
  const end =
    range === "month"
      ? key(
          new Date(
            Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 0, 12),
          ),
        )
      : shift(start, 6);
  const days = [];
  for (let d = start; d <= end; d = shift(d, 1)) days.push(d);
  return { start, end, days };
}
export function calendarWeeks(days: string[]): string[][] {
  const groups: string[][] = [];
  for (const day of days) {
    if (!groups.length || weekday(day) === 0) groups.push([]);
    groups.at(-1)!.push(day);
  }
  return groups;
}
export function findHabits<T extends { title: string }>(habits: T[], query = ""): T[] {
  const term = query.trim().toLocaleLowerCase("ru-RU");
  return habits.filter((h) => h.title.toLocaleLowerCase("ru-RU").includes(term));
}

// A day counts only when every habit scheduled for that date is done.
// Days without planned habits are neutral; an unfinished today keeps yesterday's series.
export function globalStreak(habits: ProgressHabit[], today: string): GlobalStreak {
  const eligible = habits.filter((h) => h.start_date <= today);
  const classify = (date: string): DayProgress => {
    const scheduled = eligible.filter((h) => planned(h, date));
    const completed = scheduled.filter(
      (h) => h.entries?.[date]?.status === "done",
    ).length;
    return {
      date,
      total: scheduled.length,
      completed,
      complete: scheduled.length > 0 && completed === scheduled.length,
    };
  };
  const todayState = classify(today);
  if (!eligible.length)
    return {
      current: 0,
      best: 0,
      todayComplete: false,
      today: todayState,
      recent: Array.from({ length: 7 }, (_, i) => classify(shift(today, i - 6))),
    };
  const start = eligible.map((h) => h.start_date).sort()[0];
  let best = 0,
    run = 0;
  for (let day = start; day <= today; day = shift(day, 1)) {
    const state = classify(day);
    if (state.total) {
      if (state.complete) run++;
      else run = 0;
      best = Math.max(best, run);
    }
  }
  let current = 0;
  for (
    let day = todayState.complete ? today : shift(today, -1);
    day >= start;
    day = shift(day, -1)
  ) {
    const state = classify(day);
    if (state.total) {
      if (!state.complete) break;
      current++;
    }
  }
  return {
    current,
    best,
    todayComplete: todayState.complete,
    today: todayState,
    recent: Array.from({ length: 7 }, (_, i) => classify(shift(today, i - 6))),
  };
}
