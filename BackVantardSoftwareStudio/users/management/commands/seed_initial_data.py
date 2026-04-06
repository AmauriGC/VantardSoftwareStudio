"""
Comando para sembrar los datos iniciales requeridos por la aplicación.

Crea los roles (Admin, User) y planes base (Free, Basic, Pro) si no existen.
Es idempotente: puede ejecutarse múltiples veces sin duplicar registros.

Uso:
    python manage.py seed_initial_data
    python manage.py seed_initial_data --verbosity 0   # silencioso
"""

from decimal import Decimal

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Siembra roles y planes iniciales necesarios para el funcionamiento del sistema."

    ROLES = ["Admin", "User"]

    PLANS = [
        {"name": "Free",  "price": Decimal("0.00"),  "max_disk_mb": 50},
        {"name": "Basic", "price": Decimal("9.99"),  "max_disk_mb": 500},
        {"name": "Pro",   "price": Decimal("29.99"), "max_disk_mb": 2048},
    ]

    def handle(self, *args, **options):
        self._seed_roles(options["verbosity"])
        self._seed_plans(options["verbosity"])
        if options["verbosity"] >= 1:
            self.stdout.write(self.style.SUCCESS("Datos iniciales sembrados correctamente."))

    def _seed_roles(self, verbosity):
        from roles.models import Role

        for name in self.ROLES:
            _, created = Role.objects.get_or_create(role_name=name)
            if verbosity >= 1:
                status = "creado" if created else "ya existía"
                self.stdout.write(f"  Rol '{name}': {status}")

    def _seed_plans(self, verbosity):
        from plans.models import Plan

        for p in self.PLANS:
            _, created = Plan.objects.get_or_create(
                name=p["name"],
                defaults={
                    "price": p["price"],
                    "max_disk_mb": p["max_disk_mb"],
                    "status": Plan.Status.ACTIVE,
                },
            )
            if verbosity >= 1:
                status = "creado" if created else "ya existía"
                self.stdout.write(f"  Plan '{p['name']}': {status}")
