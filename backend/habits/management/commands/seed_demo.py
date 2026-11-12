from datetime import date, timedelta
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from habits.models import Goal, Habit, Completion
from habits.colors import PALETTE


class Command(BaseCommand):
    help = 'Create a separate demo account. Existing usernames are never modified.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='demo')
        parser.add_argument('--password', required=True)
        parser.add_argument('--month', default=timezone.localdate().strftime('%Y-%m'))

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            start = date.fromisoformat(options['month'] + '-01')
        except ValueError:
            raise CommandError('Month must be YYYY-MM.')
        if User.objects.filter(username=options['username']).exists():
            raise CommandError('Username already exists. No data changed; choose another username.')
        user = User.objects.create_user(username=options['username'], password=options['password'])
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = min(next_month - timedelta(days=1), timezone.localdate())
        deadline = next_month - timedelta(days=1)
        goals = [
            Goal.objects.create(user=user, title='Прочитать 4 книги', unit='книг', target=4, current=2, deadline=deadline),
            Goal.objects.create(user=user, title='Пробежать 40 километров', unit='км', target=40, current=17.5, deadline=deadline),
            Goal.objects.create(user=user, title='Заниматься английским 10 часов', unit='часов', target=10, current=10, deadline=deadline),
        ]
        fixtures = [
            ('Читать 20 минут', 'learn', list(range(7)), goals[0]),
            ('Спорт', 'sport', [0,1,2,4,5,6], goals[1]),
            ('Пить 2 литра воды', 'health', list(range(7)), None),
            ('Английский 30 минут', 'learn', [0,1,2,3,4], goals[2]),
            ('Прогулка без телефона', 'rest', list(range(7)), None),
            ('Утренняя зарядка', 'sport', list(range(7)), None),
            ('Ложиться до 23:00', 'rest', list(range(7)), None),
            ('Планировать следующий день', 'focus', [0,1,2,3,4], None),
            ('Пробежка 3 километра', 'sport', [1,3,5], goals[1]),
            ('Разобрать рабочее место', 'focus', [0,4], None),
            ('Приготовить еду на неделю', 'health', [6], None),
            ('Практиковаться на гитаре', 'general', [0,2,5], None),
        ]
        notes = ['Прочитал ещё одну главу.', 'Хорошая тренировка, без перегрузки.', 'Взял бутылку воды на работу.', 'Повторил слова и прошёл урок.', 'Погулял в парке после обеда.', 'Десять минут разминки.', 'Удалось лечь вовремя.', 'Выбрал три задачи на завтра.', 'Спокойный темп, 3 километра.', 'Убрал лишнее со стола.', 'Приготовил обеды на несколько дней.', 'Повторил аккорды и выучил новый ритм.']
        for index, (title, category, weekdays, goal) in enumerate(fixtures):
            habit = Habit.objects.create(user=user,title=title,color=PALETTE[index % len(PALETTE)],icon=category,weekdays=weekdays,start_date=start,goal=goal)
            day = start
            while day <= end:
                if day.weekday() in weekdays:
                    pattern = (day.day * 7 + index * 3) % 17
                    if day == timezone.localdate() and index > 4:
                        pass  # The demo has an unfinished plan today.
                    elif index == 0 or pattern > 3:
                        Completion.objects.create(habit=habit,date=day,status='done',note=notes[index] if day.day%3==0 else '')
                    elif pattern > 1:
                        Completion.objects.create(habit=habit,date=day,status='missed',note='Не хватило времени после работы.' if day.day%2 else '')
                day += timedelta(days=1)
        self.stdout.write(self.style.SUCCESS(f'Demo account {user.username}: {len(fixtures)} habits, 3 goals. History through {end.isoformat()}.'))
