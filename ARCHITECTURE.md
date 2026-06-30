# LedgerLocal - Arquitectura

> Nota: este documento reemplaza la versión anterior basada en Tauri (app de escritorio). El proyecto pivotó a una **aplicación web self-hosted, 100% local y gratuita** para un solo negocio, según decisión del 2026-06-30. "Web" significa que la interfaz se usa desde un navegador (en vez de una app instalada), no que dependa de servicios pagos en la nube. Todo corre en el propio equipo o red del negocio, sin costos de hosting ni de licencias.

## Visión técnica

LedgerLocal es una aplicación web de contabilidad para una pequeña empresa, pensada para correr enteramente en la computadora del negocio (o un equipo en su red local), sin nube y sin costo. Sustituye a QuickBooks sin copiar su interfaz ni su marca, cubriendo el flujo contable de partida doble y los módulos operativos descritos en `deep-research-report.md`.

Stack:

- **Frontend:** React 19 + TypeScript strict + Vite + Tailwind CSS (ya scaffoldeado en `src/`). React Hook Form + Zod para formularios/validación. React Router para rutas.
- **Backend:** Node.js + TypeScript, framework **Fastify** (preferido sobre Express por rendimiento, validación de esquemas integrada vía JSON Schema/Zod y soporte nativo de TypeScript).
- **Base de datos:** **SQLite** (un solo archivo `.db` en disco, sin servidor de base de datos que instalar ni mantener), acceso vía **Prisma ORM** (migraciones versionadas, tipos generados, queries seguras). Cero costo, respaldo = copiar el archivo.
- **Auth:** sesiones basadas en JWT (access + refresh token), contraseñas con `argon2`. Roles y permisos a nivel de aplicación.
- **Validación compartida:** esquemas Zod compartidos entre frontend y backend cuando sea práctico (paquete `shared` o duplicación deliberada si el monorepo no lo facilita).
- **PDF:** generación server-side (ej. `pdf-lib` o render HTML→PDF) para facturas y reportes.
- **Testing:** Vitest (unit, ambos lados), Supertest para integración de API, Playwright para E2E del flujo crítico.
- **Despliegue:** un solo proceso Node (Fastify) que sirve la API y el build estático del frontend, corriendo en la PC del negocio (`localhost`) o accesible desde otros equipos de la misma red local (`http://<ip-de-la-pc>:puerto`). Sin Docker obligatorio, sin VPS, sin gasto mensual. Docker queda como opción cómoda para empaquetar, no como requisito.

## Estructura del repositorio

Monorepo simple con dos paquetes principales:

```text
BusinessManager/
  src/                  # frontend (existente, se reutiliza)
    app/
    modules/
    shared/
  server/               # backend nuevo
    src/
      modules/
        accounting/
        auth/
        bills/
        companies/
        customers/
        invoices/
        payments/
        products/
        reconciliation/
        reports/
        users/
        vendors/
      shared/
        errors/
        middleware/
        validation/
      db/
        client.ts
      app.ts
      server.ts
    prisma/
      schema.prisma
      migrations/
      dev.db          # archivo SQLite local, ignorado en git
    tests/
  docs/
```

Cada módulo de `server/src/modules/<feature>` sigue, cuando aplique:

```text
routes.ts        # definición de endpoints Fastify
service.ts       # lógica de negocio, reglas contables
repository.ts    # acceso a datos vía Prisma
schemas.ts       # validación Zod de entrada/salida
tests/
```

El frontend mantiene la estructura feature-based ya existente en `src/modules/<feature>` (components, hooks, pages, schemas, services, stores, types, tests), reemplazando las llamadas a comandos Tauri por llamadas HTTP a la API vía un cliente centralizado (`src/shared/lib/apiClient.ts`).

## Capas

