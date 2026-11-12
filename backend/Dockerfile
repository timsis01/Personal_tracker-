FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p data
CMD ["sh", "-c", "python manage.py migrate --fake-initial && gunicorn config.wsgi:application --bind 0.0.0.0:8000"]
