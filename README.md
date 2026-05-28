# Aprender Para Emprender — Sistema de Control de Asistencia

Sistema completo de gestión de asistencia para el programa **Aprender Para Emprender**, compuesto por una **API REST**, una **aplicación web** y una **app móvil**. Diseñado para que educadoras registren, consulten y analicen la asistencia de participantes desde cualquier dispositivo.

---

## Tabla de Contenidos

- [Vista General](#vista-general)
- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Monorepo](#estructura-del-monorepo)
- [Inicio Rápido](#inicio-rápido)
- [Variables de Entorno](#variables-de-entorno)
- [API Reference](#api-reference)
- [Features del Sistema](#features-del-sistema)
- [Deploy](#deploy)
- [Guía de Contribución](#guía-de-contribución)

---

## Vista General

```
┌─────────────────────────────────────────────────────────┐
│                   Aprender Para Emprender               │
│                                                         │
│   Web App (React)  ◄──►  API (Express)  ◄──►  Supabase │
│   Mobile (Expo)    ◄──►  (Render.com)   ◄──►  (Postgres)│
└─────────────────────────────────────────────────────────┘
```

El sistema permite:

- **Registro de asistencia diaria** por grupo (Lunes–Viernes)
- **Historial completo** de sesiones pasadas con detalle por participante
- **Dashboard analítico** con tasa de asistencia, top ausentes y desglose por día
- **Exportación a Excel** del período o sesión seleccionada
- **Gestión de participantes** con inscripción por día y datos extra (fase, programa, edad)
- **Autenticación segura** vía Supabase Auth con JWT

---

## Arquitectura

```
aprender-para-emprender/          ← Monorepo raíz (pnpm workspaces + Turborepo)
├── packages/
│   ├── shared/                   ← Tipos y schemas Zod compartidos
│   ├── api/                      ← API Express + TypeScript
│   │   └── dist/ ──► sirve web   ← En producción sirve el frontend como static
│   ├── web/                      ← SPA React + Vite + Tailwind
│   └── mobile/                   ← App Expo (React Native) + Expo Router
└── supabase/                     ← Migraciones y configuración de BD
```

### Flujo de datos

```
Educadora
   │
   ├── Web (React SPA)
   │      └── fetch /api/*  ──► Express API ──► Supabase PostgreSQL
   │
   └── Mobile (Expo)
          └── fetch /api/*  ──► Express API ──► Supabase PostgreSQL
```

En **producción**, la API Express sirve la SPA React como archivos estáticos y actúa como único punto de entrada. No hay servidor de frontend separado.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Monorepo | pnpm workspaces + Turborepo | pnpm 9, Turbo 2 |
| API | Express + TypeScript | Express 4, TS 5.5 |
| Validación | Zod | 3.23 |
| Autenticación | Supabase Auth + JWT | — |
| Base de datos | Supabase (PostgreSQL) | — |
| Seguridad | Helmet CSP + express-rate-limit | — |
| Web frontend | React 18 + Vite + Tailwind CSS | — |
| Estado web | Zustand + TanStack Query v5 | — |
| Mobile | Expo 52 + React Native 0.76 | — |
| Navegación mobile | Expo Router 4 (file-based) | — |
| Estado mobile | Zustand + TanStack Query v5 | — |
| Export | xlsx (SheetJS) | — |
| Deploy | Render.com (free tier) | — |
| Mobile build | EAS Build | — |

---

## Estructura del Monorepo

```
packages/
│
├── shared/                 @ape/shared
│   └── src/
│       ├── types/          Tipos TypeScript compartidos (DatosExtra, etc.)
│       └── schemas/        Schemas Zod para validación en API y UI
│
├── api/                    @ape/api
│   └── src/
│       ├── app.ts          Express app factory (Helmet, CORS, rutas)
│       ├── index.ts        Entry point (conecta Supabase, arranca servidor)
│       ├── config/         supabase.ts — cliente Supabase + config pública
│       ├── middleware/
│       │   ├── auth.ts     Verifica JWT Bearer en cada request protegido
│       │   ├── cors.ts     CORS configurado por ALLOWED_ORIGIN
│       │   └── rateLimit.ts  Límites globales y por ruta
│       └── routes/
│           ├── participantes.ts  CRUD participantes + inscripciones por día
│           ├── asistencia.ts     Sesiones, registros, fechas, eliminar
│           └── exportar.ts       Export XLSX con filtros
│
├── web/                    @ape/web
│   └── src/
│       ├── pages/
│       │   ├── Bienvenida/     Home con selector de día + badge HOY
│       │   ├── Asistencia/     Registro diario con "Todos presentes"
│       │   ├── Historial/      Sesiones pasadas: master-detail + export
│       │   ├── Dashboard/      Stats + top ausentes + export Excel
│       │   ├── Participantes/  CRUD participantes
│       │   └── Login/
│       ├── hooks/              useAsistencia, useParticipantes
│       ├── components/
│       │   ├── layout/AppShell.tsx   Sidebar + nav
│       │   └── ui/             Button, Input, Select, Spinner, Modal
│       ├── store/auth.ts       Zustand: sesión de usuario
│       └── lib/
│           ├── api.ts          Cliente HTTP con auth automática
│           └── supabase.ts     Cliente Supabase (lazy singleton)
│
└── mobile/                 @ape/mobile
    └── app/
        ├── _layout.tsx         Root layout + QueryClient + SplashScreen
        ├── login.tsx
        └── (tabs)/
            ├── _layout.tsx     Tab bar configurado
            ├── index.tsx       Home con días + badge HOY
            ├── asistencia.tsx  Registro con toggle por toque
            ├── dashboard.tsx   Stats + DateSteppers interactivos
            ├── participantes.tsx  CRUD participantes
            └── historial.tsx   Sesiones pasadas: lista → detalle
```

---

## Inicio Rápido

### Prerequisitos

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.0.0 — `npm install -g pnpm`
- Cuenta en **Supabase** con el proyecto configurado

### 1. Clonar e instalar

```bash
git clone https://github.com/zoiket00/Aprender-Para-Emprender.git
cd Aprender-Para-Emprender
pnpm install
```

### 2. Variables de entorno

```bash
# API
cp packages/api/.env.example packages/api/.env

# Mobile
cp packages/mobile/.env.example packages/mobile/.env
```

Ver la sección [Variables de Entorno](#variables-de-entorno) para los valores requeridos.

### 3. Correr en desarrollo

**API + Web juntos** (recomendado):

```bash
# Terminal 1 — API con hot reload
pnpm dev:api

# Terminal 2 — Web con Vite HMR
pnpm dev:web
```

**Solo la API:**

```bash
pnpm dev:api
# → http://localhost:3000
```

**Solo el frontend web:**

```bash
pnpm --filter @ape/web dev
# → http://localhost:5173
# Requiere VITE_API_URL="" en packages/web/.env para proxiar al puerto 3000
```

**App mobile:**

```bash
pnpm --filter @ape/mobile dev
# → Expo DevTools en http://localhost:8081
# Escanea el QR con Expo Go o usa emulador Android/iOS
```

### 4. Build completo

```bash
pnpm build
# Orden automático: shared → web → api (Turborepo maneja las dependencias)
```

---

## Variables de Entorno

### `packages/api/.env`

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor (default: `3000`) | No |
| `NODE_ENV` | `development` \| `production` | Sí |
| `SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `SUPABASE_SERVICE_KEY` | Service role key (acceso total a la BD) | Sí |
| `SUPABASE_ANON_KEY` | Anon key (se envía al frontend vía `/api/config`) | Sí |
| `ALLOWED_ORIGIN` | Origen permitido para CORS (ej: `https://mi-app.com`) | Sí en prod |

### `packages/mobile/.env`

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL de la API (ej: `https://aprender-para-emprender.onrender.com`) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |

> **Nota:** La app web obtiene `SUPABASE_URL` y `SUPABASE_ANON_KEY` automáticamente del endpoint `/api/config` en runtime. No necesita variables de entorno propias en producción.

---

## API Reference

Todas las rutas (excepto `/health` y `/api/config`) requieren header:

```
Authorization: Bearer <supabase_jwt_token>
```

### Health & Config

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servidor |
| `GET` | `/api/config` | Devuelve `url` y `anonKey` de Supabase al frontend |

### Participantes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/participantes` | Lista todos los participantes activos de la org |
| `POST` | `/api/participantes` | Crear participante + inscribir en días |
| `PUT` | `/api/participantes/:id` | Actualizar participante y días (soft-delete inscripciones removidas) |
| `DELETE` | `/api/participantes/:id` | Soft delete del participante |
| `GET` | `/api/participantes/sheet/:dia` | CSV con participantes del día (para pantalla de asistencia) |
| `GET` | `/api/participantes/dias-catalogo` | Días activos por participante |

### Asistencia

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/asistencia` | Registros con filtros: `fecha`, `desde`, `hasta`, `dia` |
| `POST` | `/api/asistencia/guardar` | Guarda/actualiza asistencia de una sesión completa (upsert) |
| `GET` | `/api/asistencia/fechas` | Lista sesiones disponibles (fecha + día) ordenadas desc |
| `DELETE` | `/api/asistencia/dia` | Elimina sesión completa y sus registros (body: `{fecha, dia}`) |

### Export

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/exportar` | Descarga XLSX con filtros `desde`, `hasta`, `dia` (opcional) |

---

## Features del Sistema

### Web App

| Feature | Descripción |
|---------|-------------|
| **Bienvenida** | Selector de días con badge **HOY** automático + accesos rápidos |
| **Asistencia** | Tabla editable con select de estado, ubicación y nota. Botón "✅ Todos presentes" |
| **Historial** | Master-detail: sesiones agrupadas por mes → detalle con tabla, tasa de presencia y exportar |
| **Dashboard** | Stats (total, presentes, tasa, justificados), barras por día, **top 10 ausentes** |
| **Export Excel** | Desde Dashboard (rango de fechas) y desde Historial (sesión individual) |
| **Participantes** | CRUD completo con selección de días, datos extra (fase, programa, edad, madre) |

### App Mobile

| Feature | Descripción |
|---------|-------------|
| **Inicio** | Días con badge **HOY** + accesos rápidos a Dashboard, Participantes e Historial |
| **Asistencia** | Toggle Sí/No/Justificado por toque. Botón "✅ Todos" para marcar todos presentes |
| **Historial** | Lista por mes → detalle con stats strip (presentes/ausentes/tasa) y badges de estado |
| **Dashboard** | DateSteppers ‹/› por semana + presets "Este mes" / "Mes ant.", barras por día |
| **Participantes** | CRUD completo sincronizado con la web |

### API

| Feature | Descripción |
|---------|-------------|
| **Autenticación** | JWT Supabase verificado en cada request |
| **Multi-org** | Aislamiento total por organización via `org_id` |
| **Soft-delete** | Participantes e inscripciones nunca se borran físicamente |
| **Fuzzy matching** | Matching tolerante a errores tipográficos al guardar asistencia |
| **Upsert sesiones** | Re-guardar una sesión actualiza los registros existentes sin duplicar |
| **Rate limiting** | Límite global + límite estricto en `/api/asistencia/guardar` |
| **Helmet CSP** | Content-Security-Policy configurado para Supabase y Google Fonts |

---

## Deploy

### API + Web → Render

El servicio está configurado en [`render.yaml`](./render.yaml). Render ejecuta automáticamente el build al hacer push a `master`.

**Build Command:**
```bash
pnpm install --frozen-lockfile &&
pnpm --filter @ape/shared build &&
pnpm --filter @ape/web build &&
pnpm --filter @ape/api build
```

**Start Command:** `node dist/index.js`

**Variables de entorno requeridas en Render:**

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=<tu-url>
SUPABASE_SERVICE_KEY=<tu-service-key>
SUPABASE_ANON_KEY=<tu-anon-key>
ALLOWED_ORIGIN=https://aprender-para-emprender.onrender.com
```

> **Importante:** Render ignora `render.yaml` para servicios creados desde el dashboard. Si el servicio ya existía, actualiza el Build Command manualmente en **Settings → Build & Deploy**.

**URL de producción:** https://aprender-para-emprender.onrender.com

### App Mobile → EAS Build

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login con tu cuenta Expo
eas login

# Build para Android (APK de desarrollo)
cd packages/mobile
eas build --platform android --profile preview

# Build para producción (Play Store)
eas build --platform android --profile production
```

---

## Guía de Contribución

### Scripts disponibles

```bash
# Desarrollo
pnpm dev           # API + Web simultáneamente (Turborepo)
pnpm dev:api       # Solo API con hot reload (tsx watch)
pnpm dev:web       # Solo Web con Vite HMR

# Build
pnpm build         # Build completo en orden correcto

# Calidad de código
pnpm lint          # TypeScript check de todos los paquetes

# Tests
pnpm test          # Vitest en API y Web
```

### Flujo de trabajo

```bash
# 1. Crear rama
git checkout -b feat/nombre-de-la-feature

# 2. Desarrollar y verificar
pnpm lint   # Sin errores TypeScript
pnpm test   # Tests pasando

# 3. Commit con Conventional Commits
git commit -m "feat(web): descripción del cambio"

# 4. Push y PR a master
git push origin feat/nombre-de-la-feature
```

### Convenciones de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
refactor: refactorización sin cambio de comportamiento
docs:     cambios en documentación
chore:    tareas de mantenimiento (deps, config)
```

### Agregar un nuevo campo a participantes

1. Actualizar el tipo `DatosExtra` en `packages/shared/src/types/`
2. Actualizar el schema Zod en `packages/shared/src/schemas/`
3. Actualizar `toFrontendParticipante` en `packages/api/src/routes/participantes.ts`
4. Actualizar el formulario en `packages/web/src/pages/Participantes/`
5. Actualizar el formulario en `packages/mobile/app/(tabs)/participantes.tsx`

---

## Esquema de Base de Datos

```
organizaciones
    └── miembros_org ──── usuarios (Supabase Auth)
    └── programas
            └── grupos (Lunes–Viernes)
                    └── inscripciones ──── participantes
                    └── sesiones_asistencia
                                └── registros_asistencia ──── participantes
```

**Tablas principales:**

| Tabla | Descripción |
|-------|-------------|
| `organizaciones` | Entidad raíz. Cada org tiene su propio aislamiento de datos |
| `miembros_org` | Relación usuario ↔ organización |
| `participantes` | Bebés/participantes con soft-delete |
| `grupos` | Un grupo por día de la semana, asociado a un programa |
| `inscripciones` | Qué días asiste cada participante (con `salida_en` para historial) |
| `sesiones_asistencia` | Una sesión por grupo por fecha (upsert idempotente) |
| `registros_asistencia` | Registro individual de asistencia por sesión y participante |

---

<div align="center">
  <p>Construido con ❤️ para el equipo de Aprender Para Emprender</p>
</div>
