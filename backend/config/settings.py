import os
from pathlib import Path
BASE_DIR=Path(__file__).resolve().parent.parent
SECRET_KEY=os.environ.get('SECRET_KEY','local-development-key-change-in-production')
DEBUG=False
ALLOWED_HOSTS=['localhost','127.0.0.1','backend']
INSTALLED_APPS=['django.contrib.auth','django.contrib.contenttypes','rest_framework','rest_framework.authtoken','corsheaders','habits']
MIDDLEWARE=['corsheaders.middleware.CorsMiddleware','django.middleware.security.SecurityMiddleware','django.middleware.common.CommonMiddleware']
ROOT_URLCONF='config.urls'
DATABASES={'default':{'ENGINE':'django.db.backends.sqlite3','NAME':BASE_DIR/'data/db.sqlite3'}}
DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
USE_TZ=True
TIME_ZONE='Europe/Moscow'
CORS_ALLOWED_ORIGINS=['http://localhost:3000','http://localhost:5173']
REST_FRAMEWORK={'DEFAULT_AUTHENTICATION_CLASSES':['rest_framework.authentication.TokenAuthentication'],'DEFAULT_PERMISSION_CLASSES':['rest_framework.permissions.IsAuthenticated']}

AUTH_PASSWORD_VALIDATORS=[
 {'NAME':'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
 {'NAME':'django.contrib.auth.password_validation.CommonPasswordValidator'},
]
LANGUAGE_CODE='ru'
