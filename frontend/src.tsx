import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthForm } from "./ui";
import { Workspace } from "./workspace";
import { ApiError, isRecord } from "./types";
import type { Session, ProfileData, HttpMethod } from "./types";
const API = location.port === "5173" ? "http://localhost:8000/api" : "/api";
function App() {
  const [session, setSession] = useState<Session>(() => ({
    token: localStorage.token || "",
    username: localStorage.username || "",
  }));
  const [auth, setAuth] = useState(false);
  async function api<T>(path: string, data?: unknown, method?: HttpMethod): Promise<T> {
    let response;
    try {
      response = await fetch(API + path, {
        method: method || (data ? "POST" : "GET"),
        headers: {
          "Content-Type": "application/json",
          ...(session.token ? { Authorization: "Token " + session.token } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
    } catch {
      throw Error("Сервер недоступен. Попробуйте ещё раз.");
    }
    const body: unknown = await response.json().catch(() => ({}));
    const errorBody = isRecord(body) ? body : {};
    if (!response.ok) {
      if (response.status === 401 && session.token) {
        logout();
        setAuth(true);
      }
      const e = new ApiError(
        typeof errorBody.error === "string"
          ? errorBody.error
          : "Не удалось сохранить изменения.",
      );
      if (isRecord(errorBody.errors))
        e.fields = Object.fromEntries(
          Object.entries(errorBody.errors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.join(" ") : String(v),
          ]),
        );
      throw e;
    }
    return body as T;
  }
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setSession({ token: "", username: "" });
  }
  function updateSession(data: ProfileData | Session) {
    setSession((current) => {
      const next = { ...current, ...data };
      localStorage.token = next.token;
      localStorage.username = next.username;
      return next;
    });
  }
  return (
    <>
      <Workspace
        api={api}
        session={session}
        onLogin={() => setAuth(true)}
        onLogout={logout}
        onSessionUpdate={updateSession}
      />
      {auth && (
        <AuthForm
          api={api}
          onClose={() => setAuth(false)}
          onSuccess={(data) => {
            localStorage.token = data.token;
            localStorage.username = data.username;
            setSession(data);
            setAuth(false);
          }}
        />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
