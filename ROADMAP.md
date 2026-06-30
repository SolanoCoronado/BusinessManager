# LedgerLocal - Roadmap

> Reemplaza la versión anterior basada en Tauri/escritorio. Pivote a app web local (sin nube, sin costo) decidido el 2026-06-30. Ver `ARCHITECTURE.md`, `DATA_MODEL.md` y `PLAN.md`.

## Estado actual

Fase 0 y Fase 1 completas, incluida la UI (2026-06-30). Frontend (React + Vite + TypeScript strict + Tailwind + ESLint + Prettier + Vitest) y backend (`server/`: Fastify + TypeScript + Prisma + SQLite) corriendo juntos vía `npm run dev:all`. `src-tauri/` y `@tauri-apps/*` ya fueron eliminados. Flujo real verificado en navegador con Playwright: primer arranque muestra onboarding, crea empresa+admin, entra al dashboard con datos reales, logout vuelve a login, y volver a iniciar sesión recupera la sesión.

Validaciones actuales (2026-06-30):

- Frontend: `npm.cmd run lint` (1 warning no bloqueante de `react-refresh/only-export-components` en `AuthProvider.tsx`, esperado por co-ubicar el hook `useAuth` con el provider), `run build`, `run test` pasan (2 tests).
- Backend (`server/`): `npm.cmd run lint`, `run build`, `run test` pasan (18 tests en 6 archivos: health, onboarding + `/companies/exists`, auth, usuarios/roles, password, permisos).
- `npm run dev:all` levanta frontend (puerto **5310**) y backend (puerto **4310**) juntos; el proxy `/api` de Vite funciona. Puertos elegidos deliberadamente fuera de los defaults 5173/4000 porque esta máquina corre otro proyecto (`StockManagement`, ajeno a este repo) que ya los ocupa — ver "Cuidados conocidos" abajo.
- `npm run ...` puede fallar en PowerShell por bloqueo de `npm.ps1`; usar `npm.cmd run ...`.
- Vitest del frontend necesitó `--configLoader runner` para resolver config en OneDrive/sandbox; el backend usa `vitest.config.ts` con `globalSetup` para aplicar migraciones a una DB de prueba aislada (`server/prisma/test.db`, no se commitea).
- argon2 instala y corre nativo en Windows sin necesitar Rust/cargo (se probó explícitamente).
- OneDrive puede introducir problemas de permisos, locking o rutas largas durante desarrollo.

Cuidados conocidos (encontrados verificando esta fase):

- Las rutas relativas de SQLite en `DATABASE_URL` (`file:./algo.db`) se resuelven relativas a la carpeta `server/prisma/`, no al cwd del proceso. Un descuido aquí ya creó una carpeta `prisma/prisma/` anidada por error; ya corregido.
- `npm run dev:all` en background con `&` desde Bash solo captura el PID del wrapper `npm`, no los procesos hijos reales (`concurrently`, `vite`, `tsx watch`). Matar solo ese PID deja procesos zombis escuchando puertos. Para parar todo de verdad: identificar los `node.exe` cuyo `CommandLine` contiene la ruta del repo (`Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*BusinessManager*' }` en PowerShell) y matarlos por PID.
- Esta máquina puede tener **otros proyectos corriendo en paralelo** (se encontró `StockManagement`, ajeno a este repo, ocupando los puertos 4000 y 5173 con su propio backend/frontend). Por eso los puertos de BusinessManager se fijaron en 5310 (frontend) y 4310 (backend) en vez de los defaults — revisar `vite.config.ts` y `server/.env.example` si hace falta cambiarlos. Nunca matar procesos `node.exe` a ciegas por nombre; siempre filtrar por `CommandLine` para no afectar otros proyectos.

## Fase 0: Limpieza de scaffold y base del backend web — Completada

Objetivo: dejar el repo coherente con la arquitectura web (sin restos de Tauri) y con un backend mínimo ejecutable.

Entregables:

- [x] Eliminar `src-tauri/` y dependencias `@tauri-apps/*` de `package.json`.
- [x] Crear `server/` con Node.js + TypeScript + Fastify.
- [x] Configurar Prisma apuntando a SQLite (`server/prisma/schema.prisma`, `server/prisma/dev.db` ignorado en git).
- [x] Endpoint `GET /api/v1/health` funcionando.
- [x] Cliente API tipado en el frontend (`src/shared/lib/apiClient.ts`) consumiendo el health check.
- [x] Scripts en `package.json` raíz (`dev:server`, `dev:all` con `concurrently`) para correr frontend y backend juntos en desarrollo.

