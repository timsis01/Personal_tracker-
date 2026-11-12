import type { FormEvent } from "react";
import { toApiError } from "./types";
import type {
  Api,
  Session,
  SessionUpdate,
  Habit,
  Goal,
  GoalDraft,
  FieldErrors,
  Tab,
  ModalState,
  IconName,
  VariableStyle,
} from "./types";
import React, { useEffect, useState } from "react";
import { Icon, Modal, Field, categories, categoryOf, Avatar } from "./ui";
import "./workspace.css";
import { StreakPanel } from "./streak";
import { Profile } from "./profile";
import {
  week,
  todayKey,
  dayDate,
  key,
  shift,
  weekday,
  planned,
  calendarPeriod,
  calendarWeeks,
  findHabits,
  globalStreak,
} from "./tracking";
const status = (h: Habit, d: string) => h.entries[d]?.status || "clear";
const percent = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const formatDay = (s: string) =>
  dayDate(s).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
function ratio(habits: Habit[], d: string) {
  const all = habits.filter((h) => planned(h, d));
  return {
    total: all.length,
    done: all.filter((h) => status(h, d) === "done").length,
  };
}
function Meter({ value }: { value: number }) {
  return (
    <div className="meter">
      <span style={{ width: Math.max(0, Math.min(100, value)) + "%" }} />
    </div>
  );
}
function FormError({ error }: { error?: string }) {
  return error ? (
    <div className="error-banner" role="alert">
      {error}
    </div>
  ) : null;
}

