

from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('addresses', '0002_address_latitude_longitude'),
    ]

    operations = [
        migrations.AddField(
            model_name='address',
            name='created_at',
            field=models.DateTimeField(
                auto_now_add=True,
                default=timezone.now,
            ),
            preserve_default=False,
        ),
    ]
