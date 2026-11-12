from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .models import Habit,Completion,Goal
def password_errors(password, user):
    import re
    if not isinstance(password,str):return ['Введите пароль.']
    errors=[]
    if not 8<=len(password)<=128:errors.append('От 8 до 128 символов.')
    if not re.fullmatch(r'[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};:,.?/~]+',password):errors.append('Только латинские буквы, цифры и специальные символы, без пробелов.')
    if not re.search('[a-z]',password) or not re.search('[A-Z]',password):errors.append('Добавьте строчную и заглавную латинские буквы.')
    if not re.search('[0-9]',password):errors.append('Добавьте хотя бы одну цифру.')
    if not errors:
        try:validate_password(password,user=user)
        except ValidationError as e:errors.extend(e.messages)
    return errors


@api_view(['POST'])
@permission_classes([AllowAny])
def auth(request):
    import re
    name=request.data.get('username','')
    password=request.data.get('password','')
    if not isinstance(name,str) or not isinstance(password,str):
        return Response({'error':'Некорректные данные формы'},status=400)
    name=name.strip()
    if request.data.get('register') is True:
        errors={}
        if not re.fullmatch(r'[A-Za-z0-9_]{3,30}',name):
            errors['username']=['От 3 до 30 символов: латинские буквы, цифры и подчёркивание.']
        rules = password_errors(password, User(username=name))
        if rules:errors['password']=rules
        if request.data.get('password_confirm')!=password:
            errors['password_confirm']=['Пароли не совпадают.']
        if errors:return Response({'errors':errors},status=400)
        try:User.objects.create_user(username=name,password=password)
        except IntegrityError:return Response({'errors':{'username':['Это имя уже занято. Выберите другое.']}},status=400)
    user=authenticate(username=name,password=password)
    if not user:return Response({'error':'Неверное имя пользователя или пароль.'},status=400)
    return Response({'token':Token.objects.get_or_create(user=user)[0].key,'username':user.username})

def scheduled(h, day):
    return day >= h.start_date and day.weekday() in h.weekdays


def serialize(h):
    today = timezone.localdate()
    records = list(h.completions.all())
    dates = {r.date for r in records if r.status == 'done'}
    cursor = today
    if today not in dates:
        cursor -= timedelta(days=1)
    streak = 0
    while cursor >= h.start_date:
        if scheduled(h, cursor):
            if cursor not in dates:
                break
            streak += 1
        cursor -= timedelta(days=1)
    best = run = 0
    cursor = h.start_date
    while cursor <= today:
        if scheduled(h, cursor):
            run = run + 1 if cursor in dates else 0
            best = max(best, run)
        cursor += timedelta(days=1)
    return {'id':h.id,'title':h.title,'icon':h.icon,'color':h.color,'weekdays':h.weekdays,
            'start_date':h.start_date.isoformat(),'goal':h.goal_id,
            'streak':streak,'best_streak':best,'done':today in dates,
            'dates':[d.isoformat() for d in sorted(dates)],
            'entries':{r.date.isoformat():{'status':r.status,'note':r.note} for r in records}}


def habit_errors(data, user):
    import re
    errors = {}
    if 'color' in data and (not isinstance(data['color'],str) or not re.fullmatch(r'#[0-9a-fA-F]{6}',data['color'])):
        errors['color'] = ['Выберите корректный цвет.']
    if 'title' in data and (not isinstance(data['title'],str) or not 3 <= len(data['title'].strip()) <= 120):
        errors['title'] = ['Название: от 3 до 120 символов.']
    if 'icon' in data and data['icon'] not in ['general','health','learn','sport','focus','rest']:
        errors['icon'] = ['Выберите категорию из списка.']
    if 'weekdays' in data:
        days = data['weekdays']
        if not isinstance(days,list) or not days or any(type(d) is not int or d not in range(7) for d in days) or len(set(days)) != len(days):
            errors['weekdays'] = ['Выберите хотя бы один день недели.']
    if data.get('goal') is not None:
        if type(data['goal']) is not int or not Goal.objects.filter(pk=data['goal'],user=user).exists():
            errors['goal'] = ['Цель не найдена.']
    return errors


@api_view(['GET','POST'])
def habits(request):
    if request.method == 'POST':
        data = {'title':request.data.get('title',''), **request.data}
        errors = habit_errors(data, request.user)
        if errors:return Response({'errors':errors},status=400)
        from .colors import next_color
        h = Habit.objects.create(color=data.get('color',next_color(request.user)),user=request.user,title=data['title'].strip(),icon=data.get('icon','general'),weekdays=data.get('weekdays',list(range(7))),goal_id=data.get('goal'))
        return Response(serialize(h),status=201)
    return Response([serialize(h) for h in Habit.objects.filter(user=request.user).prefetch_related('completions').order_by('id')])


@api_view(['PATCH','DELETE'])
def delete_habit(request,pk):
    try:h = Habit.objects.get(pk=pk,user=request.user)
    except Habit.DoesNotExist:return Response({'error':'Привычка не найдена.'},status=404)
    if request.method == 'DELETE':
        h.delete()
        return Response(status=204)
    errors = habit_errors(request.data,request.user)
    if errors:return Response({'errors':errors},status=400)
    for key in ['title','icon','color','weekdays','goal']:
        if key in request.data:
            value = request.data[key]
            setattr(h,'goal_id' if key == 'goal' else key,value.strip() if key == 'title' else value)
    h.save()
    return Response(serialize(h))


