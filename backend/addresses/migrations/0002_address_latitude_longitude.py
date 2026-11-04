from django.core import validators
from django.db import migrations, models


def add_missing_columns(apps, schema_editor):
    """Adds latitude/longitude only if the table does not have them yet.

    Databases that already got these columns from an earlier version of the project are left
    untouched (no duplicate-column error, no data change); fresh databases get them created.
    """
    Address = apps.get_model("addresses", "Address")
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        existing = {c.name for c in connection.introspection.get_table_description(cursor, Address._meta.db_table)}
    for name in ("latitude", "longitude"):
        if name not in existing:
            schema_editor.add_field(Address, Address._meta.get_field(name))


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ("addresses", "0001_initial"),
    ]

    operations = [
        # 1) tell Django's migration state about the fields (no SQL)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="address",
                    name="latitude",
                    field=models.DecimalField(
                        blank=True, decimal_places=6, max_digits=9, null=True,
                        validators=[validators.MinValueValidator(-90), validators.MaxValueValidator(90)],
                    ),
                ),
                migrations.AddField(
                    model_name="address",
                    name="longitude",
                    field=models.DecimalField(
                        blank=True, decimal_places=6, max_digits=9, null=True,
                        validators=[validators.MinValueValidator(-180), validators.MaxValueValidator(180)],
                    ),
                ),
            ],
            database_operations=[],
        ),
        # 2) create the columns only where they are missing
        migrations.RunPython(add_missing_columns, migrations.RunPython.noop),
    ]
