from django.db import migrations, models
PALETTE = ['#5274cc', '#d18a42', '#399b7a', '#c96859', '#9671ba', '#428db5', '#c45f7f', '#778b51', '#a77855', '#5b9b9c', '#8a7bb5', '#aa8c37', '#637f98', '#bc7665', '#6c975d', '#aa6da3']
def assign_colors(apps,schema_editor):
    Habit=apps.get_model('habits','Habit')
    counts={}
    for h in Habit.objects.order_by('user_id','id'):
        index=counts.get(h.user_id,0)
        h.color=PALETTE[index%len(PALETTE)]
        h.save(update_fields=['color'])
        counts[h.user_id]=index+1
class Migration(migrations.Migration):
    dependencies=[('habits','0002_completion_note_completion_status_habit_start_date_and_more')]
    operations=[migrations.AddField(model_name='habit',name='color',field=models.CharField(default='#5274cc',max_length=7)),migrations.RunPython(assign_colors,migrations.RunPython.noop)]