@api_view(['POST'])
def complete(request,pk):
    try:h = Habit.objects.get(pk=pk,user=request.user)
    except Habit.DoesNotExist:return Response(status=404)
    from datetime import date
    try:day = date.fromisoformat(request.data.get('date',timezone.localdate().isoformat()))
    except (ValueError,TypeError):return Response({'error':'Некорректная дата.'},status=400)
    if day > timezone.localdate() or not scheduled(h,day):
        return Response({'error':'Этот день недоступен для отметки.'},status=400)
    status = request.data.get('status','done')
    note = request.data.get('note','')
    if status not in ['done','missed','clear'] or not isinstance(note,str) or len(note)>500:
        return Response({'error':'Некорректная отметка или заметка длиннее 500 символов.'},status=400)
    if status == 'clear':h.completions.filter(date=day).delete()
    else:Completion.objects.update_or_create(habit=h,date=day,defaults={'status':status,'note':note})
    return Response(serialize(h))


def goal_data(g):
    return {'id':g.id,'title':g.title,'unit':g.unit,'target':g.target,'current':g.current,'deadline':g.deadline.isoformat() if g.deadline else None}


@api_view(['GET','POST','PATCH','DELETE'])
def goals(request,pk=None):
    import math
    from datetime import date
    if pk is None and request.method == 'GET':
        return Response([goal_data(g) for g in Goal.objects.filter(user=request.user).order_by('id')])
    if pk is None and request.method != 'POST':return Response(status=405)
    if pk is not None:
        try:g = Goal.objects.get(pk=pk,user=request.user)
        except Goal.DoesNotExist:return Response(status=404)
        if request.method == 'DELETE':g.delete();return Response(status=204)
        if request.method != 'PATCH':return Response(status=405)
    else:g = Goal(user=request.user)
    errors = {}
    for key,limit in [('title',120),('unit',20)]:
        value = request.data.get(key,getattr(g,key))
        if not isinstance(value,str) or not 1 <= len(value.strip()) <= limit:errors[key] = ['Заполните поле корректно.']
        else:setattr(g,key,value.strip())
    for key in ['target','current']:
        value = request.data.get(key,getattr(g,key))
        try:
            if isinstance(value,bool):raise ValueError()
            value = float(value)
            if not math.isfinite(value) or value < 0 or (key == 'target' and value == 0):raise ValueError()
            setattr(g,key,value)
        except (TypeError,ValueError):errors[key] = ['Введите положительное число.' if key == 'target' else 'Введите число не меньше нуля.']
    if 'deadline' in request.data:
        try:g.deadline = date.fromisoformat(request.data['deadline']) if request.data['deadline'] else None
        except (TypeError,ValueError):errors['deadline'] = ['Некорректная дата.']
    if errors:return Response({'errors':errors},status=400)
    g.save()
    return Response(goal_data(g),status=201 if pk is None else 200)


def profile_data(user):
    return {'username':user.username,'first_name':user.first_name,'email':user.email,'joined':user.date_joined.date().isoformat()}


@api_view(['GET','PATCH'])
def profile(request):
    import re
    from django.core.validators import validate_email
    from django.db import transaction
    if request.method=='GET':return Response(profile_data(request.user))
    data=request.data
    errors={}
    name=data.get('username',request.user.username)
    first_name=data.get('first_name',request.user.first_name)
    email=data.get('email',request.user.email)
    if not isinstance(name,str) or not re.fullmatch(r'[A-Za-z0-9_]{3,30}',name.strip()):
        errors['username']=['От 3 до 30 символов: латинские буквы, цифры и подчёркивание.']
    elif User.objects.filter(username__iexact=name.strip()).exclude(pk=request.user.pk).exists():
        errors['username']=['Это имя пользователя уже занято.']
    if not isinstance(first_name,str) or len(first_name.strip())>80:
        errors['first_name']=['Имя должно быть не длиннее 80 символов.']
    if not isinstance(email,str) or len(email.strip())>254:
        errors['email']=['Введите корректный адрес почты.']
    elif email.strip():
        try:validate_email(email.strip())
        except ValidationError:errors['email']=['Введите корректный адрес почты.']
    if errors:return Response({'errors':errors},status=400)
    try:
        with transaction.atomic():
            user=User.objects.select_for_update().get(pk=request.user.pk)
            user.username=name.strip()
            user.first_name=first_name.strip()
            user.email=email.strip()
            user.save(update_fields=['username','first_name','email'])
    except IntegrityError:return Response({'errors':{'username':['Это имя пользователя уже занято.']}},status=400)
    return Response(profile_data(user))


@api_view(['POST'])
def change_password(request):
    from django.db import transaction
    with transaction.atomic():
        user=User.objects.select_for_update().get(pk=request.user.pk)
        current=request.data.get('current_password','')
        password=request.data.get('password','')
        errors={}
        if not isinstance(current,str) or not user.check_password(current):errors['current_password']=['Текущий пароль указан неверно.']
        rules=password_errors(password,user)
        if rules:errors['password']=rules
        elif isinstance(current,str) and current==password:errors['password']=['Новый пароль должен отличаться от текущего.']
        if request.data.get('password_confirm')!=password:errors['password_confirm']=['Пароли не совпадают.']
        if errors:return Response({'errors':errors},status=400)
        user.set_password(password)
        user.save(update_fields=['password'])
        Token.objects.filter(user=user).delete()
        token=Token.objects.create(user=user)
    return Response({**profile_data(user),'token':token.key})
