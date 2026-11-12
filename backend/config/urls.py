from django.urls import path
from habits.views import auth,habits,complete,delete_habit,goals,profile,change_password
urlpatterns=[path('api/profile/',profile),path('api/profile/password/',change_password),path('api/goals/',goals),path('api/goals/<int:pk>/',goals),path('api/habits/<int:pk>/',delete_habit),path('api/auth/',auth),path('api/habits/',habits),path('api/habits/<int:pk>/complete/',complete)]