```text
Frontend (navegador)
  Pages / Components
  Hooks
  Stores (estado de cliente)
  apiClient (fetch tipado + manejo de errores)
Backend (servidor Node, mismo equipo que la DB)
  Routes (Fastify) — validación de entrada, auth, rate limiting
  Services — reglas de negocio, orquestación contable
  Repositories — acceso a datos vía Prisma
  Domain — entidades y lógica contable pura (testeable sin DB)
SQLite (archivo local)
  Tablas transaccionales (ver DATA_MODEL.md)
```

## Multi-empresa (decisión)

Aunque el despliegue objetivo es **un negocio por instancia**, el modelo de datos incluye `company_id` en las tablas operativas desde el inicio. Esto evita una migración dolorosa si en el futuro se decide ofrecer la app a varios clientes desde una sola instancia, sin agregar complejidad de aislamiento estricto (multi-tenant) que no se necesita ahora.

## Por qué SQLite y no Postgres

- Cero instalación: no hay que levantar un servidor de base de datos aparte ni mantenerlo corriendo.
- Cero costo: no hay servicio de nube que pagar, ni siquiera un free tier que vigilar.
- Respaldo trivial: el respaldo es copiar un archivo (`backups/` con fecha), igual que se documentaba en el plan original local-first.
- Límite aceptado: SQLite serializa escrituras (un escritor a la vez). Para un negocio pequeño con pocos usuarios concurrentes esto no es un problema real; si el negocio crece mucho, migrar a Postgres más adelante es un cambio de `DATABASE_URL` y proveedor en Prisma, no una reescritura del dominio.

## Autenticación y autorización

- Login con email/usuario + contraseña (hash `argon2id`).
- JWT de acceso de corta duración (15 min) + refresh token de larga duración almacenado en cookie `httpOnly`.
- Roles iniciales: `admin`, `contable`, `ventas` (extensible). Permisos se verifican en middleware de Fastify por ruta/módulo.
- Auditoría: toda mutación relevante (crear/confirmar/anular factura, pago, asiento manual, restauración de backup) registra un evento en `audit_log` con usuario, timestamp, entidad y diff relevante.

## Seguridad

- HTTPS opcional: si la app solo se usa en `localhost` o red local cerrada, no es indispensable; se documenta cómo agregarlo (proxy reverso) si el negocio accede desde fuera de su red.
- Validación de entrada en cada endpoint (Zod), nunca confiar en el cliente.
- Protección CSRF para rutas que usan cookies; CORS restringido a los orígenes configurados (típicamente solo la IP/puerto local del propio negocio).
- Rate limiting en endpoints de auth.
- Variables sensibles (JWT secret) vía variables de entorno, nunca en el repo.
- Backups: copiar el archivo `.db` de SQLite (mecanismo nativo de la app, programable con una tarea simple), documentado en `docs/`. No requiere herramientas externas.

## API

REST sobre JSON. Convenciones:

- `GET /api/v1/<recurso>` listados con paginación y filtros.
- `POST /api/v1/<recurso>` creación.
- `PATCH /api/v1/<recurso>/:id` actualización parcial.
- `POST /api/v1/<recurso>/:id/<accion>` transiciones de estado (ej. `/invoices/:id/confirm`, `/invoices/:id/void`).
- Errores en formato consistente `{ error: { code, message, details? } }`.

## Qué se descarta del scaffold anterior

- `src-tauri/` (comandos Rust, SQLite vía Tauri, capabilities) se elimina: ya no aplica a una app web.
- Dependencias `@tauri-apps/*` se remueven de `package.json`.
- El principio "app de escritorio empaquetada" se reemplaza por "servidor Node + navegador, corriendo en el mismo equipo o red del negocio, sin nube".
- El acceso a SQLite ya no es vía Rust sino vía Prisma desde Node, pero el archivo `.db` y la filosofía de respaldo por copia de archivo se mantienen.

## Decisiones pendientes (a resolver en próximas partes)

- Confirmar librería de generación de PDF.
- Definir si las migraciones de Prisma se aplican automáticamente al iniciar el servidor o manualmente con un comando.
- Definir estrategia de tasas de cambio (API externa opcional vs. ingreso manual) para multimoneda — debe poder funcionar sin internet.
