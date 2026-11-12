import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarPeriod,
  calendarWeeks,
  planned,
  findHabits,
  shift,
  weekday,
} from "../tracking.js";
const sport = {
  id: 1,
  title: "Спорт",
  weekdays: [0, 1, 2, 4, 5, 6],
  start_date: "2026-11-01",
};
test("спорт остаётся в общем списке в четверг и планируется в пятницу", () => {
  assert.equal(weekday("2026-11-12"), 3);
  assert.equal(planned(sport, "2026-11-12"), false);
  assert.deepEqual(findHabits([sport]), [sport]);
  assert.deepEqual(findHabits([sport], " СПОРТ "), [sport]);
  assert.equal(planned(sport, "2026-11-13"), true);
  assert.equal(planned(sport, "2026-10-30"), false);
});
test("поиск не ограничивает общий список сегодняшним расписанием", () => {
  const other = { ...sport, id: 2, title: "Чтение", weekdays: [3] };
  assert.equal(findHabits([sport, other]).length, 2);
  assert.deepEqual(findHabits([sport, other], "чтен"), [other]);
  assert.deepEqual(findHabits([sport, other], "не существует"), []);
});
test("недельный диапазон начинается с понедельника и пересекает границы месяца и года", () => {
  const p = calendarPeriod("2027-01-01", "week");
  assert.equal(p.start, "2026-12-28");
  assert.equal(p.end, "2027-01-03");
  assert.equal(p.days.length, 7);
});
test("месяцы 2024–2028: все даты ровно один раз, недельные блоки не шире 7 дней", () => {
  for (let year = 2024; year <= 2028; year++)
    for (let month = 1; month <= 12; month++) {
      const anchor = `${year}-${String(month).padStart(2, "0")}-15`;
      const p = calendarPeriod(anchor, "month"),
        groups = calendarWeeks(p.days);
      assert.equal(
        p.days.length,
        new Date(Date.UTC(year, month, 0)).getUTCDate(),
      );
      assert.deepEqual(groups.flat(), p.days);
      assert.equal(new Set(groups.flat()).size, p.days.length);
      assert.ok(groups.every((g) => g.length >= 1 && g.length <= 7));
      for (const g of groups.slice(1)) assert.equal(weekday(g[0]), 0);
      assert.equal(p.days[0], anchor.slice(0, 7) + "-01");
      assert.ok(p.days.every((d) => d.slice(0, 7) === anchor.slice(0, 7)));
    }
});
test("високосный февраль и ноябрь, начинающийся в воскресенье", () => {
  assert.equal(calendarPeriod("2024-02-10", "month").days.length, 29);
  const p = calendarPeriod("2026-11-12", "month");
  assert.deepEqual(calendarWeeks(p.days)[0], ["2026-11-01"]);
  assert.equal(calendarWeeks(p.days).flat().at(-1), "2026-11-30");
  assert.equal(shift("2024-02-28", 1), "2024-02-29");
  assert.equal(shift("2024-02-29", 1), "2024-03-01");
});

import { globalStreak } from "../tracking.js";
const habit = (
  id,
  dates,
  weekdays = [0, 1, 2, 3, 4, 5, 6],
  start_date = "2026-11-09",
) => ({
  id,
  start_date,
  weekdays,
  entries: Object.fromEntries(dates.map((date) => [date, { status: "done" }])),
});
test("общая серия требует выполнения всех привычек дня, а не самой длинной личной серии", () => {
  const a = habit(1, ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
  const b = habit(2, ["2026-11-09", "2026-11-10", "2026-11-11"]);
  let s = globalStreak([a, b], "2026-11-12");
  assert.equal(s.current, 3);
  assert.equal(s.best, 3);
  assert.equal(s.todayComplete, false);
  b.entries["2026-11-12"] = { status: "done" };
  s = globalStreak([a, b], "2026-11-12");
  assert.equal(s.current, 4);
  assert.equal(s.todayComplete, true);
  assert.equal(s.best, 4);
});
test("пропуск одной привычки обрывает общую серию", () => {
  const a = habit(1, ["2026-11-09", "2026-11-10", "2026-11-11"]);
  const b = habit(2, ["2026-11-09", "2026-11-10"]);
  b.entries["2026-11-11"] = { status: "missed" };
  const s = globalStreak([a, b], "2026-11-12");
  assert.equal(s.current, 0);
  assert.equal(s.best, 2);
});
test("выходные нейтральны и не добавляют фиктивные дни в общую серию", () => {
  const a = habit(
    1,
    ["2026-11-06", "2026-11-09", "2026-11-11"],
    [0, 2, 4],
    "2026-11-06",
  );
  const s = globalStreak([a], "2026-11-12");
  assert.equal(s.current, 3);
  assert.equal(s.best, 3);
  assert.equal(s.today.total, 0);
});
test("новая привычка не портит историю до даты её начала, отмена выполнения убирает сегодняшний день", () => {
  const a = habit(1, ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
  const b = habit(2, [], [0, 1, 2, 3, 4, 5, 6], "2026-11-12");
  assert.equal(globalStreak([a, b], "2026-11-12").current, 3);
  b.entries["2026-11-12"] = { status: "done" };
  assert.equal(globalStreak([a, b], "2026-11-12").current, 4);
  delete b.entries["2026-11-12"];
  assert.equal(globalStreak([a, b], "2026-11-12").current, 3);
});
test("пустой и полностью будущий план не создают серию", () => {
  assert.equal(globalStreak([], "2026-11-12").current, 0);
  assert.equal(
    globalStreak(
      [habit(1, ["2026-11-13"], [0, 1, 2, 3, 4, 5, 6], "2026-11-13")],
      "2026-11-12",
    ).current,
    0,
  );
});

import {week} from "../tracking.js";
test("дни недели отображаются читаемой кириллицей",()=>{assert.deepEqual(week,["Пн","Вт","Ср","Чт","Пт","Сб","Вс"])});
