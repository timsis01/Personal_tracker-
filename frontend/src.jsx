import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthForm } from "./ui.jsx";
import { Workspace } from "./workspace.jsx";
const API = location.port === "5173" ? "http://localhost:8000/api" : "/api";
function App() {
  const [session, setSession] = useState(() => ({
    token: localStorage.token || "",
    username: localStorage.username || "",
  }));
  const [auth, setAuth] = useState(false);
  async function api(path, data, method) {
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
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && session.token) {
        logout();
        setAuth(true);
      }
      const e = Error(body.error || "Не удалось сохранить изменения.");
      if (body.errors)
        e.fields = Object.fromEntries(
          Object.entries(body.errors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.join(" ") : v,
          ]),
        );
      throw e;
    }
    return body;
  }
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setSession({ token: "", username: "" });
  }
  function updateSession(data) {
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

createRoot(document.getElementById("root")).render(<App />);
