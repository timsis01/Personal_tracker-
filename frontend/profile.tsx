import type { ChangeEvent, FormEvent } from "react";
import { toApiError } from "./types";
import type { Api, Session, ProfileData, SessionUpdate, FieldErrors } from "./types";
import React, { useEffect, useState } from "react";
import { Icon, Field, passwordRules, Avatar } from "./ui";

export function Profile({
  api,
  session,
  onSessionUpdate,
  onLogin,
  habitCount,
  goalCount,
}: {
  api: Api;
  session: Session;
  onSessionUpdate: SessionUpdate;
  onLogin: () => void;
  habitCount: number;
  goalCount: number;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null),
    [values, setValues] = useState({
      username: session.username,
      first_name: "",
      email: "",
    }),
    [errors, setErrors] = useState<FieldErrors>({}),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [saved, setSaveMessage] = useState(""),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  const [passwords, setPasswords] = useState({
      current_password: "",
      password: "",
      password_confirm: "",
    }),
    [passwordErrors, setPasswordErrors] = useState<FieldErrors>({}),
    [changing, setChangingPassword] = useState(false),
    [changed, setPasswordMessage] = useState(""),
    [show, setShowPasswords] = useState(false);
  useEffect(() => {
    let active = true;
    if (!session.token) return;
    setLoading(true);
    setLoadError("");
    api<ProfileData>("/profile/")
      .then((data) => {
        if (active) {
          setProfile(data);
          setValues({
            username: data.username,
            first_name: data.first_name,
            email: data.email,
          });
        }
      })
      .catch((cause: unknown) => {
        const e = toApiError(cause);
        if (active) setLoadError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.token, retry]);
  const update = (e: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
    setSaveMessage("");
  };
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const issues: FieldErrors = {};
    if (!/^[A-Za-z0-9_]{3,30}$/.test(values.username.trim()))
      issues.username = "От 3 до 30 символов: латиница, цифры и подчёркивание.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      issues.email = "Введите корректный адрес почты.";
    if (Object.keys(issues).length) {
      setErrors(issues);
      return;
    }
    setSaving(true);
    setErrors({});
    setSaveMessage("");
    try {
      const data = await api<ProfileData>("/profile/", values, "PATCH");
      setProfile(data);
      setValues({
        username: data.username,
        first_name: data.first_name,
        email: data.email,
      });
      onSessionUpdate(data);
      setSaveMessage("Профиль сохранён.");
    } catch (cause) {
      const e = toApiError(cause);
      setErrors(e.fields || { form: e.message });
    } finally {
      setSaving(false);
    }
  }
  const updatePassword = (e: ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setPasswordErrors({ ...passwordErrors, [e.target.name]: undefined });
    setPasswordMessage("");
  };
  async function change(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const issues: FieldErrors = {};
    if (!passwords.current_password) issues.current_password = "Введите текущий пароль.";
    const failed = passwordRules.filter(([, test]) => !test(passwords.password));
    if (failed.length) issues.password = failed.map(([text]) => text).join(". ");
    if (passwords.password === passwords.current_password)
      issues.password = "Новый пароль должен отличаться от текущего.";
    if (passwords.password !== passwords.password_confirm)
      issues.password_confirm = "Пароли не совпадают.";
    if (Object.keys(issues).length) {
      setPasswordErrors(issues);
      return;
    }
    setChangingPassword(true);
    setPasswordErrors({});
    setPasswordMessage("");
    try {
      const data = await api<ProfileData & Session>("/profile/password/", passwords);
      onSessionUpdate(data);
      setPasswords({ current_password: "", password: "", password_confirm: "" });
      setShowPasswords(false);
      setPasswordMessage("Пароль изменён. Другие сеансы завершены.");
    } catch (cause) {
      const e = toApiError(cause);
      setPasswordErrors(e.fields || { form: e.message });
    } finally {
      setChangingPassword(false);
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
        <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
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
          <h2>{profile?.first_name || profile?.username || session.username}</h2>
          <p>
            @{profile?.username || session.username}
            {profile?.joined &&
              " · С нами с " +
                new Date(profile.joined + "T12:00:00Z").toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
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
                  setValues({
                    username: profile!.username,
                    first_name: profile!.first_name,
                    email: profile!.email,
                  });
                  setErrors({});
                  setSaveMessage("");
                }}
              >
                Отменить изменения
              </button>
              <button className="button primary" disabled={saving || changing || loading}>
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
                <li key={text} className={test(passwords.password) ? "passed" : ""}>
                  <Icon name={test(passwords.password) ? "check" : "close"} size={13} />
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
                onChange={(e) => setShowPasswords(e.target.checked)}
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
            <button className="button primary" disabled={changing || saving || loading}>
              {changing ? "Меняем пароль…" : "Изменить пароль"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
