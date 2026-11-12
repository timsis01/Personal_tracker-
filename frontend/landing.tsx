import React, { useState } from "react";
import { Icon } from "./ui";
import "./landing.css";

type LandingProps = {
  onLogin: () => void;
  onRegister: () => void;
};

const previewDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const initialDays = [true, true, true, true, false, false, false];

export function Landing({ onLogin, onRegister }: LandingProps) {
  const [markedDays, setMarkedDays] = useState(initialDays);
  const markedCount = markedDays.filter(Boolean).length;
  const weekComplete = markedCount === previewDays.length;

  function toggleDay(index: number) {
    setMarkedDays((current) =>
      current.map((marked, day) => (day === index ? !marked : marked)),
    );
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-shell landing-header-inner">
          <a className="landing-logo" href="/" aria-label="Ритм — главная">
            <img src="/favicon.svg?v=flame" width="38" height="38" alt="" />
            <span>
              ритм<span className="landing-logo-dot">.</span>
            </span>
          </a>
          <div className="landing-header-actions">
            <button className="landing-link" type="button" onClick={onLogin}>
              Войти
            </button>
            <button className="landing-header-cta" type="button" onClick={onRegister}>
              Начать бесплатно
            </button>
          </div>
        </div>
      </header>

      <main className="landing-shell">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">
              Каждый день
              <br />в своём <em>ритме.</em>
            </h1>
            <p className="landing-intro">
              Планируйте привычки, отмечайте выполненное и следите за серией дней, когда
              удалось сделать всё намеченное.
            </p>
            <div className="landing-actions">
              <button className="landing-primary" type="button" onClick={onRegister}>
                Создать аккаунт <Icon name="arrow" size={20} />
              </button>
              <button className="landing-secondary" type="button" onClick={onLogin}>
                У меня уже есть аккаунт
              </button>
            </div>
          </div>

          <div
            className={`landing-showcase${weekComplete ? " is-celebrating" : ""}`}
            aria-label="Пример отслеживания привычек"
          >
            <div className="landing-visual">
              <picture>
                <source
                  media="(prefers-reduced-motion: reduce)"
                  srcSet="/landing-flame.webp"
                />
                <img
                  src="/landing-flame-animated.webp"
                  alt="Белый огонёк на синем фоне"
                />
              </picture>
              <span className="landing-visual-label">
                {weekComplete
                  ? "Вся неделя выполнена — огонь горит ярче"
                  : "Серия растёт, когда выполнен весь план дня"}
              </span>
              {weekComplete && (
                <>
                  <div className="landing-celebration" aria-hidden="true">
                    {Array.from({ length: 12 }, (_, index) => (
                      <i key={index} />
                    ))}
                  </div>
                  <span className="landing-reward" aria-hidden="true">
                    <Icon name="check" size={16} /> 7 из 7
                  </span>
                </>
              )}
            </div>
            <div className="landing-preview">
              <div className="landing-preview-top">
                <div>
                  <span className="landing-preview-label">ПОПРОБУЙТЕ ОТМЕТИТЬ ДНИ</span>
                  <strong aria-live="polite">
                    {weekComplete ? "Неделя закрыта!" : `${markedCount} из 7 дней`}
                  </strong>
                </div>
                <div
                  className={`landing-preview-flame${weekComplete ? " is-complete" : ""}`}
                >
                  <Icon name="flame" size={23} />
                </div>
              </div>
              <div className="landing-preview-days">
                {previewDays.map((day, index) => (
                  <div key={day}>
                    <span>{day}</span>
                    <button
                      type="button"
                      className={markedDays[index] ? "marked" : ""}
                      aria-label={`${day}: ${markedDays[index] ? "выполнено" : "отметить"}`}
                      aria-pressed={markedDays[index]}
                      onClick={() => toggleDay(index)}
                    >
                      {markedDays[index] ? (
                        <Icon name="check" size={16} />
                      ) : (
                        <Icon name="plus" size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-benefits" aria-label="Возможности Ритма">
          <div>
            <Icon name="activity" size={21} />
            <p>
              <strong>Свой график</strong>
              <span>Выбирайте дни для каждой привычки.</span>
            </p>
          </div>
          <div>
            <Icon name="grid" size={21} />
            <p>
              <strong>Вся история</strong>
              <span>Смотрите отметки в календаре.</span>
            </p>
          </div>
          <div>
            <Icon name="flame" size={21} />
            <p>
              <strong>Общая серия</strong>
              <span>Выполняйте дневной план и сохраняйте темп.</span>
            </p>
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-shell">
        Ритм — пространство для ваших привычек.
      </footer>
    </div>
  );
}
