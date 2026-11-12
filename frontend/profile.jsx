import React, { useEffect, useState } from "react";
import { Icon, Field, passwordRules, Avatar } from "./ui.jsx";

export function Profile({
  api,
  session,
  onSessionUpdate,
  onLogin,
  habitCount,
  goalCount,
}) {
  const [profile, P] = useState(null),
    [values, V] = useState({
      username: session.username,
      first_name: "",
      email: "",
    }),
    [errors, E] = useState({}),
    [loading, L] = useState(false),
    [saving, S] = useState(false),
    [saved, Success] = useState(""),
    [loadError, LE] = useState(""),
    [retry, R] = useState(0);
  const [passwords, Passwords] = useState({
      current_password: "",
      password: "",
      password_confirm: "",
    }),
    [passwordErrors, PE] = useState({}),
    [changing, C] = useState(false),
    [changed, Changed] = useState(""),
    [show, Show] = useState(false);
  useEffect(() => {
    let active = true;
    if (!session.token) return;
    L(true);
    LE("");
    api("/profile/")
      .then((data) => {
        if (active) {
          P(data);
          V({
            username: data.username,
            first_name: data.first_name,
            email: data.email,
          });
        }
      })
      .catch((e) => {
        if (active) LE(e.message);
      })
      .finally(() => {
        if (active) L(false);
      });
    return () => {
      active = false;
    };
  }, [session.token, retry]);
  const update = (e) => {
    V({ ...values, [e.target.name]: e.target.value });
    E({ ...errors, [e.target.name]: undefined });
    Success("");
  };
  async function save(e) {
    e.preventDefault();
    const issues = {};
    if (!/^[A-Za-z0-9_]{3,30}$/.test(values.username.trim()))
      issues.username = "От 3 до 30 символов: латиница, цифры и подчёркивание.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      issues.email = "Введите корректный адрес почты.";
    if (Object.keys(issues).length) {
      E(issues);
      return;
    }
    S(true);
    E({});
    Success("");
    try {
      const data = await api("/profile/", values, "PATCH");
      P(data);
      V({
        username: data.username,
        first_name: data.first_name,
        email: data.email,
      });
      onSessionUpdate(data);
      Success("Профиль сохранён.");
    } catch (e) {
      E(e.fields || { form: e.message });
    } finally {
      S(false);
    }
  }
  const updatePassword = (e) => {
    Passwords({ ...passwords, [e.target.name]: e.target.value });
    PE({ ...passwordErrors, [e.target.name]: undefined });
    Changed("");
  };
  async function change(e) {
    e.preventDefault();
    const issues = {};
    if (!passwords.current_password)
      issues.current_password = "Введите текущий пароль.";
    const failed = passwordRules.filter(
      ([, test]) => !test(passwords.password),
    );
    if (failed.length)
      issues.password = failed.map(([text]) => text).join(". ");
    if (passwords.password === passwords.current_password)
      issues.password = "Новый пароль должен отличаться от текущего.";
    if (passwords.password !== passwords.password_confirm)
      issues.password_confirm = "Пароли не совпадают.";
    if (Object.keys(issues).length) {
      PE(issues);
      return;
    }
    C(true);
    PE({});
    Changed("");
    try {
      const data = await api("/profile/password/", passwords);
      onSessionUpdate(data);
      Passwords({ current_password: "", password: "", password_confirm: "" });
      Show(false);
      Changed("Пароль изменён. Другие сеансы завершены.");
    } catch (e) {
      PE(e.fields || { form: e.message });
    } finally {
      C(false);
    }
  }
  if (!session.token)
    return (
      <div className="empty-panel">
        <Icon name="user" size={28} />
        <h2>Войдите в аккаунт</h2>
        <p>Профиль и настройки доступны после входа.</p>
        <button className="button primary" onClick={onLogin}>
          Войти
        </button>
      </div>
    );
  if (loading && !profile)
    return (
      <div className="empty-panel" role="status">
        Загружаем профиль…
      </div>
    );
  if (loadError && !profile)
    return (
      <div className="error-banner" role="alert">
        {loadError}
        <button className="text-button" onClick={() => R((n) => n + 1)}>
          Повторить
        </button>
      </div>
    );
  return (
    <>
      <section className="profile-overview">
        <Avatar size={64} />
        <div>
          <span className="profile-eyebrow">Личный аккаунт</span>
          <h2>
            {profile?.first_name || profile?.username || session.username}
          </h2>
          <p>
            @{profile?.username || session.username}
            {profile?.joined &&
              " · С нами с " +
                new Date(profile.joined + "T12:00:00Z").toLocaleDateString(
                  "ru-RU",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  },
                )}
          </p>
        </div>
        <div className="profile-counts">
          <span>
            <strong>{habitCount}</strong>привычек
          </span>
          <span>
            <strong>{goalCount}</strong>целей
          </span>
        </div>
      </section>
      <div className="profile-grid">
        <section className="profile-panel">
          <h2>
            <Icon name="user" />
            Редактор профиля
          </h2>
          <p>Имя для отображения и данные аккаунта.</p>
          <form noValidate onSubmit={save}>
            <Field
              label="Ваше имя"
              name="first_name"
              value={values.first_name}
              onChange={update}
              error={errors.first_name}
              maxLength={80}
              autoComplete="given-name"
              placeholder="Как к вам обращаться"
            />
            <Field
              label="Имя пользователя"
              name="username"
              value={values.username}
              onChange={update}
              error={errors.username}
              maxLength={30}
              autoComplete="username"
              hint="Используется для входа. Латиница, цифры и подчёркивание."
            />
            <Field
              label="Почта (необязательно)"
              name="email"
              type="email"
              value={values.email}
              onChange={update}
              error={errors.email}
              maxLength={254}
              autoComplete="email"
              placeholder="name@example.com"
              hint="Для входа используется имя пользователя."
            />
            {errors.form && (
              <div role="alert" className="error-banner">
                {errors.form}
              </div>
            )}
            {saved && (
              <div role="status" className="success-banner">
                {saved}
              </div>
            )}
            <div className="profile-actions">
              <button
                className="button secondary"
                type="button"
                disabled={saving || changing}
                onClick={() => {
                  V({
                    username: profile.username,
                    first_name: profile.first_name,
                    email: profile.email,
                  });
                  E({});
                  Success("");
                }}
              >
                Отменить изменения
              </button>
              <button
                className="button primary"
                disabled={saving || changing || loading}
              >
                {saving ? "Сохраняем…" : "Сохранить профиль"}
              </button>
            </div>
          </form>
        </section>
        <section className="profile-panel">
          <h2>
            <Icon name="lock" />
            Смена пароля
          </h2>
          <p>Укажите текущий пароль и придумайте новый.</p>
          <form noValidate onSubmit={change}>
            <Field
              label="Текущий пароль"
              name="current_password"
              type={show ? "text" : "password"}
              value={passwords.current_password}
              onChange={updatePassword}
              error={passwordErrors.current_password}
              autoComplete="current-password"
            />
            <Field
              label="Новый пароль"
              name="password"
              type={show ? "text" : "password"}
              value={passwords.password}
              onChange={updatePassword}
              error={passwordErrors.password}
              maxLength={128}
              autoComplete="new-password"
            />
            <ul className="password-rules">
              {passwordRules.map(([text, test]) => (
                <li
                  key={text}
                  className={test(passwords.password) ? "passed" : ""}
                >
                  <Icon
                    name={test(passwords.password) ? "check" : "close"}
                    size={13}
                  />
                  {text}
                </li>
              ))}
            </ul>
            <Field
              label="Подтвердите новый пароль"
              name="password_confirm"
              type={show ? "text" : "password"}
              value={passwords.password_confirm}
              onChange={updatePassword}
              error={passwordErrors.password_confirm}
              maxLength={128}
              autoComplete="new-password"
            />
            <label className="show-password">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => Show(e.target.checked)}
              />
              Показать пароли
            </label>
            <p className="profile-security-note">
              После смены пароля другие сеансы будут завершены.
            </p>
            {passwordErrors.form && (
              <div role="alert" className="error-banner">
                {passwordErrors.form}
              </div>
            )}
            {changed && (
              <div role="status" className="success-banner">
                {changed}
              </div>
            )}
            <button
              className="button primary"
              disabled={changing || saving || loading}
            >
              {changing ? "Меняем пароль…" : "Изменить пароль"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
