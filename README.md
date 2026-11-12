# Ритм

Трекер привычек и целей: Django REST API, PostgreSQL 17, React 19 и TypeScript.

## Запуск

    docker desktop start
    docker compose up --build -d

Сайт: http://localhost:3000. API: http://localhost:8000/api/. Healthcheck: /api/health/.

Настройки перечислены в .env.example. Для своих значений скопируйте его в .env до первого запуска PostgreSQL. Compose имеет рабочие значения для локальной разработки. Изменение пароля в .env не меняет пароль существующей базы.

База доступна локально на 127.0.0.1:5433, внутри Docker — db:5432. Данные хранятся в postgres_data. Compose ждёт готовности базы перед запуском backend и готовности API перед запуском frontend.

    docker compose logs -f
    docker compose stop

Остановка сохраняет данные. Удаление volumes удаляет базы данных.

## Структура

    backend/
      config/                настройки и маршруты
      habits/
        models.py            модели PostgreSQL
        types.py             типы ответов API и JSON-границы
        services/            валидация, расчёт серий, представление данных
        views/               авторизация, профиль, привычки, цели, healthcheck
        management/commands/ демо-данные и импорт SQLite
        migrations/          миграции схемы и данных
        tests.py             регрессионные тесты API
    frontend/
      types.ts               модели, API, ошибки и состояния интерфейса
      src.tsx                вход в приложение и HTTP-клиент
      workspace.tsx          разделы и календарь
      ui.tsx                 общие компоненты и авторизация
      profile.tsx            профиль и смена пароля
      streak.tsx             анимированный огонёк
      tracking.ts            расписания и расчёт общей серии
      tests/                 клиентские регрессионные тесты

## Перенос SQLite

Рабочий backend использует только PostgreSQL. Старый volume tracker_data подключён в /legacy только для чтения.

Для нового переноса остановите старый backend, сохраните копию SQLite, затем выполните:

    docker compose up -d db
    docker compose run --rm backend python manage.py migrate --noinput
    docker compose run --rm backend python manage.py import_sqlite --source /legacy/db.sqlite3
    docker compose up -d

Импорт допускается только в пустую PostgreSQL-базу. Сохраняются пользователи, группы, токены, хеши паролей, цели, привычки, отметки и ID. Команда сравнивает все записи и поля с источником, проверяет количество строк и восстанавливает sequence-счётчики. Ошибка откатывает транзакцию. SQLite открывается только для чтения, временные JSON-файлы удаляются автоматически.

В текущем окружении перенос уже выполнен. Повторный импорт не нужен. Резервная копия: backend/data/pre-postgres.sqlite3, файл исключён из Git.

## Локальная разработка

Запустите PostgreSQL из корня: docker compose up -d db.

Из backend, команды для Windows:

    python -m venv .venv
    .venv/Scripts/python -m pip install -r requirements-dev.txt
    .venv/Scripts/python manage.py migrate
    .venv/Scripts/python manage.py runserver

На Linux/macOS используйте .venv/bin/python. Локальный backend подключается к 127.0.0.1:5433. Собственные параметры передайте переменными окружения из .env.example: Django не загружает .env автоматически, Compose загружает.

Из frontend:

    npm ci
    npm run dev

## Проверки и форматирование

Из backend:

    .venv/Scripts/python -m ruff check .
    .venv/Scripts/python -m ruff format --check .
    .venv/Scripts/python -m mypy config habits manage.py
    .venv/Scripts/python manage.py test habits
    .venv/Scripts/python manage.py makemigrations --check --dry-run

Серверные тесты работают на PostgreSQL в отдельной временной базе. Локальная роль Compose имеет право создания тестовых баз. Форматирование: .venv/Scripts/python -m ruff format .

Из frontend:

    npm run typecheck
    npm test
    npm run build
    npm run format:check

Форматирование: npm run format. Из корня frontend/node_modules/.bin/prettier --check . проверяет также README и Compose. TypeScript и mypy работают в строгом режиме. .editorconfig задаёт UTF-8, LF и отступы.

## Возможности

- Полный список привычек, поиск, расписания, цвета, редактирование и удаление.
- План на сегодня, выполнение и отмена отметки, заметки.
- Сетка календаря, компактная таблица месяца и адаптивный вид на телефоне.
- Цели с числовым результатом, сроком и связанными привычками. Прогресс цели обновляется вручную.
- Личные серии и общий огонёк за дни, когда выполнены все запланированные привычки. Выходные нейтральны; незаконченный сегодняшний день сохраняет вчерашнюю серию.
- Статистика за 14 завершённых дней и сравнение двух недель.
- Профиль, смена пароля, обновление токена и завершение старых сеансов.

Дни считаются в Europe/Moscow. Анимации учитывают prefers-reduced-motion.

## Демо-данные

    docker compose exec backend python manage.py seed_demo --username demo --password "November26!Run" --month 2026-11

Создаются 12 привычек, 3 цели и история по текущий день выбранного месяца. Существующий аккаунт не изменяется; если имя занято, выберите другое.

## Публичное размещение

Задайте собственные SECRET_KEY и пароль PostgreSQL, настройте домен, HTTPS и ограничение попыток входа. Авторизация использует токен в localStorage. Лицензия локального шрифта Golos Text: frontend/public/fonts/OFL.txt.
