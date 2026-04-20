"""
Comando para sembrar los datos iniciales requeridos por la aplicación.

Crea los roles (Admin, User), planes base (Free, Basic, Pro) y el usuario
administrador inicial si no existen.
Es idempotente: puede ejecutarse múltiples veces sin duplicar registros.

Variables de entorno requeridas para el admin:
    ADMIN_EMAIL     correo del administrador inicial
    ADMIN_PASSWORD  contraseña del administrador inicial

Uso:
    python manage.py seed
    python manage.py seed --verbosity 0   # silencioso
"""

from decimal import Decimal

from decouple import config
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Siembra roles, planes y usuario administrador iniciales."

    ROLES = ["Admin", "User"]

    PLANS = [
        {"name": "Free",  "price": Decimal("0.00"),  "max_disk_mb": 50},
        {"name": "Basic", "price": Decimal("9.99"),  "max_disk_mb": 500},
        {"name": "Pro",   "price": Decimal("29.99"), "max_disk_mb": 2048},
    ]

    def handle(self, *args, **options):
        self._seed_roles(options["verbosity"])
        self._seed_plans(options["verbosity"])
        self._seed_admin(options["verbosity"])
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
                    "status": Plan.StatusChoices.ACTIVE,
                },
            )
            if verbosity >= 1:
                status = "creado" if created else "ya existía"
                self.stdout.write(f"  Plan '{p['name']}': {status}")

    def _seed_admin(self, verbosity):
        from users.models import User
        from roles.models import Role

        email    = config("ADMIN_EMAIL", default="")
        password = config("ADMIN_PASSWORD", default="")

        if not email or not password:
            if verbosity >= 1:
                self.stdout.write(
                    self.style.WARNING(
                        "  Admin omitido: define ADMIN_EMAIL y ADMIN_PASSWORD en el entorno."
                    )
                )
            return

        if User.objects.filter(email=email).exists():
            if verbosity >= 1:
                self.stdout.write(f"  Admin '{email}': ya existía")
            return

        admin_role = Role.objects.get(role_name="Admin")
        User.objects.create_superuser(
            email=email,
            password=password,
            first_name="Admin",
            last_name="VSS",
            role=admin_role,
        )
        if verbosity >= 1:
            self.stdout.write(self.style.SUCCESS(f"  Admin '{email}': creado"))
