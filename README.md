# VantardSoftwareStudio
Despliega rápido. Escala seguro. Controla todo.

Este repositorio sigue el estándar definido en la guía:
`8A_VantardSoftwareStudio_GuiadeDesarrolloSeguro_v2.docx.txt` (Versión 2.0 — 2026).

Si vas a desarrollar aquí, lee la guía completa antes de tocar código. El objetivo de este README es aterrizar el "cómo correr" y los puntos obligatorios para mantener consistencia (nombres, estructura, contratos, seguridad, flujo Git).

## Tabla de contenidos

- [Stack objetivo](#stack-objetivo)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Reglas de trabajo (Git + commits)](#reglas-de-trabajo-git--commits)
- [Variables de entorno y secretos](#variables-de-entorno-y-secretos)
- [Levantar el proyecto en local](#levantar-el-proyecto-en-local)
- [Base de datos](#base-de-datos)
- [Contratos y convenciones del API](#contratos-y-convenciones-del-api)
- [Seguridad (obligatorio)](#seguridad-obligatorio)
- [Testing mínimo viable](#testing-mínimo-viable)
- [Checklist pre-merge](#checklist-pre-merge)

## Stack objetivo

Según la guía (referencia obligatoria):

- Front-end: React (SPA) + Router con guards + Axios con interceptor de errores + TailwindCSS.
- Back-end: Django + Django REST Framework (API stateless) + JWT (`djangorestframework-simplejwt`).
- Base de datos: MySQL (local puede variar; producción debe seguir el estándar del proyecto).

## Estructura del repositorio

Este repo es un monorepo. En la guía, los nombres de carpetas aparecen como `client/` y `server/`. En este proyecto equivalen a:

- `FrontVantardSoftwareStudio/` → SPA (front-end)
- `BackVantardSoftwareStudio/` → API (back-end)

Estructura actual:

```
.
├── FrontVantardSoftwareStudio/
└── BackVantardSoftwareStudio/
```

Reglas de estructura (obligatorio):

- Front: organizar por dominio/feature y capas (router, services, utils, components). No construir URLs "a mano" en componentes.
- Back: organizar por dominio/feature y capas (models, serializers, views/viewsets, permissions, urls). Las vistas no devuelven modelos directamente.

## Convenciones de nombres (uniformidad)

Resumen práctico (alineado a la guía):

- Python/Django
	- Módulos/variables/funciones: `snake_case`
	- Clases: `PascalCase`
	- Apps por dominio: nombres simples y sin acentos (ej. `usuarios`, `auth_app`)
- React
	- Componentes: `PascalCase` (archivo y componente)
	- Hooks: `useSomething`
	- Servicios: `XxxService` (un archivo por dominio)
- API
	- Rutas: minúsculas y guión medio (`kebab-case`), con trailing slash
	- No exponer modelos directamente; contratos vía serializers/schemas

## Reglas de trabajo (Git + commits)

GitFlow simplificado (obligatorio):

- `main`: rama protegida (solo merges revisados).
- `develop`: integración de cambios ya probados.
- `feature/<nombre>`: nuevas funcionalidades.
- `fix/<nombre>`: correcciones.
- `hotfix/<nombre>`: urgencias en producción (si aplica).

Flujo recomendado:

1. Crear rama desde `develop`: `git checkout -b feature/nombre-feature`.
2. Commits pequeños/atómicos.
3. Pull Request hacia `develop` con descripción.
4. Revisión aprobada antes del merge.
5. Cuando `develop` esté estable: merge a `main`.

Conventional Commits (obligatorio):

- Formato: `tipo(alcance): descripción breve`
- Ejemplos:
	- `feat(auth): agrega login con jwt`
	- `fix(api): normaliza wrapper de error`

Reglas mínimas:

- Prohibido subir credenciales/secretos/tokens.
- Prohibido commitear archivos `.env`.
- No commitear directo a `main`/`develop` sin PR.

## Variables de entorno y secretos

Principio: nada sensible va hardcodeado.

Front (Vite):

- Usar variables `VITE_*`.
- En este repo hay una plantilla: `FrontVantardSoftwareStudio/.env.example` (copiar a `FrontVantardSoftwareStudio/.env`).
- Variables típicas:
	- `VITE_API_URL=http://localhost:8000`
	- `VITE_APP_NAME=VantardSoftwareStudio`

Back (Django):

- Valores sensibles deben venir desde variables de entorno.
- En este repo hay una plantilla: `BackVantardSoftwareStudio/.env.example` (copiar a `BackVantardSoftwareStudio/.env`).
- Variables requeridas:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SECRET_KEY` | Clave secreta de Django | `CHANGE_ME` |
| `DEBUG` | Modo debug (`False` en producción) | `True` |
| `ALLOWED_HOSTS` | Hosts permitidos | `127.0.0.1,localhost` |
| `DATABASE_URL` | Conexión a MySQL | `mysql://user:pass@127.0.0.1:3306/vantard_db` |
| `JWT_SECRET` | Clave para firmar tokens JWT | `CHANGE_ME` |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS permitidos | `http://localhost:5173` |

## Levantar el proyecto en local

### Requisitos previos

- Node.js (LTS recomendado)
- Python 3.11+
- MySQL 8.0+ corriendo localmente (o Docker)

### Arranque rápido (2 terminales)

**Terminal A — Front-end**

```bash
cd FrontVantardSoftwareStudio
cp .env.example .env        # ajusta VITE_API_URL si es necesario
npm install
npm run dev
```

**Terminal B — Back-end**

```bash
cd BackVantardSoftwareStudio
cp .env.example .env        # ajusta DATABASE_URL, SECRET_KEY, JWT_SECRET

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate
python manage.py seed       # ← crea roles y planes iniciales (ver sección BD)
python manage.py runserver 0.0.0.0:8000
```

URLs locales:

- Front: http://localhost:5173
- Back: http://localhost:8000

### Comandos de gestión disponibles

| Comando | Descripción |
|---|---|
| `python manage.py migrate` | Aplica las migraciones de esquema |
| `python manage.py seed` | Siembra datos iniciales: roles (Admin, User) y planes (Free, Basic, Pro) |
| `python manage.py runserver` | Inicia el servidor de desarrollo |
| `python manage.py createsuperuser` | Crea usuario administrador de Django admin |
| `python manage.py test` | Ejecuta los tests |

> **Importante:** `python manage.py seed` es idempotente — puede ejecutarse múltiples veces sin duplicar datos. Úsalo en cada entorno nuevo (local, staging, producción).

### Scripts del front-end

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compilación para producción |
| `npm run lint` | Análisis estático del código |
| `npm run preview` | Vista previa del build de producción |

---

## Base de datos

Motor: **MySQL 8.0+**. Nombre de base de datos local recomendado: `vantard_db`.

Las migraciones de **esquema** se generan con Django (`makemigrations` / `migrate`). Los **datos iniciales** se cargan con `python manage.py seed`.

> Las migraciones están excluidas del repositorio (`.gitignore`). Cada desarrollador las genera al clonar con `python manage.py migrate`.

### Diagrama de tablas

```
roles ──────────────────────────────────────────────┐
  id PK                                              │
  role_name (unique)                                 │
  created_at                                         │
                                                     ▼
users ──────────────────────────────────────────────────────────────┐
  id PK                                                              │
  first_name                                                         │
  last_name                                                          │
  email (unique)                                                     │
  password_hash                                                      │
  role_id FK → roles.id                                              │
  status [active | blocked]                                          │
  is_staff | is_active                                               │
  created_at | updated_at | deleted_at                               │
                                                                     │
plans ─────────────────────────────────────────────────────┐        │
  id PK                                                     │        │
  name (unique)                                             │        │
  price                                                     │        │
  max_disk_mb                                               │        │
  status [active | inactive]                                │        │
  created_at | updated_at | deleted_at                      │        │
                                                            ▼        ▼
user_plans ────────────────────────────────────────────────────────────────┐
  id PK                                                                     │
  user_id FK → users.id                                                     │
  plan_id FK → plans.id                                                     │
  purchase_date | expiration_date                                           │
  months_purchased                                                          │
  total_price_paid                                                          │
  status [active | expired]                                                 │
  created_at | updated_at | deleted_at                                      │
                                                                            │
plan_change_requests ──────────────────────────────────────────────────────┘
  id PK
  user_id FK → users.id
  current_plan_id FK → user_plans.id
  requested_plan_id FK → plans.id
  reason
  status [pending | approved | rejected | completed | cancelled]
  reviewed_by_id FK → users.id (nullable)
  reviewed_at | completed_at (nullable)
  created_at | updated_at | deleted_at

deployments ───────────────────────────────────────────────┐
  id PK                                                     │
  user_id FK → users.id                                     │
  domain                                                    │
  site_url                                                  │
  disk_used_mb                                              │
  traffic_visit_count                                       │
  status [active | blocked | inactive]                      │
  created_at | updated_at | deleted_at                      │
                                                            ▼
deployment_versions
  id PK
  deployment_id FK → deployments.id
  version_number (unique por deployment)
  zip_filename | zip_path
  disk_used_mb
  traffic_log_path
  status [active | replaced | failed]
  created_at | updated_at | deleted_at

system_logs
  id PK
  user_id (int, sin FK — preserva logs aunque el usuario se elimine)
  ip_address
  request_path
  action
  http_method [GET | POST | PUT | PATCH | DELETE | OPTIONS | HEAD]
  status_code
  user_agent
  created_at
```

### Detalle de tablas

#### `roles`
Catálogo de roles del sistema. Datos sembrados por `python manage.py seed`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | — |
| `role_name` | varchar(50) unique | `Admin` o `User` |
| `created_at` | datetime | — |

#### `users`
Usuarios del sistema. Usa soft delete (`deleted_at`).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | — |
| `first_name` | varchar(100) | — |
| `last_name` | varchar(100) | — |
| `email` | varchar(150) unique | Usado como USERNAME_FIELD |
| `password_hash` | varchar(255) | Hash PBKDF2 de Django |
| `role_id` | FK → roles | Asignado automáticamente en registro (rol `User`) |
| `status` | enum | `active` / `blocked` |
| `is_staff` / `is_active` | bool | Control de acceso Django admin |
| `created_at` / `updated_at` / `deleted_at` | datetime | Soft delete |

#### `plans`
Planes de servicio disponibles. Datos sembrados por `python manage.py seed`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | — |
| `name` | varchar(50) unique | `Free`, `Basic`, `Pro` |
| `price` | decimal(10,2) | `0.00` para Free |
| `max_disk_mb` | int | Límite de almacenamiento |
| `status` | enum | `active` / `inactive` |

Valores sembrados por defecto:

| Plan | Precio | Disco |
|---|---|---|
| Free | $0.00/mes | 50 MB |
| Basic | $9.99/mes | 500 MB |
| Pro | $29.99/mes | 2048 MB |

#### `user_plans`
Relación usuario-plan. Un usuario tiene un plan activo a la vez.

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | FK → users | — |
| `plan_id` | FK → plans | — |
| `purchase_date` | datetime | Fecha de compra |
| `expiration_date` | datetime | Vencimiento |
| `months_purchased` | int | Meses contratados |
| `total_price_paid` | decimal(10,2) | `precio × meses` |
| `status` | enum | `active` / `expired` |

#### `plan_change_requests`
Solicitudes de cambio de plan iniciadas por usuarios y revisadas por admins.

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | FK → users | Usuario solicitante |
| `current_plan_id` | FK → user_plans | Plan activo actual |
| `requested_plan_id` | FK → plans | Plan deseado |
| `reason` | text | Motivo del cambio |
| `status` | enum | `pending` → `approved/rejected` → `completed` |
| `reviewed_by_id` | FK → users (nullable) | Admin revisor |
| `reviewed_at` / `completed_at` | datetime nullable | Fechas de gestión |

#### `deployments`
Despliegues de sitios estáticos por usuario.

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | FK → users | Propietario |
| `domain` | varchar(255) | Subdominio asignado |
| `site_url` | varchar(255) | URL pública |
| `disk_used_mb` | int | Uso actual de disco |
| `traffic_visit_count` | int | Contador de visitas acumuladas |
| `status` | enum | `active` / `blocked` / `inactive` |

#### `deployment_versions`
Versiones de cada despliegue. `version_number` es único por `deployment`.

| Campo | Tipo | Descripción |
|---|---|---|
| `deployment_id` | FK → deployments | — |
| `version_number` | int | Autoincremental por deployment |
| `zip_filename` | varchar(255) | Nombre original del .zip |
| `zip_path` | varchar(500) | Ruta de almacenamiento |
| `disk_used_mb` | int | Peso de esta versión |
| `status` | enum | `active` / `replaced` / `failed` |

#### `system_logs`
Log de auditoría de peticiones HTTP. `user_id` es un entero sin FK para preservar registros aunque el usuario sea eliminado.

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | int nullable | ID del usuario (sin FK) |
| `ip_address` | varchar(45) | IPv4 o IPv6 |
| `request_path` | varchar(500) | Ruta de la petición |
| `action` | varchar(100) | Ej: `USER_LOGIN`, `SITE_UPLOAD` |
| `http_method` | enum | GET / POST / PUT / PATCH / DELETE |
| `status_code` | int | Código HTTP de respuesta |
| `user_agent` | varchar(255) | Cliente HTTP |

---

## Contratos y convenciones del API

### Wrapper de respuesta estándar (obligatorio)

Todas las respuestas del API deben ser predecibles para el front.

Éxito:
```json
{
  "message": "Operación exitosa",
  "data": {}
}
```

Error:
```json
{
  "message": "Descripción del error",
  "data": null
}
```

### Reglas de URIs (obligatorio)

- Usar trailing slash: `/api/usuarios/`.
- Minúsculas, sin acentos.
- Usar guión `-` (no `_`).
- Query string para filtros/paginación/búsqueda.

### Serializers y validación (obligatorio)

- La validación real ocurre en el servidor.
- Las vistas no deben recibir ni devolver modelos directamente.
- Separar serializer de entrada (valida) y salida (define campos expuestos).
- Nunca exponer campos sensibles (password, tokens internos, etc.).

### Manejo global de errores (obligatorio)

- Centralizar el manejo de excepciones (handler global).
- No filtrar trazas ni nombres internos de tablas/columnas al cliente.
- El front debe normalizar errores vía interceptor HTTP (en 401 cerrar sesión y redirigir a login).

---

## Seguridad (obligatorio)

Principios:

- "Deny by default": todo endpoint protegido salvo lista blanca explícita.
- Autenticación ≠ autorización: roles/permisos se validan en el back.

JWT:

- API stateless: `Authorization: Bearer <token>`.
- El secreto del JWT nunca vive en el código (solo env vars).
- Access token: 60 minutos. Refresh token: 1 día.
- Refresh tokens rotan en cada uso (`ROTATE_REFRESH_TOKENS=True`) y el anterior se invalida (`BLACKLIST_AFTER_ROTATION=True`).

Contraseñas:

- Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial.
- Hash seguro (Django PBKDF2 por defecto).
- Rate limiting en login: 5 intentos/minuto.
- Rate limiting en password reset: 3 solicitudes/minuto.

Datos y consultas:

- Validar/sanitizar entradas en serializers.
- Usar ORM (consultas parametrizadas). Si hay SQL nativo: parámetros nombrados, nunca concatenación.
- Evitar exposición de datos: paginación y campos mínimos.

---

## Testing mínimo viable

Back-end:

- Probar, como mínimo, flujos críticos del módulo (y autenticación cuando exista).
- Ejecutar: `python manage.py test`

Front-end:

- Como mínimo, `npm run build` debe pasar sin errores.
- Ejecutar también `npm run lint` antes de PR.

---

## Checklist pre-merge

- No hay secretos/credenciales/tokens en el PR.
- Rutas y nombres siguen convención (guía).
- API responde con wrapper estándar.
- Manejo de errores consistente (back handler + front interceptor).
- URLs del front definidas en `constants/endpoints.js`, no hardcodeadas en componentes o servicios.
- Back: pruebas mínimas relevantes pasando.
- Front: `npm run build` y `npm run lint` pasan.
- En entorno nuevo: `python manage.py migrate` y `python manage.py seed` ejecutados.
