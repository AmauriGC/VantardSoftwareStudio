# Front — Vantard Software Studio (SPA)

Front-end SPA basado en el estándar interno **React + Vite + Tailwind + React Router + Axios**.
Este README existe para que el equipo mantenga una forma consistente de construir módulos, validaciones y UI.

## Stack

- React (Vite)
- TailwindCSS
- React Router
- Axios (instancia única en `kernel/`)

## Requisitos

- Node.js LTS
- npm

## Instalación y ejecución

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

## Variables de entorno

Vite expone variables con prefijo `VITE_`.

Ejemplo `.env.development` (NO se sube al repo):

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=VSS
```

La lectura centralizada está en `src/config/env.js`.

## Estructura (front)

Esta base sigue la idea de “organización por dominio/feature” y capas separadas:

- `src/router/`
	- Enrutamiento y guards por rol.
- `src/pages/auth/`
	- Módulo de autenticación (vistas + store + service + constants + components).
- `src/pages/role/`
	- Vistas por rol (admin/user) (placeholder por ahora).
- `src/components/`
	- Componentes base reutilizables para toda la app.
- `src/config/validator/`
	- Validaciones estandarizadas (patterns + rules + grupos + hook).
- `src/kernel/`
	- Infra transversal (ej. `axiosClient`).

Regla: si el componente se usará en muchos módulos → `src/components/`.
Si es específico de un módulo → `src/pages/<modulo>/components/`.

## Router y roles

Rutas:

- `/` → Login
- `/auth/recuperar` → Recuperación de contraseña
- `/auth/registro` → Registro
- `/admin` → solo rol `admin`
- `/user` → solo rol `user`

Guard por rol:

- `src/router/RequireRole.jsx` consulta el rol desde el store de auth.
- Si no hay rol o no coincide, redirige a `/`.

## Módulo auth (front-only por ahora)

Por el momento **no hay consumo de API ni JWT**. El objetivo es avanzar UI/UX y arquitectura.

- Store (persistencia): `src/pages/auth/store/authStore.js`
	- Guarda un objeto en `localStorage` bajo la key `vss.auth`.
	- Expone `getRole()`, `setAuth()`, `clearAuth()`.
- Service: `src/pages/auth/service/AuthService.js`
	- Encapsula la “lógica de login” del front.
	- Nota: cuando se integre API real, aquí se llama a Axios y se normaliza respuesta.
- Constantes: `src/pages/auth/constants/authConstants.js`
	- Emails del equipo (admin/user) y roles.

### Login rápido (botones)

El login tiene botones para autollenar el correo de ADMIN/USER (para pruebas rápidas del flujo).

## Estándar de validación (`validator`)

La validación del front es solo **feedback de UX**; el back-end será la fuente de verdad.

### Objetivos del estándar

- Separar **patrones/sanitización** de **mensajes/reglas**.
- No mezclar mensajes: cada regla produce **un mensaje**.
- Reutilizar por **grupos** (ej. `authEmail`, `fullName`) para evitar repetir validaciones.
- Aplicar validaciones de **lo general a lo particular**.

### Orden de ejecución (importante)

1) **Transforms / Sanitización** (ej. `trim`, `keepOnlyLettersAndSpaces`)
2) **Validators** (rules con mensaje) en orden
3) Se muestra **solo el primer error** del campo

Archivos:

- `src/config/validator/patterns.js`
	- Regex/constantes y funciones puras de sanitizado.
	- Ejemplo: “solo letras” (incluye acentos y ñ) eliminando todo lo demás.
- `src/config/validator/rules.js`
	- Reglas con mensaje + composición por grupos (`VALIDATION_GROUPS`).
	- Incluye helpers `createGroup`/`extendGroup`.
- `src/config/validator/useValidatedField.js`
	- Hook de validación reactiva por campo.
	- Regla UX: no mostrar error por “required” solo por enfocar y salir.

### Fases de validación: `change` vs `submit`

Algunas reglas cambian su agresividad según la fase:

- `change`: mientras el usuario escribe, se evita mostrar “correo inválido” demasiado pronto.
- `submit`: al enviar, se valida de forma estricta.

### Dominio de correo permitido

El correo se restringe a dominios permitidos (UX):

- `@utez.edu.mx`
- `@gmail.com`

Esto se configura en `EMAIL_ALLOWED_DOMAINS` y se aplica en el grupo `authEmail`.

### Contraseñas (no dar pistas)

Por seguridad/UX, **no se valida longitud mínima/máxima de contraseña en el front** para no dar feedback explotable.
Solo se valida `required` y, en registro, que la confirmación coincida.

## Componentes base

- `BaseInput`
	- Estados: hover, focus-visible, disabled, error (borde y mensaje).
- `BaseButton`
	- Variantes: `primary`, `secondary`, `ghost`.
	- Estados: hover, focus-visible, active, disabled.
- `BaseCard`
	- Contenedor base.

## Flujo de trabajo recomendado (según la guía)

Para agregar una feature/módulo nuevo:

1) Definir contrato API (endpoints/serializers) con el equipo.
2) Implementar servicio del dominio en front (un archivo por dominio; no construir URLs en vistas).
3) Construir vista(s) del dominio orquestando componentes base.
4) Conectar rutas en `src/router/` con requiresAuth/roles.
5) Validar checklist mínimo:
	 - `npm run build` debe pasar.

## Notas de seguridad

- Nunca subir secretos/credenciales/`.env` al repo.
- No hardcodear URLs del API; usar variables de entorno.
- La validación del front **no reemplaza** la validación del servidor.