Criterio de salida: cumplido. `npm run dev:all` levanta frontend y backend sin depender de internet; el frontend muestra "Servidor local conectado" en el header; lint/build/test pasan en ambos paquetes.

## Fase 1: Empresa, usuarios y roles — Completada

Entregables:

- [x] SQLite local vía Prisma.
- [x] Migraciones versionadas (`20260630143727_fase1_empresa_usuarios_auditoria`).
- [x] Empresa (modelo + endpoint de onboarding `POST /api/v1/onboarding`, atómico con el usuario admin) + endpoint público `GET /api/v1/companies/exists` para que el frontend decida onboarding vs. login antes de tener sesión.
- [x] Usuarios locales (`POST/GET /api/v1/users`, `PATCH /api/v1/users/:id/active`) y roles fijos (`admin`, `contable`, `ventas`) con matriz de permisos en código (`server/src/shared/permissions/roles.ts`) — sin tabla Role/Permission en DB todavía, ver nota en el schema.
- [x] Auditoría básica (`AuditLog`: onboarding, login, creación/activación/desactivación de usuarios).
- [x] Login JWT (access 15min + refresh 30d en cookie httpOnly), `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.
- [x] Pantallas de onboarding y login en el frontend (`src/modules/auth/pages/`), con `AuthProvider` (`src/app/providers/AuthProvider.tsx`) manejando el estado de sesión (loading / needs-onboarding / needs-login / authenticated) y reemplazando los datos mock (`DEFAULT_COMPANY_PROFILE` eliminado) por la empresa y el usuario reales.

Criterio de salida:

- [x] Crear empresa local — verificado vía API (`onboarding.test.ts`) y en navegador real con Playwright.
- [x] Crear usuario administrador (parte del mismo flujo de onboarding).
- [x] Iniciar sesión (JWT) — probado en `server/src/modules/auth/auth.test.ts` y en navegador (logout → login → vuelve al dashboard con la sesión).
- [x] Pruebas unitarias de permisos por rol — `server/src/shared/permissions/roles.test.ts` y prueba de integración en `server/src/modules/users/users.test.ts` (un usuario `ventas` recibe 403 al listar usuarios).
- [x] Verificado el flujo completo desde el navegador (onboarding → dashboard → logout → login), sin errores de consola.

## Fase 2: Núcleo contable — Completada

Entregables:

- [x] Catálogo de cuentas jerárquico con set inicial para pequeña empresa (`server/src/modules/accounting/defaultChartOfAccounts.ts`, 5 grupos / 18 cuentas), sembrado automáticamente en el onboarding dentro de la misma transacción que crea la empresa y el admin.
- [x] Motor de asientos de partida doble (`JournalEntry`/`JournalLine` en Prisma, `server/src/modules/accounting/journalEntries.service.ts`).
- [x] Validación de asientos balanceados (`server/src/shared/accounting/journalValidation.ts`, misma lógica que el frontend ya tenía en `src/modules/accounting/services/journalValidation.ts`, duplicada deliberadamente — ver nota en `ARCHITECTURE.md`).
- [x] Confirmación y bloqueo de edición: los asientos se crean directamente como `posted` y no existe endpoint de edición — la única forma de corregir un asiento confirmado es revertirlo.
- [x] Reversión mediante asiento inverso (`POST /api/v1/accounting/journal-entries/:id/reverse`), con bloqueo para revertir el mismo asiento dos veces (`reversalOfId` único en el schema).
- [x] Cálculo de saldo de cuenta (`GET /api/v1/accounting/accounts/:id`), respetando el lado normal de cada tipo de cuenta (activo/gasto = débito-normal, pasivo/patrimonio/ingreso = crédito-normal).
- [x] UI del módulo "Contabilidad" (`src/modules/accounting/pages/AccountingPage.tsx`): tabla de catálogo de cuentas con saldo en vivo, formulario de asiento manual con líneas dinámicas (`useFieldArray`) y validación de balance en tiempo real reutilizando la lógica ya existente en el frontend, lista de asientos recientes con botón "Revertir".

Criterio de salida:

- [x] Crear asiento manual balanceado — probado en `server/src/modules/accounting/accounting.test.ts` y en navegador real con Playwright.
- [x] Rechazar asiento desbalanceado.
- [x] Revertir asiento confirmado mediante asiento inverso, incluyendo el caso de revertir dos veces (409) y verificado visualmente que el saldo de la cuenta vuelve a 0.
- [x] Pruebas unitarias contables pasan (`journalValidation.test.ts`, `accountTypes.test.ts`) + integración de permisos (`ventas` no puede crear asientos pero sí verlos). 31/31 tests del backend pasan, 2/2 del frontend.
- [x] Verificado el flujo desde el navegador: onboarding → módulo Contabilidad → catálogo sembrado visible → crear asiento (Banco/Ingresos por Ventas) → saldo se actualiza → revertir → saldo vuelve a cero. Sin errores de consola.

## Fase 3: Maestros operativos

Entregables:

- Clientes, proveedores, productos y servicios.
- Impuestos configurables.
- Configuración regional CRC/USD.

Criterio de salida:

- Crear cliente, proveedor y producto desde la UI.
- Asociar cuentas contables e impuestos.
- Validaciones y estados vacíos implementados.

## Fase 4: Facturas, pagos, gastos y cuentas por pagar

Entregables:

- Cotizaciones y facturas con numeración correlativa por empresa.
- Confirmación de facturas con asiento automático.
- Pagos parciales y totales.
- Gastos pagados.
- Facturas de proveedor y cuentas por pagar.
- Anulación auditable.
- PDF de factura.

Criterio de salida:

- Crear y confirmar factura.
- Registrar pago parcial.
- Registrar gasto.
- Registrar cuenta por pagar y su pago.
- Ver asientos contables vinculados a cada documento.

## Fase 5: Banco, CSV y conciliación

Entregables:

- Cuentas bancarias y caja.
- Movimientos manuales.
- Importación CSV con vista previa y mapeo de columnas.
- Detección básica de duplicados.
- Conciliación bancaria.

Criterio de salida:

- Importar CSV de un banco real.
- Cancelar antes de confirmar la importación.
- Confirmar movimientos válidos.
- Conciliar una cuenta con diferencia visible y explicada.

## Fase 6: Reportes financieros

Entregables:

- Estado de resultados.
- Balance general.
- Balance de comprobación.
- Libro diario.
- Libro mayor.
- Cuentas por cobrar/pagar por antigüedad.
- Ventas por cliente.
- Gastos por categoría.
- Flujo de caja básico.
- Resumen de impuestos.
- Exportación CSV y PDF.

Criterio de salida:

- Reportes filtran por rango de fechas.
- Totales y subtotales claros y correctos (activos = pasivos + patrimonio).
- Exportación funcional sin servicios externos.

## Fase 7: Auditoría, respaldos y seguridad

Entregables:

- Auditoría completa de acciones sensibles.
- Respaldo local (copia del archivo SQLite) con historial.
- Restauración validada, con copia previa antes de restaurar.
- Endurecimiento de permisos por rol.

Criterio de salida:

- Crear respaldo.
- Restaurar en una instalación de prueba.
- Registrar auditoría de cada acción crítica.
- Documentar claramente qué protege y qué no protege el respaldo (no hay cifrado del archivo por defecto; queda como mejora futura documentada, no como promesa).

## Fase 8: E2E, accesibilidad y empaquetado

Entregables:

- Flujo E2E mínimo con Playwright.
- Revisión de accesibilidad por teclado.
- Estados de error, vacío y carga en toda la UI.
- Documentación de instalación: cómo levantar el servidor en la PC del negocio, cómo acceder desde otros equipos de la red local, cómo respaldar.

Criterio de salida:

- E2E cubre: crear empresa, cliente, producto, factura, pago, asiento, reporte, respaldo y restauración.
- App usable sin internet.
- Documentación suficiente para que el dueño del negocio (no programador) la instale siguiendo pasos.

## Deudas técnicas conocidas

- Confirmar estrategia de PDF.
- Definir si se ofrece cifrado opcional del archivo SQLite más adelante.
- Ajustar pruebas E2E al entorno real de despliegue (Windows, posible OneDrive).
- Diseñar mecanismo futuro de facturación electrónica sin mezclarlo con el MVP.
- Evaluar migración a PostgreSQL solo si el uso real demuestra que SQLite es limitante (no antes).

## Comandos esperados (se concretarán en Fase 0)

```bash
npm install
npm run dev          # frontend
npm --prefix server run dev   # backend (nombre tentativo, a definir en Fase 0)
npm run lint
npm run test
npm run build
```
