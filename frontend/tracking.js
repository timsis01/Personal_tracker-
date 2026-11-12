export const week = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dayDate = (s) => new Date(s + "T12:00:00Z");
export const key = (d) => d.toISOString().slice(0, 10);
export const shift = (s, n) => {
  const d = dayDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return key(d);
};
export const weekday = (s) => (dayDate(s).getUTCDay() + 6) % 7;
export const planned = (h, d) =>
  d >= h.start_date && h.weekdays.includes(weekday(d));

export function calendarPeriod(anchor, range) {
  const start =
    range === "month"
      ? anchor.slice(0, 7) + "-01"
      : shift(anchor, -weekday(anchor));
  const end =
    range === "month"
      ? key(
          new Date(
            Date.UTC(
              Number(anchor.slice(0, 4)),
              Number(anchor.slice(5, 7)),
              0,
              12,
            ),
          ),
        )
      : shift(start, 6);
  const days = [];
  for (let d = start; d <= end; d = shift(d, 1)) days.push(d);
  return { start, end, days };
}
export function calendarWeeks(days) {
  const groups = [];
  for (const day of days) {
    if (!groups.length || weekday(day) === 0) groups.push([]);
    groups.at(-1).push(day);
  }
  return groups;
}
export function findHabits(habits, query = "") {
  const term = query.trim().toLocaleLowerCase("ru-RU");
  return habits.filter((h) =>
    h.title.toLocaleLowerCase("ru-RU").includes(term),
  );
}
