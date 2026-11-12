import type { CSSProperties } from "react";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type Api = <T>(path: string, data?: unknown, method?: HttpMethod) => Promise<T>;
export type FieldErrors = Record<string, string | undefined>;
export interface Session {
  token: string;
  username: string;
  first_name?: string;
  email?: string;
}
export interface ProfileData {
  username: string;
  first_name: string;
  email: string;
  joined: string;
}
export type SessionUpdate = (data: ProfileData | Session) => void;
export type CompletionStatus = "done" | "missed";
export interface CompletionEntry {
  status: CompletionStatus;
  note?: string;
}
export interface Schedule {
  start_date: string;
  weekdays: number[];
}
export interface ProgressHabit extends Schedule {
  entries?: Partial<Record<string, CompletionEntry>>;
}
export interface Habit extends Schedule {
  id: number;
  title: string;
  icon: string;
  color: string;
  goal: number | null;
  streak: number;
  best_streak: number;
  done: boolean;
  dates: string[];
  entries: Partial<Record<string, CompletionEntry>>;
}
export interface Goal {
  id: number;
  title: string;
  unit: string;
  target: number;
  current: number;
  deadline: string | null;
}
export interface GoalDraft {
  title: string;
  unit: string;
  target: number | string;
  current: number | string;
  deadline: string | null;
}
export interface DayProgress {
  date: string;
  total: number;
  completed: number;
  complete: boolean;
}
export interface GlobalStreak {
  current: number;
  best: number;
  todayComplete: boolean;
  today: DayProgress;
  recent: DayProgress[];
}
export type IconName =
  | "user"
  | "lock"
  | "timer"
  | "edit"
  | "trash"
  | "grid"
  | "plus"
  | "check"
  | "close"
  | "arrow"
  | "chart"
  | "award"
  | "heart"
  | "book"
  | "activity"
  | "target"
  | "moon"
  | "eye"
  | "logout"
  | "flame";
export type Tab = "today" | "habits" | "calendar" | "goals" | "stats" | "profile";
export type ModalState =
  | { type: "habit"; habit?: Habit }
  | { type: "goal"; goal?: Goal }
  | { type: "mark"; habit: Habit; date: string }
  | { type: "delete"; habit: Habit; goal?: never }
  | { type: "delete"; goal: Goal; habit?: never };
export type VariableStyle = CSSProperties & Record<`--${string}`, string | number>;

export class ApiError extends Error {
  constructor(
    message: string,
    public fields?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(
        error instanceof Error ? error.message : "Не удалось выполнить запрос.",
      );
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
