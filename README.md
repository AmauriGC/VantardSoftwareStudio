# VantardSoftwareStudio
Despliega rápido. Escala seguro. Controla todo.

Este repositorio sigue el estándar definido en la guía:
`8A_VantardSoftwareStudio_GuiadeDesarrolloSeguro_v2.docx.txt` (Versión 2.0 — 2026).

Si vas a desarrollar aquí, lee la guía completa antes de tocar código. El objetivo de este README es aterrizar el “cómo correr” y los puntos obligatorios para mantener consistencia (nombres, estructura, contratos, seguridad, flujo Git).

## Tabla de contenidos

- [Stack objetivo](#stack-objetivo)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Reglas de trabajo (Git + commits)](#reglas-de-trabajo-git--commits)
- [Variables de entorno y secretos](#variables-de-entorno-y-secretos)
- [Levantar el proyecto en local](#levantar-el-proyecto-en-local)
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

- Front: organizar por dominio/feature y capas (router, services, utils, components). No construir URLs “a mano” en componentes.
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
- Crear archivos por ambiente si aplica (no commitear secretos): `.env.development`, `.env.production`.
- Variables típicas:
	- `VITE_API_URL=http://localhost:8000`
	- `VITE_APP_NAME=VantardSoftwareStudio`

Back (Django):

- Valores sensibles deben venir desde variables de entorno.
- En este repo hay una plantilla: `BackVantardSoftwareStudio/.env.example` (copiar a `BackVantardSoftwareStudio/.env`).
- Variables típicas (según guía):
	- `SECRET_KEY`
	- `DEBUG` (siempre `False` en producción)
	- `ALLOWED_HOSTS`
	- `DATABASE_URL` (MySQL)
	- `JWT_SECRET`

## Levantar el proyecto en local

### Arranque rápido (2 terminales)

Requisitos:

- Node.js (LTS recomendado)
- Python 3.11+

1) Front (Terminal A)

```bash
cd FrontVantardSoftwareStudio

# Variables de entorno (local)
cp .env.example .env

npm install
npm run dev
```

2) Back (Terminal B)

```bash
cd BackVantardSoftwareStudio

# Variables de entorno (local)
cp .env.example .env

python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip

pip install -r requirements.txt

python3 manage.py migrate
python3 manage.py runserver 0.0.0.0:8000
```

URLs típicas:

- Front: http://localhost:5173/
- Back: http://localhost:8000/

### Front-end (React + Vite)

En `FrontVantardSoftwareStudio/`:

```bash
npm install
npm run dev
```

Scripts disponibles:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

### Back-end (Django)

En `BackVantardSoftwareStudio/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip

# Dependencias del back-end
pip install -r requirements.txt

python3 manage.py migrate
python3 manage.py runserver 0.0.0.0:8000
```

Notas:

- Base de datos: el estándar es MySQL. En local puede usarse SQLite solo como facilidad de arranque, pero el contrato y el ORM deben mantenerse compatibles.

## Contratos y convenciones del API

### Wrapper de respuesta estándar (obligatorio)

Todas las respuestas del API deben ser predecibles para el front.

Formato:

```json
{
	"message": "Operación exitosa",
	"data": { } ,
	"error": false,
	"status": 200
}
```

En error, `error=true` y `data` puede ser `null` o un objeto con detalles.

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
- El front debe normalizar errores vía interceptor HTTP (p. ej. en 401 cerrar sesión y redirigir a login).

## Seguridad (obligatorio)

Principios:

- “Deny by default”: todo endpoint protegido salvo lista blanca explícita.
- Autenticación ≠ autorización: roles/permisos se validan en el back.

JWT:

- API stateless: `Authorization: Bearer <token>`.
- El secreto del JWT nunca vive en el código (solo env vars).
- Definir expiración por ambiente.

Contraseñas:

- Mínimo 8 caracteres y complejidad (según guía).
- Hash seguro (Django PBKDF2 por defecto; se admite Argon2/bcrypt).
- Limitar intentos de login (protección fuerza bruta).

Datos y consultas:

- Validar/sanitizar entradas en serializers.
- Usar ORM (consultas parametrizadas). Si hay SQL nativo: parámetros nombrados, nunca concatenación.
- Evitar exposición de datos: paginación y campos mínimos.

## Testing mínimo viable

Back-end:

- Probar, como mínimo, flujos críticos del módulo (y autenticación cuando exista).
- Ejecutar: `python3 manage.py test`

Front-end:

- Como mínimo, `npm run build` debe pasar sin errores.
- Ejecutar también `npm run lint` antes de PR.

## Checklist pre-merge

- No hay secretos/credenciales/tokens en el PR.
- Rutas y nombres siguen convención (guía).
- API responde con wrapper estándar.
- Manejo de errores consistente (back handler + front interceptor).
- Back: pruebas mínimas relevantes pasando.
- Front: `npm run build` y `npm run lint` pasan.

