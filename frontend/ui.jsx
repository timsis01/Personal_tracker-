import React, { useEffect, useRef, useState } from "react";

import "./style.css";

const dayLabel = (n) =>
  n % 10 === 1 && n % 100 !== 11
    ? "день"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "дня"
      : "дней";
const API = location.port === "5173" ? "http://localhost:8000/api" : "/api";
const categories = [
  ["general", "Личное", "grid"],
  ["health", "Здоровье", "heart"],
  ["learn", "Обучение", "book"],
  ["sport", "Движение", "activity"],
  ["focus", "Работа", "target"],
  ["rest", "Отдых", "moon"],
];
const legacy = {
  "🌱": "general",
  "📚": "learn",
  "💧": "health",
  "🏃": "sport",
  "🧘": "rest",
  "🎨": "general",
};
const categoryOf = (h) =>
  categories.find((c) => c[0] === (legacy[h.icon] || h.icon)) || categories[0];
const passwordRules = [
  ["От 8 до 128 символов", (p) => p.length >= 8 && p.length <= 128],
  [
    "Только латиница, цифры и спецсимволы, без пробелов",
    (p) => /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};:,.?/~]+$/.test(p),
  ],
  ["Заглавная и строчная буквы", (p) => /[A-Z]/.test(p) && /[a-z]/.test(p)],
  ["Хотя бы одна цифра", (p) => /[0-9]/.test(p)],
];
function Icon({ name = "grid", size = 20, ...props }) {
  const paths = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
      </>
    ),
    timer: (
      <>
        <path d="M9 2h6M12 2v3m6 1 2 2" />
        <circle cx="12" cy="14" r="8" />
        <path d="M12 10v4l2 2" />
      </>
    ),
    edit: (
      <>
        <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    chart: (
      <>
        <path d="M4 4v16h16M8 15v-4m5 4V7m5 8V4" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="m8 12-2 9 6-3 6 3-2-9" />
      </>
    ),
    heart: (
      <path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 1 9 8 15 7-6 12-11 8-15Z" />
    ),
    book: (
      <>
        <path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z" />
      </>
    ),
    activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    moon: <path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z" />,
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    logout: <path d="M9 4H4v16h5m6-12 4 4-4 4M8 12h11" />,
    flame: (
      <path d="M12 2c2 6-4 7-4 11 0 2 2 3 3 2 2-1 1-4 3-5 6 5 5 12-2 12C1 22 2 12 7 8c0 3 1 3 2 2 2-2 3-5 3-8Z" />
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.grid}
    </svg>
  );
}
function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("input,button")?.focus();
    function keys(e) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const all = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        ];
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", keys);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="icon-button modal-close"
          aria-label="Закрыть окно"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <div className="modal-scroll">
          <div className="modal-mark">
            <Icon name="target" size={26} />
          </div>
          <h2 id="modal-title">{title}</h2>
          <p className="modal-subtitle">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
function Avatar({ size = 32 }) {
  return (
    <img
      className="default-avatar"
      src="/default-avatar.svg"
      width={size}
      height={size}
      alt=""
    />
  );
}
function Field({ label, name, error, hint, children, ...props }) {
  return (
    <div className={"field " + (error ? "invalid" : "")}>
      <label htmlFor={name}>{label}</label>
      <div className="input-wrap">
        <input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={name + "-hint"}
          {...props}
        />
        {children}
      </div>
      <div id={name + "-hint"} className={error ? "field-error" : "field-hint"}>
        {error || hint}
      </div>
    </div>
  );
}
function AuthForm({ api, onSuccess, onClose }) {
  const [register, R] = useState(false),
    [values, V] = useState({
      username: "",
      password: "",
      password_confirm: "",
    }),
    [errors, E] = useState({}),
    [busy, B] = useState(false),
    [show, S] = useState(false);
  const update = (e) => {
    V({ ...values, [e.target.name]: e.target.value });
    E({ ...errors, [e.target.name]: undefined, form: undefined });
  };
  async function submit(e) {
    e.preventDefault();
    const issues = {};
    if (register) {
      if (!/^[A-Za-z0-9_]{3,30}$/.test(values.username.trim()))
        issues.username =
          "От 3 до 30 символов: латиница, цифры и подчёркивание.";
      const failed = passwordRules.filter(([, test]) => !test(values.password));
      if (failed.length)
        issues.password = failed.map(([text]) => text).join(". ");
      if (values.password !== values.password_confirm)
        issues.password_confirm = "Пароли не совпадают.";
    } else {
      if (!values.username.trim())
        issues.username = "Введите имя пользователя.";
      if (!values.password) issues.password = "Введите пароль.";
    }
    if (Object.keys(issues).length) {
      E(issues);
      return;
    }
    B(true);
    try {
      onSuccess(await api("/auth/", { ...values, register }));
    } catch (e) {
      E(e.fields || { form: e.message });
    } finally {
      B(false);
    }
  }
  return (
    <Modal
      title={register ? "Создать аккаунт" : "С возвращением"}
      subtitle={
        register
          ? "Сохраняйте привычки и наблюдайте за своим прогрессом."
          : "Войдите, чтобы продолжить в своём ритме."
      }
      onClose={onClose}
    >
      <div className="segmented">
        <button
          className={!register ? "selected" : ""}
          onClick={() => {
            R(false);
            E({});
          }}
        >
          Вход
        </button>
        <button
          className={register ? "selected" : ""}
          onClick={() => {
            R(true);
            E({});
          }}
        >
          Регистрация
        </button>
      </div>
      <form noValidate onSubmit={submit}>
        <Field
          label="Имя пользователя"
          name="username"
          value={values.username}
          onChange={update}
          error={errors.username}
          autoComplete="username"
          maxLength={register ? 30 : 150}
          hint={register ? "Латинские буквы, цифры и подчёркивание." : ""}
          placeholder="Например, alex_morgan"
        />
        <Field
          label="Пароль"
          name="password"
          value={values.password}
          onChange={update}
          error={errors.password}
          type={show ? "text" : "password"}
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={128}
          placeholder={
            register ? "Придумайте надёжный пароль" : "Введите пароль"
          }
        >
          <button
            type="button"
            className="password-toggle"
            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
            aria-pressed={show}
            onClick={() => S(!show)}
          >
            <Icon name="eye" />
          </button>
        </Field>
        {register && (
          <>
            <ul className="password-rules">
              {passwordRules.map(([text, test]) => (
                <li
                  key={text}
                  className={test(values.password) ? "passed" : ""}
                >
                  <Icon
                    name={test(values.password) ? "check" : "close"}
                    size={13}
                  />
                  {text}
                </li>
              ))}
            </ul>
            <Field
              label="Подтверждение пароля"
              name="password_confirm"
              value={values.password_confirm}
              onChange={update}
              error={errors.password_confirm}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              maxLength={128}
              placeholder="Повторите пароль"
            />
          </>
        )}
        {errors.form && (
          <div className="error-banner" role="alert">
            {errors.form}
          </div>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? "Подождите…" : register ? "Создать аккаунт" : "Войти"}
          <Icon name="arrow" size={18} />
        </button>
      </form>
      <p className="form-footer">
        {register ? "Уже зарегистрированы?" : "Впервые здесь?"}{" "}
        <button
          className="text-button"
          onClick={() => {
            R(!register);
            E({});
          }}
        >
          {register ? "Войти" : "Создать аккаунт"}
        </button>
      </p>
    </Modal>
  );
}

export {
  Icon,
  Modal,
  Field,
  AuthForm,
  categories,
  categoryOf,
  passwordRules,
  Avatar,
};