const habitColors = [
  "#5274cc",
  "#d18a42",
  "#399b7a",
  "#c96859",
  "#9671ba",
  "#428db5",
  "#c45f7f",
  "#778b51",
  "#a77855",
  "#5b9b9c",
  "#8a7bb5",
  "#aa8c37",
  "#637f98",
  "#bc7665",
  "#6c975d",
  "#aa6da3",
];
function HabitEditor({
  habit,
  habits,
  goals,
  api,
  onSave,
  onClose,
}: {
  habit?: Habit;
  habits: Habit[];
  goals: Goal[];
  api: Api;
  onSave: (habit: Habit) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(habit?.title || ""),
    [color, setColor] = useState(
      habit?.color ||
        habitColors.find((c) => !habits.some((h) => h.color === c)) ||
        habitColors[0],
    ),
    [icon, setCategory] = useState(habit ? categoryOf(habit)[0] : "general"),
    [days, setWeekdays] = useState(habit?.weekdays || [0, 1, 2, 3, 4, 5, 6]),
    [goal, setGoalId] = useState(habit?.goal || ""),
    [errors, setErrors] = useState<FieldErrors>({}),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err: FieldErrors = {};
    if (title.trim().length < 3) err.title = "Введите от 3 до 120 символов.";
    if (!days.length) err.weekdays = "Выберите хотя бы один день.";
    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }
    setBusy(true);
    try {
      onSave(
        await api<Habit>(
          "/habits/" + (habit ? habit.id + "/" : ""),
          {
            title,
            icon,
            color,
            weekdays: days,
            goal: goal ? Number(goal) : null,
          },
          habit ? "PATCH" : "POST",
        ),
      );
    } catch (cause) {
      const e = toApiError(cause);
      setErrors(e.fields || { form: e.message });
      setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title={habit ? "Редактировать привычку" : "Новая привычка"}
      subtitle="Название, расписание и связанная цель."
      onClose={() => !busy && onClose()}
    >
      <form noValidate onSubmit={submit}>
        <Field
          label="Название"
          name="habit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Читать 20 минут"
          error={errors.title}
        />
        <fieldset>
          <legend>Цвет привычки</legend>
          <div className="color-palette">
            {habitColors.map((c) => (
              <button
                type="button"
                key={c}
                style={{ backgroundColor: c }}
                aria-label={"Цвет " + c}
                aria-pressed={color === c}
                className={color === c ? "chosen" : ""}
                onClick={() => setColor(c)}
              >
                {color === c && <Icon name="check" size={16} />}
              </button>
            ))}
            <label className="custom-color">
              Свой цвет
              <input
                aria-label="Свой цвет"
                type="color"
                value={color}
                onInput={(e) => setColor(e.currentTarget.value)}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
          </div>
          <div className="field color-hex-field">
            <label htmlFor="habit-color-hex">HEX цвета</label>
            <input
              id="habit-color-hex"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={7}
              placeholder="#5274cc"
            />
          </div>
          {errors.color && <p className="field-error">{errors.color}</p>}
        </fieldset>
        <fieldset>
          <legend>Категория</legend>
          <div className="category-grid">
            {categories.map(([id, label, iconName]) => (
              <label
                key={id}
                className={"category-option " + (id === icon ? "chosen" : "")}
              >
                <input
                  type="radio"
                  name="category"
                  checked={id === icon}
                  onChange={() => setCategory(id)}
                />
                <Icon name={iconName} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Дни выполнения</legend>
          <div className="day-picks">
            {week.map((label, i) => (
              <button
                type="button"
                key={i}
                aria-pressed={days.includes(i)}
                className={days.includes(i) ? "picked" : ""}
                onClick={() =>
                  setWeekdays(
                    days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort(),
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-button all-days"
            onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}
          >
            Каждый день
          </button>
          {errors.weekdays && <p className="field-error">{errors.weekdays}</p>}
        </fieldset>
        <div className="field">
          <label htmlFor="goal-link">Связать с целью</label>
          <select id="goal-link" value={goal} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">Без цели</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          {errors.goal && <p className="field-error">{errors.goal}</p>}
        </div>
        {habit && (
          <p className="form-help">
            Изменение расписания применяется ко всему календарю. Сохранённые отметки
            останутся в истории.
          </p>
        )}
        <FormError error={errors.form} />
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={busy}
          >
            Отмена
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить привычку"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function GoalEditor({
  goal,
  api,
  onSave,
  onClose,
}: {
  goal?: Goal;
  api: Api;
  onSave: (goal: Goal) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<GoalDraft>(
      goal || { title: "", unit: "раз", target: 10, current: 0, deadline: "" },
    ),
    [errors, setErrors] = useState<FieldErrors>({}),
    [busy, setBusy] = useState(false);
  const update = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [e.target.name]: e.target.value });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err: FieldErrors = {};
    if (!values.title.trim()) err.title = "Введите название.";
    if (!values.unit.trim()) err.unit = "Укажите единицу измерения.";
    if (!Number.isFinite(Number(values.target)) || Number(values.target) <= 0)
      err.target = "Цель должна быть больше нуля.";
    if (
      values.current === "" ||
      !Number.isFinite(Number(values.current)) ||
      Number(values.current) < 0
    )
      err.current = "Введите число не меньше нуля.";
    if (Object.keys(err).length) {
      setErrors(err);
      return;
    }
    setBusy(true);
    try {
      onSave(
        await api<Goal>(
          "/goals/" + (goal ? goal.id + "/" : ""),
          values,
          goal ? "PATCH" : "POST",
        ),
      );
    } catch (cause) {
      const e = toApiError(cause);
      setErrors(e.fields || { form: e.message });
      setBusy(false);
    }
  }
  return (
    <Modal
      title={goal ? "Обновить цель" : "Новая цель"}
      subtitle="Укажите измеримый результат и обновляйте прогресс."
      onClose={() => !busy && onClose()}
    >
      <form noValidate onSubmit={submit}>
        <Field
          label="Название цели"
          name="title"
          value={values.title}
          onChange={update}
          maxLength={120}
          error={errors.title}
          placeholder="Прочитать 12 книг"
        />
        <div className="form-two">
          <Field
            label="Целевой результат"
            name="target"
            type="number"
            min="0.01"
            step="any"
            value={values.target}
            onChange={update}
            error={errors.target}
          />
          <Field
            label="Уже сделано"
            name="current"
            type="number"
            min="0"
            step="any"
            value={values.current}
            onChange={update}
            error={errors.current}
          />
        </div>
        <Field
          label="Единица измерения"
          name="unit"
          value={values.unit}
          onChange={update}
          maxLength={20}
          error={errors.unit}
          placeholder="книг, км, часов"
        />
        <Field
          label="Срок (необязательно)"
          name="deadline"
          type="date"
          value={values.deadline || ""}
          onChange={update}
          error={errors.deadline}
        />
        <FormError error={errors.form} />
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить цель"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function MarkEditor({
  habit,
  date,
  api,
  onSave,
  onClose,
}: {
  habit: Habit;
  date: string;
  api: Api;
  onSave: (habit: Habit) => void;
  onClose: () => void;
}) {
  const [state, setStatus] = useState(status(habit, date)),
    [note, setNote] = useState(habit.entries[date]?.note || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      onSave(
        await api<Habit>("/habits/" + habit.id + "/complete/", {
          date,
          status: state,
          note,
        }),
      );
    } catch (cause) {
      const e = toApiError(cause);
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={habit.title}
      subtitle={formatDay(date)}
      onClose={() => !busy && onClose()}
    >
      <form onSubmit={submit}>
        <fieldset>
          <legend>Результат дня</legend>
          <div className="status-choices">
            {(
              [
                ["done", "Выполнено"],
                ["missed", "Не выполнено"],
                ["clear", "Без отметки"],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className={state === id ? "chosen " + id : ""}>
                <input
                  type="radio"
                  name="status"
                  checked={state === id}
                  onChange={() => setStatus(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {state !== "clear" && (
          <div className="field">
            <label htmlFor="day-note">Заметка (необязательно)</label>
            <textarea
              id="day-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Как прошло?"
            />
            <span className="field-hint">{note.length}/500</span>
          </div>
        )}
        {state === "clear" && (
          <p className="form-help">Отметка и заметка за этот день будут убраны.</p>
        )}
        <FormError error={error} />
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Сохраняем…" : "Сохранить отметку"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function DeleteConfirm({
  item,
  kind,
  api,
  onDeleted,
  onClose,
}: {
  item: Habit | Goal;
  kind: "goal" | "habit";
  api: Api;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function remove(): Promise<void> {
    setBusy(true);
    try {
      await api(
        "/" + (kind === "goal" ? "goals" : "habits") + "/" + item.id + "/",
        undefined,
        "DELETE",
      );
      onDeleted();
    } catch (cause) {
      const e = toApiError(cause);
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={kind === "goal" ? "Удалить цель?" : "Удалить привычку?"}
      subtitle={
        kind === "goal"
          ? "Связанные привычки сохранятся."
          : "История и отметки привычки будут удалены. Восстановить их нельзя."
      }
      onClose={() => !busy && onClose()}
    >
      <div className="delete-habit-name">{item.title}</div>
      <FormError error={error} />
      <div className="form-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Отмена
        </button>
        <button className="button danger" disabled={busy} onClick={remove}>
          {busy ? "Удаляем…" : "Удалить"}
        </button>
      </div>
    </Modal>
  );
}
function Empty({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string | null;
  onAction?: () => void;
}) {
  return (
    <div className="empty-panel">
      <Icon name="grid" size={30} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action && (
        <button className="button primary" onClick={onAction}>
          <Icon name="plus" size={18} />
          {action}
        </button>
      )}
    </div>
  );
}

export function Workspace({
  api,
  session,
  onLogin,
  onLogout,
  onSessionUpdate,
}: {
  api: Api;
  session: Session;
  onLogin: () => void;
  onLogout: () => void;
  onSessionUpdate: SessionUpdate;
}) {
  const [tab, setTab] = useState<Tab>("today"),
    [habits, setHabits] = useState<Habit[]>([]),
    [goals, setGoals] = useState<Goal[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reload, setReloadKey] = useState(0),
    [modal, setModal] = useState<ModalState | null>(null),
    [pending, setPendingId] = useState<number | null>(null),
    [filter, setFilter] = useState("all"),
    [habitQuery, setHabitQuery] = useState("");
  const [burst, setCelebration] = useState(0);
  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setCelebration(0), 1100);
    return () => clearTimeout(timer);
  }, [burst]);
  const [wideTable, setWideTable] = useState(
    () => window.matchMedia("(min-width: 1100px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1100px)");
    const changed = () => setWideTable(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const today = todayKey(),
    [anchor, setAnchor] = useState(today),
    [range, setRange] = useState<"month" | "week">("month"),
    [view, setView] = useState(() =>
      window.matchMedia("(min-width: 1100px)").matches ? "table" : "calendar",
    ),
    [selected, setSelected] = useState(today);
  useEffect(() => {
    let active = true;
    if (!session.token) {
      setHabits([]);
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([api<Habit[]>("/habits/"), api<Goal[]>("/goals/")])
      .then(([h, g]) => {
        if (active) {
          setHabits(h);
          setGoals(g);
        }
      })
      .catch((cause: unknown) => {
        const e = toApiError(cause);
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.token, reload]);
  const saveHabit = (h: Habit) => {
    const next = habits.some((x) => x.id === h.id)
      ? habits.map((x) => (x.id === h.id ? h : x))
      : [...habits, h];
    if (
      globalStreak(next, today).todayComplete &&
      !globalStreak(habits, today).todayComplete
    )
      setCelebration((n) => n + 1);
    setHabits((old) =>
      old.some((x) => x.id === h.id)
        ? old.map((x) => (x.id === h.id ? h : x))
        : [...old, h],
    );
    setModal(null);
  };
  const open = (data: ModalState) => (session.token ? setModal(data) : onLogin());
  async function quick(h: Habit) {
    setPendingId(h.id);
    setError("");
    try {
      const result = await api<Habit>("/habits/" + h.id + "/complete/", {
        date: today,
        status: status(h, today) === "done" ? "clear" : "done",
        note: h.entries[today]?.note || "",
      });
      const next = habits.map((x) => (x.id === h.id ? result : x));
      if (
        globalStreak(next, today).todayComplete &&
        !globalStreak(habits, today).todayComplete
      )
        setCelebration((n) => n + 1);
      setHabits(next);
    } catch (cause) {
      const e = toApiError(cause);
      setError(e.message);
    } finally {
      setPendingId(null);
    }
  }
  const scheduledToday = habits.filter((h) => planned(h, today)),
    completed = scheduledToday.filter((h) => status(h, today) === "done").length;
  const streak = globalStreak(habits, today);
  const visible = scheduledToday.filter(
    (h) =>
      filter === "all" ||
      (filter === "done" ? status(h, today) === "done" : status(h, today) !== "done"),
  );
  const { start: periodStart, end: periodEnd, days } = calendarPeriod(anchor, range);
  const groups = calendarWeeks(days);
  function navigate(n: number) {
    if (range === "week") setAnchor(shift(anchor, n * 7));
    else {
      const d = dayDate(anchor);
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + n);
      setAnchor(key(d));
    }
  }
  const cell = (h: Habit, d: string) => {
    const available = planned(h, d) && d <= today;
    const value = status(h, d);
    return (
      <button
        key={d}
        className={
          "mark-cell " +
          (available ? value : d > today ? "future" : "unplanned") +
          (d === today ? " is-today" : "")
        }
        disabled={!available || pending !== null}
        onClick={() => open({ type: "mark", habit: h, date: d })}
        aria-label={
          h.title +
          ", " +
          formatDay(d) +
          ": " +
          (!planned(h, d)
            ? "не запланировано"
            : d > today
              ? "будущий день"
              : value === "done"
                ? "выполнено"
                : value === "missed"
                  ? "не выполнено"
                  : "без отметки")
        }
        title={h.entries[d]?.note || formatDay(d)}
      >
        {!planned(h, d) ? (
          "—"
        ) : d > today ? (
          ""
        ) : value === "done" ? (
          <Icon name="check" size={16} />
        ) : value === "missed" ? (
          "×"
        ) : (
          <Icon name="timer" size={16} />
        )}
      </button>
    );
  };
  const lastDays = Array.from({ length: 14 }, (_, i) => shift(today, i - 14));
  const summary = (dates: string[]) => {
    let total = 0,
      done = 0;
    dates.forEach((d) => {
      const r = ratio(habits, d);
      total += r.total;
      done += r.done;
    });
    return { total, done, value: percent(done, total) };
  };
  const currentWeek = summary(lastDays.slice(7)),
    previousWeek = summary(lastDays.slice(0, 7));
  let monthDone = 0,
    monthTotal = 0;
  days
    .filter((d) => d <= today)
    .forEach((d) => {
      const r = ratio(habits, d);
      monthDone += r.done;
      monthTotal += r.total;
    });
  const titles = {
    today: "Сегодня",
    habits: "Все привычки",
    calendar: "Календарь",
    goals: "Цели",
    stats: "Статистика",
    profile: "Профиль",
  };
  return (
    <div
      className={
        "tracker " +
        (tab === "calendar" && view === "table" && wideTable ? "compact-calendar" : "")
      }
    >
      <aside className="tracker-sidebar">
        <a
          href="#"
          className="tracker-brand"
          onClick={(e) => {
            e.preventDefault();
            setTab("today");
          }}
        >
          <img src="/favicon.svg?v=flame" width="38" height="38" alt="" />
          ритм<span>.</span>
        </a>
        <nav aria-label="Разделы">
          {(
            [
              ["today", "check", "Сегодня"],
              ["habits", "activity", "Привычки"],
              ["calendar", "grid", "Календарь"],
              ["goals", "target", "Цели"],
              ["stats", "chart", "Статистика"],
              ["profile", "user", "Профиль"],
            ] as [Tab, IconName, string][]
          ).map(([id, icon, label]) => (
            <button
              key={id}
              aria-label={label}
              title={label}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon name={icon} />
              <span className="nav-label">{label}</span>
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="tracker-account">
          {session.token ? (
            <>
              <button
                className="account-profile-link"
                aria-label="Открыть профиль"
                onClick={() => setTab("profile")}
              >
                <Avatar />
                <span>{session.first_name || session.username}</span>
              </button>
              <button
                className="icon-button"
                aria-label="Выйти из аккаунта"
                disabled={pending !== null}
                onClick={onLogout}
              >
                <Icon name="logout" />
              </button>
            </>
          ) : (
            <button className="button secondary full" onClick={onLogin}>
              Войти в аккаунт
            </button>
          )}
        </div>
      </aside>
      <main className="tracker-main">
        <header className="tracker-top">
          <span>
            Личный трекер <span>/</span> {titles[tab]}
          </span>
          <span className="header-date">{formatDay(today)}</span>
        </header>
        <div className="tracker-page">
          <div className="tracker-heading">
            <div>
              <h1>{titles[tab]}</h1>
              <p>
                {
                  {
                    today: "Привычки, запланированные на этот день.",
                    habits: "Все привычки и их расписания, включая дни отдыха.",
                    calendar: "История выполнения и план на неделю или месяц.",
                    goals: "Измеримые результаты и связанные привычки.",
                    stats: "Выполнение, серии и динамика за последние дни.",
                    profile: "Личные данные и безопасность аккаунта.",
                  }[tab]
                }
              </p>
            </div>
            {tab !== "profile" && (
              <button
                className="button primary"
                onClick={() => open({ type: tab === "goals" ? "goal" : "habit" })}
              >
                <Icon name="plus" size={18} />
                {tab === "goals" ? "Новая цель" : "Новая привычка"}
              </button>
            )}
          </div>
          <FormError error={error} />
          {error && (
            <button
              className="button secondary"
              onClick={() => setReloadKey((n) => n + 1)}
            >
              Повторить загрузку
            </button>
          )}
          {loading && tab !== "profile" ? (
            <div className="empty-panel" role="status">
              Загрузка…
            </div>
          ) : (
            <>
              {tab === "profile" && (
                <Profile
                  api={api}
                  session={session}
                  onSessionUpdate={onSessionUpdate}
                  onLogin={onLogin}
                  habitCount={habits.length}
                  goalCount={goals.length}
                />
              )}
              {tab === "today" && (
                <>
                  <StreakPanel streak={streak} burst={burst} />
                  <section className="summary-grid today-summary">
                    <article>
                      <span>Выполнено сегодня</span>
                      <strong>
                        {completed}
                        <small> / {scheduledToday.length}</small>
                      </strong>
                      <Meter value={percent(completed, scheduledToday.length)} />
                    </article>
                    <article>
                      <span>Цели в работе</span>
                      <strong>
                        {goals.filter((g) => g.current < g.target).length}
                        <small> из {goals.length}</small>
                      </strong>
                      <p>{goals.filter((g) => g.current >= g.target).length} завершено</p>
                    </article>
                  </section>
                  <div className="list-heading">
                    <h2>План на сегодня</h2>
                    <div className="filters">
                      {[
                        ["all", "Все"],
                        ["todo", "В процессе"],
                        ["done", "Готово"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          className={filter === id ? "selected" : ""}
                          onClick={() => setFilter(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {visible.length ? (
                    <div className="routine-list">
                      {visible.map((h) => {
                        const cat = categoryOf(h),
                          done = status(h, today) === "done";
                        return (
                          <article
                            className={"routine " + (done ? "completed" : "")}
                            key={h.id}
                          >
                            <button
                              className={"routine-check " + (done ? "done" : "")}
                              disabled={pending !== null}
                              aria-label={
                                (done ? "Отменить выполнение: " : "Выполнить: ") + h.title
                              }
                              onClick={() => quick(h)}
                            >
                              <Icon name={done ? "check" : "plus"} size={20} />
                            </button>
                            <div className="routine-info">
                              <h3>
                                <i
                                  className="habit-color-dot"
                                  style={{ backgroundColor: h.color }}
                                />
                                {h.title}
                              </h3>
                              <p>
                                {cat[1]}
                                <span>·</span>
                                {h.weekdays.length === 7
                                  ? "Каждый день"
                                  : h.weekdays.map((d) => week[d]).join(", ")}
                                {h.goal && (
                                  <>
                                    <span>·</span>
                                    {goals.find((g) => g.id === h.goal)?.title}
                                  </>
                                )}
                              </p>
                            </div>
                            <span
                              className="routine-streak"
                              title="Личная серия привычки"
                            >
                              <img
                                src="/favicon.svg?v=flame"
                                alt=""
                                width="18"
                                height="18"
                              />
                              {h.streak} подряд
                            </span>
                            <div className="routine-actions">
                              <button
                                className="icon-button"
                                aria-label={"Отметка и заметка: " + h.title}
                                title="Отметка и заметка"
                                onClick={() =>
                                  open({ type: "mark", habit: h, date: today })
                                }
                              >
                                <Icon name="book" />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={"Редактировать привычку: " + h.title}
                                title="Редактировать"
                                onClick={() => open({ type: "habit", habit: h })}
                              >
                                <Icon name="edit" />
                              </button>
                              <button
                                className="icon-button delete-habit"
                                aria-label={"Удалить привычку: " + h.title}
                                title="Удалить"
                                onClick={() => open({ type: "delete", habit: h })}
                              >
                                <Icon name="trash" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty
                      title={
                        habits.length
                          ? scheduledToday.length
                            ? "Нет привычек под выбранным фильтром"
                            : "Сегодня нет запланированных привычек"
                          : "Добавьте первую привычку"
                      }
                      description={
                        habits.length
                          ? "Остальные привычки сохранены в разделе «Все привычки» — вместе с их расписанием."
                          : "Задайте название и дни выполнения. Привычка появится в плане и календаре."
                      }
                      action={habits.length ? "Все привычки" : "Создать привычку"}
                      onAction={() =>
                        habits.length ? setTab("habits") : open({ type: "habit" })
                      }
                    />
                  )}
                </>
              )}
              {tab === "habits" && (
                <>
                  <div className="habits-toolbar">
                    <h2>
                      Все привычки <span className="list-count">{habits.length}</span>
                    </h2>
                    <div className="habit-search">
                      <label htmlFor="habit-search">Поиск по названию</label>
                      <input
                        id="habit-search"
                        type="search"
                        value={habitQuery}
                        onChange={(e) => setHabitQuery(e.target.value)}
                        placeholder="Найти привычку"
                      />
                    </div>
                  </div>
                  {findHabits(habits, habitQuery).length ? (
                    <div className="all-habits-list">
                      {findHabits(habits, habitQuery).map((h) => (
                        <article
                          className="habit-directory-card"
                          key={h.id}
                          style={{ borderLeft: "4px solid " + h.color }}
                        >
                          <div className="directory-heading">
                            <div>
                              <h3>
                                <i
                                  className="habit-color-dot"
                                  style={{ backgroundColor: h.color }}
                                />
                                {h.title}
                              </h3>
                              <p>
                                {categoryOf(h)[1]}
                                {h.goal
                                  ? " · " +
                                    (goals.find((g) => g.id === h.goal)?.title || "Цель")
                                  : ""}
                              </p>
                            </div>
                            <span
                              className={
                                "schedule-badge " +
                                (planned(h, today) ? "scheduled" : "rest")
                              }
                            >
                              {planned(h, today)
                                ? "Сегодня по плану"
                                : "Сегодня выходной"}
                            </span>
                          </div>
                          <div className="directory-schedule">
                            <span>Расписание</span>
                            <div
                              className="schedule-days"
                              aria-label={"Расписание: " + h.title}
                            >
                              {week.map((label, i) => (
                                <span
                                  key={i}
                                  className={
                                    h.weekdays.includes(i) ? "scheduled-day" : "rest-day"
                                  }
                                  aria-label={
                                    label +
                                    ": " +
                                    (h.weekdays.includes(i) ? "по плану" : "выходной")
                                  }
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                            <strong>
                              {h.weekdays.length === 7
                                ? "Каждый день"
                                : h.weekdays.map((d) => week[d]).join(", ")}
                            </strong>
                          </div>
                          <div className="directory-footer">
                            <span>
                              Серия: {h.streak} · Лучшая: {h.best_streak}
                            </span>
                            <div>
                              <button
                                className="button secondary"
                                aria-label={"Редактировать привычку: " + h.title}
                                onClick={() => open({ type: "habit", habit: h })}
                              >
                                <Icon name="edit" size={17} />
                                Редактировать
                              </button>
                              <button
                                className="icon-button delete-habit"
                                aria-label={"Удалить привычку: " + h.title}
                                title="Удалить привычку"
                                onClick={() => open({ type: "delete", habit: h })}
                              >
                                <Icon name="trash" />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title={habits.length ? "Ничего не найдено" : "Пока нет привычек"}
                      description={
                        habits.length
                          ? "Измените поисковый запрос."
                          : "Создайте привычку и выберите дни выполнения. Она останется в этом списке даже в день отдыха."
                      }
                      action={habits.length ? null : "Создать привычку"}
                      onAction={() => open({ type: "habit" })}
                    />
                  )}
                </>
              )}
              {tab === "calendar" && (
                <>
                  <div className="calendar-toolbar">
                    <div className="segmented">
                      <button
                        className={view === "table" ? "selected" : ""}
                        onClick={() => setView("table")}
                      >
                        Таблица
                      </button>
                      <button
                        className={view === "calendar" ? "selected" : ""}
                        onClick={() => setView("calendar")}
                      >
                        Календарь
                      </button>
                    </div>
                    <div className="segmented">
                      <button
                        className={range === "week" ? "selected" : ""}
                        onClick={() => setRange("week")}
                      >
                        Неделя
                      </button>
                      <button
                        className={range === "month" ? "selected" : ""}
                        onClick={() => setRange("month")}
                      >
                        Месяц
                      </button>
                    </div>
                  </div>
                  <div className="period-navigation">
                    <button
                      className="button secondary"
                      aria-label="Предыдущий период"
                      onClick={() => navigate(-1)}
                    >
                      ←
                    </button>
                    <div>
                      <h2>
                        {range === "month"
                          ? dayDate(anchor).toLocaleDateString("ru-RU", {
                              month: "long",
                              year: "numeric",
                              timeZone: "UTC",
                            })
                          : formatDay(periodStart) + " — " + formatDay(periodEnd)}
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => {
                          setAnchor(today);
                          setSelected(today);
                        }}
                      >
                        К сегодняшнему дню
                      </button>
                    </div>
                    <button
                      className="button secondary"
                      aria-label="Следующий период"
                      onClick={() => navigate(1)}
                    >
                      →
                    </button>
                  </div>
                  {!habits.length ? (
                    <Empty
                      title="Календарь пока пуст"
                      description="Добавьте привычку, чтобы отмечать выполнение по дням."
                      action="Создать привычку"
                      onAction={() => open({ type: "habit" })}
                    />
                  ) : view === "table" ? (
                    <div
                      className={
                        "month-tables " + (wideTable ? "single-month-matrix" : "")
                      }
                    >
                      {(wideTable ? [days] : groups).map((group, index) => (
                        <section
                          className="week-table-panel"
                          key={group[0]}
                          aria-label={
                            "Неделя " +
                            formatDay(group[0]) +
                            " — " +
                            formatDay(group.at(-1)!)
                          }
                        >
                          {range === "month" && !wideTable && (
                            <h3>
                              {formatDay(group[0])} — {formatDay(group.at(-1)!)}
                            </h3>
                          )}
                          <table
                            className={
                              "week-matrix " + (wideTable ? "full-month-table" : "")
                            }
                            style={{ "--day-count": group.length } as VariableStyle}
                          >
                            <thead>
                              <tr>
                                <th scope="col">Привычка</th>
                                {group.map((d) => (
                                  <th
                                    scope="col"
                                    key={d}
                                    className={d === today ? "today-heading" : ""}
                                  >
                                    <span>{week[weekday(d)]}</span>
                                    {Number(d.slice(-2))}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {habits.map((h) => (
                                <tr
                                  key={h.id}
                                  style={{ "--habit-color": h.color } as VariableStyle}
                                >
                                  <th scope="row">
                                    <span>
                                      <i
                                        className="habit-color-dot"
                                        style={{ backgroundColor: h.color }}
                                      />
                                      {h.title}
                                    </span>
                                    <button
                                      className="icon-button"
                                      aria-label={
                                        "Редактировать привычку: " +
                                        h.title +
                                        ", неделя " +
                                        (index + 1)
                                      }
                                      onClick={() => open({ type: "habit", habit: h })}
                                    >
                                      <Icon name="edit" size={17} />
                                    </button>
                                  </th>
                                  {group.map((d) => (
                                    <td
                                      key={d}
                                      className={weekday(d) === 0 ? "week-divider" : ""}
                                    >
                                      {cell(h, d)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th scope="row">Итог дня</th>
                                {group.map((d) => {
                                  const r = ratio(habits, d);
                                  return (
                                    <td key={d}>
                                      {d <= today && r.total
                                        ? percent(r.done, r.total) + "%"
                                        : "—"}
                                    </td>
                                  );
                                })}
                              </tr>
                            </tfoot>
                          </table>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="calendar-grid">
                        {week.map((d) => (
                          <div className="weekday-title" key={d}>
                            {d}
                          </div>
                        ))}
                        {Array.from({ length: weekday(periodStart) }, (_, i) => (
                          <div key={"pad" + i} />
                        ))}
                        {days.map((d) => {
                          const r = ratio(habits, d),
                            pc = percent(r.done, r.total);
                          return (
                            <button
                              key={d}
                              className={
                                "calendar-day " +
                                (d === selected ? "selected" : "") +
                                (d === today ? " today" : "")
                              }
                              onClick={() => setSelected(d)}
                            >
                              <span>{Number(d.slice(-2))}</span>
                              <div
                                className="day-ring"
                                style={{ "--progress": pc + "%" } as VariableStyle}
                              >
                                <span>{d > today ? "—" : r.total ? pc + "%" : "—"}</span>
                              </div>
                              <small>
                                {r.done}/{r.total}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                      <section className="day-details">
                        <h2>{formatDay(selected)}</h2>
                        {habits.filter((h) => planned(h, selected)).length ? (
                          habits
                            .filter((h) => planned(h, selected))
                            .map((h) => (
                              <div key={h.id}>
                                <span>
                                  <i
                                    className="habit-color-dot"
                                    style={{ backgroundColor: h.color }}
                                  />
                                  {h.title}
                                </span>
                                {cell(h, selected)}
                              </div>
                            ))
                        ) : (
                          <p>Нет запланированных привычек.</p>
                        )}
                      </section>
                    </>
                  )}
                  <div className="calendar-bottom">
                    <div className="legend">
                      <span>
                        <i className="done" />
                        Выполнено
                      </span>
                      <span>
                        <i className="missed" />
                        Не выполнено
                      </span>
                      <span>
                        <i />
                        Без отметки
                      </span>
                      <span>— Не запланировано</span>
                    </div>
                    <span>
                      За период: {monthDone} / {monthTotal}
                    </span>
                  </div>
                </>
              )}
              {tab === "goals" && (
                <>
                  {goals.length ? (
                    <div className="goal-grid">
                      {goals.map((g) => {
                        const pc = percent(g.current, g.target);
                        return (
                          <article className="goal-card" key={g.id}>
                            <div className="goal-top">
                              <span
                                className={"goal-badge " + (pc >= 100 ? "finished" : "")}
                              >
                                {pc >= 100 ? "Завершена" : "В работе"}
                              </span>
                              <div>
                                <button
                                  className="icon-button"
                                  aria-label={"Редактировать цель: " + g.title}
                                  onClick={() => open({ type: "goal", goal: g })}
                                >
                                  <Icon name="edit" />
                                </button>
                                <button
                                  className="icon-button delete-habit"
                                  aria-label={"Удалить цель: " + g.title}
                                  onClick={() => open({ type: "delete", goal: g })}
                                >
                                  <Icon name="trash" />
                                </button>
                              </div>
                            </div>
                            <h2>{g.title}</h2>
                            <p className="goal-numbers">
                              {g.current.toLocaleString("ru-RU")}{" "}
                              <span>
                                / {g.target.toLocaleString("ru-RU")} {g.unit}
                              </span>
                            </p>
                            <Meter value={pc} />
                            <div className="goal-meta">
                              <strong>{pc}%</strong>
                              <span>
                                {g.deadline ? "До " + formatDay(g.deadline) : "Без срока"}
                              </span>
                            </div>
                            <p className="goal-linked">
                              Связано привычек:{" "}
                              {habits.filter((h) => h.goal === g.id).length}
                            </p>
                            <button
                              className="button secondary full"
                              onClick={() => open({ type: "goal", goal: g })}
                            >
                              Обновить прогресс
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty
                      title="Добавьте измеримую цель"
                      description="Например: прочитать 12 книг. Укажите результат и обновляйте число по мере выполнения."
                      action="Создать цель"
                      onAction={() => open({ type: "goal" })}
                    />
                  )}
                </>
              )}
              {tab === "stats" && (
                <>
                  <section className="summary-grid">
                    <article>
                      <span>Последние 7 завершённых дней</span>
                      <strong>
                        {currentWeek.value}
                        <small>%</small>
                      </strong>
                      <p>
                        {currentWeek.done} из {currentWeek.total} запланированных
                      </p>
                    </article>
                    <article>
                      <span>К предыдущим 7 дням</span>
                      <strong>
                        {currentWeek.total && previousWeek.total
                          ? (currentWeek.value - previousWeek.value > 0 ? "+" : "") +
                            (currentWeek.value - previousWeek.value)
                          : "—"}
                        <small> п. п.</small>
                      </strong>
                      <p>Сегодня не участвует в сравнении</p>
                    </article>
                    <article>
                      <span>Лучшая серия</span>
                      <strong>
                        {Math.max(0, ...habits.map((h) => h.best_streak))}
                        <small> выполнений</small>
                      </strong>
                      <p>Только запланированные дни</p>
                    </article>
                  </section>
                  <section className="chart-panel">
                    <h2>Выполнение за последние 14 дней</h2>
                    <div className="bar-chart">
                      {lastDays.map((d) => {
                        const r = ratio(habits, d),
                          pc = percent(r.done, r.total);
                        return (
                          <div
                            key={d}
                            title={formatDay(d) + ": " + r.done + "/" + r.total}
                          >
                            <span>{d > today ? "—" : r.total ? pc + "%" : "—"}</span>
                            <div className="bar-track">
                              <i style={{ height: pc + "%" }} />
                            </div>
                            <small>{Number(d.slice(-2))}</small>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section className="stat-list">
                    <h2>По привычкам</h2>
                    {habits.length ? (
                      habits.map((h) => {
                        const scheduled = lastDays.filter((d) => planned(h, d)),
                          n = scheduled.filter((d) => status(h, d) === "done").length;
                        return (
                          <div key={h.id}>
                            <strong>{h.title}</strong>
                            <span>
                              {n}/{scheduled.length}
                            </span>
                            <Meter value={percent(n, scheduled.length)} />
                            <span>Серия: {h.streak}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="muted">Пока нет данных.</p>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
      {modal?.type === "habit" && (
        <HabitEditor
          habit={modal.habit}
          habits={habits}
          goals={goals}
          api={api}
          onSave={(h) => {
            saveHabit(h);
            if (!modal.habit) {
              setHabitQuery("");
              setTab("habits");
            }
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "goal" && (
        <GoalEditor
          goal={modal.goal}
          api={api}
          onSave={(g) => {
            setGoals((old) =>
              old.some((x) => x.id === g.id)
                ? old.map((x) => (x.id === g.id ? g : x))
                : [...old, g],
            );
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "mark" && (
        <MarkEditor
          habit={modal.habit}
          date={modal.date}
          api={api}
          onSave={saveHabit}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteConfirm
          item={modal.goal || modal.habit}
          kind={modal.goal ? "goal" : "habit"}
          api={api}
          onClose={() => setModal(null)}
          onDeleted={() => {
            if (modal.goal) {
              setGoals((old) => old.filter((g) => g.id !== modal.goal.id));
              setHabits((old) =>
                old.map((h) => (h.goal === modal.goal.id ? { ...h, goal: null } : h)),
              );
            } else setHabits((old) => old.filter((h) => h.id !== modal.habit.id));
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
