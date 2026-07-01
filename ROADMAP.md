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

## Fase 3: Maestros operativos — Completada

Entregables:

- [x] Clientes (`server/src/modules/customers/`): CRUD + activar/desactivar, asociación opcional a cuenta contable (CxC).
- [x] Proveedores (`server/src/modules/vendors/`): mismo patrón que clientes, para CxP.
- [x] Productos y servicios (`server/src/modules/products/`): SKU único por empresa, precio en centavos, asociación opcional a impuesto y a cuentas de ingreso/gasto, control de inventario opcional.
- [x] Impuestos configurables (`server/src/modules/taxRates/`): nombre único por empresa, tasa (0-100%), asociación opcional a cuenta contable donde se acumula.
- [x] Configuración regional CRC/USD (`PATCH /api/v1/companies/current`, solo admin): permite editar moneda base/secundaria y locale después del onboarding.
- [x] Permisos extendidos: la matriz de `server/src/shared/permissions/roles.ts` ahora cubre `customers`/`vendors`/`products`/`taxRates`, y se agregó el middleware `requirePermission(resource, action)` que lee esa matriz directamente (las rutas nuevas ya no listan roles a mano como en Fases 1-2).
- [x] UI: páginas de Clientes y Proveedores (componente compartido `PartyManagerPage`) y de Productos (con selector de impuesto), todas con estado vacío, alta inline y activar/desactivar.

Criterio de salida:

- [x] Crear cliente, proveedor y producto desde la UI — verificado con Playwright en navegador real, sin errores de consola.
- [x] Asociar cuentas contables e impuestos — productos se pueden asociar a un impuesto existente; validado que rechaza cuentas/impuestos que no pertenecen a la empresa.
- [x] Validaciones y estados vacíos implementados — SKU/nombre de impuesto duplicados rechazados (409), datos inválidos rechazados (400), pantallas muestran "Todavía no hay ... registrados" cuando la lista está vacía.
- [x] 45/45 tests del backend pasan (13 archivos), incluyendo permisos (`ventas` puede crear clientes pero no proveedores).

## Fase 4: Facturas, pagos, gastos y cuentas por pagar — Completada (sin PDF todavía)

Entregables:

- [x] Facturas con numeración correlativa por empresa (`FA-0001`, `server/src/modules/invoices/`). Sin cotizaciones separadas todavía (se puede agregar como un estado adicional más adelante si se necesita).
- [x] Confirmación de facturas con asiento automático: debita la cuenta por cobrar del cliente (o `1100` por defecto), acredita ingresos agrupados por cuenta de producto (o `4010` por defecto) e impuestos agrupados por cuenta del impuesto (o `2020` por defecto). Validación de balance como red de seguridad antes de persistir.
- [x] Pagos parciales y totales (`server/src/modules/payments/`): un pago no puede exceder el saldo pendiente; el estado de la factura/cuenta por pagar pasa automáticamente a `partially_paid` o `paid`.
- [x] Gastos pagados (`server/src/modules/expenses/`): asiento directo (debita gasto, acredita banco/caja), anulables.
- [x] Facturas de proveedor y cuentas por pagar (`server/src/modules/bills/`, numeración `CXP-0001`), mismo patrón que facturas pero sin impuestos (alcance reducido a propósito, ver nota en el código).
- [x] Anulación auditable: facturas, cuentas por pagar y gastos se pueden anular (revierte el asiento contable mediante asiento inverso); bloqueado si ya tienen pagos aplicados.
- [ ] PDF de factura — no implementado en esta fase. Pendiente para una parte futura.

Criterio de salida:

- [x] Crear y confirmar factura — probado con 61 tests de integración y en navegador real (Playwright): factura FA-0001, confirmar, ver saldo actualizado.
- [x] Registrar pago parcial — verificado en navegador: pago de ₡30.000 sobre factura de ₡50.000 deja saldo en ₡20.000 y estado "Pago parcial".
- [x] Registrar gasto — verificado en navegador, incluyendo anulación.
- [x] Registrar cuenta por pagar y su pago — verificado en navegador (CXP-0001, confirmar, pagar).
- [x] Ver asientos contables vinculados a cada documento — cada factura/cuenta por pagar/gasto guarda su `journalEntryId`; los saldos de cuenta en el módulo Contabilidad reflejan estos asientos automáticamente.

Bug real encontrado y corregido durante las pruebas: la validación de "no anular si tiene pagos aplicados" comparaba `balanceDue !== total` solo cuando el estado seguía siendo `confirmed`, pero un pago cambia el estado a `partially_paid`/`paid`, por lo que la condición nunca se cumplía y dejaba anular documentos con pagos ya aplicados. Corregido en `invoices/service.ts` y `bills/service.ts`, con pruebas de regresión para ambos.

## Fase 5: Banco, CSV y conciliación — Completada

Entregables:

- [x] Cuentas bancarias (`server/src/modules/banking/`): envuelven una cuenta del catálogo (debe ser tipo activo, p.ej. `1010` Caja o `1020` Banco), una por cuenta contable.
- [x] Movimientos manuales: registrar un movimiento suelto (depósito/retiro) sin pasar por CSV.
- [x] Importación CSV con vista previa: el parseo ocurre en el navegador (formato `fecha,descripcion,monto`, fecha `AAAA-MM-DD`), se muestra una tabla de previsualización y el usuario puede cancelar antes de confirmar.
- [x] Detección básica de duplicados: una segunda importación con las mismas filas (fecha+descripción+monto) se omite automáticamente (`skippedDuplicates`).
- [x] Conciliación bancaria simple: iniciar conciliación con fecha y saldo según estado de cuenta, marcar movimientos como "aparece en el estado de cuenta", completar y ver el saldo del libro mayor vs. el saldo declarado con la diferencia calculada. Solo una conciliación `in_progress` a la vez por cuenta bancaria.
- [x] UI: módulo "Bancos" (cuentas, movimientos, importar CSV) y módulo "Conciliación" (iniciar, marcar, completar, historial).

Nota de diseño: los movimientos bancarios importados/manuales son solo registros para conciliar contra el libro mayor — no generan asientos contables por sí mismos (los asientos ya existen porque vinieron de facturas, pagos o gastos). Esto es deliberado: evita duplicar contabilidad y mantiene la conciliación como lo que es, una comparación entre "lo que dice el banco" y "lo que dicen los libros".

Criterio de salida:

- [x] Importar CSV de un banco real — probado con archivo `.csv` real vía Playwright (2 filas importadas).
- [x] Cancelar antes de confirmar la importación — botón "Cancelar" en la vista previa descarta las filas sin tocar la base de datos.
- [x] Confirmar movimientos válidos — verificado en navegador y con 64/64 tests del backend.
- [x] Conciliar una cuenta con diferencia visible y explicada — probado en backend con un caso real (diferencia = 0 cuando el movimiento coincide con un gasto contabilizado) y en navegador (diferencia visible en el historial).

## Fase 6: Reportes financieros — Completada (sin PDF)

Entregables:

- [x] Estado de resultados (`income-statement`): ingresos y gastos por cuenta, filtrable por rango de fechas.
- [x] Balance general (`balance-sheet`): activo/pasivo/patrimonio "al día X", incluye la utilidad del período como parte del patrimonio para que cuadre la ecuación contable sin necesitar asientos de cierre formales.
- [x] Balance de comprobación (`trial-balance`): cada cuenta muestra su lado normal (debe o haber), suma de débitos = suma de créditos por construcción.
- [x] Libro diario (`general-journal`): asientos confirmados en el rango de fechas con sus totales.
- [x] Libro mayor (`general-ledger`): movimientos de una cuenta específica con saldo corriente (endpoint listo; UI de selección de cuenta queda para un ajuste posterior).
- [x] Antigüedad de cuentas por cobrar y por pagar (`ar-aging`, `ap-aging`): agrupado en buckets de 0-30/31-60/61-90/91+ días.
- [x] Ventas por cliente y gastos por categoría: totales agrupados, ordenados de mayor a menor.
- [x] Flujo de caja básico: entradas/salidas netas de las cuentas de caja y banco (`1010`/`1020`) en el rango.
- [x] Resumen de impuestos: impuesto cobrado agrupado por tasa, a partir de las líneas de factura.
- [x] Exportación CSV funcional (botón "Exportar CSV" en cada reporte, generado en el navegador).
- [ ] Exportación a PDF — no implementada (igual que el PDF de factura en Fase 4, queda pendiente para una parte futura dedicada a generación de PDF).

Criterio de salida:

- [x] Reportes filtran por rango de fechas (`from`/`to`) o "al día" (`asOf`) según el tipo de reporte.
- [x] Totales y subtotales claros y correctos — probado en backend que activo = pasivo + patrimonio (incluyendo utilidad del período) y que el balance de comprobación siempre cuadra débito = crédito.
- [x] Exportación funcional sin servicios externos — CSV generado 100% en el navegador, sin llamadas externas.
- [x] Verificado en navegador real: factura confirmada → estado de resultados muestra el ingreso correcto → balance de comprobación cuadra → ventas por cliente agrupa correctamente → exportar CSV no genera errores.

## Fase 7: Auditoría, respaldos y seguridad — Completada

Entregables:

- [x] Auditoría completa de acciones sensibles: ya cubierta desde Fase 1 (cada módulo llama `recordAudit` en sus mutaciones); esta fase agregó el endpoint y la pantalla para **verla** (`GET /api/v1/audit-logs`, módulo "Auditoria" en el frontend, últimos 200 eventos).
- [x] Respaldo local (copia del archivo SQLite) con historial (`server/src/modules/backups/`): `POST /api/v1/backups` copia `prisma/dev.db` a `backups/backup-<timestamp>.db`; `GET /api/v1/backups` lista los archivos reales del disco (sin tabla intermedia, siempre fiel al filesystem).
- [x] Restauración validada, con copia previa antes de restaurar: antes de sobreescribir, se copia el estado actual a `backups/pre-restore-<timestamp>.db`. Nombres de archivo validados contra un patrón estricto (rechaza intentos de path traversal). Verificado con una prueba real (no simulada): crear cliente A → respaldo → crear cliente B → restaurar → cliente B desaparece, tanto en tests de backend como en navegador real con el servidor corriendo en vivo.
- [x] Endurecimiento de permisos por rol: nuevos recursos `audit` (solo ver, admin/contable) y `backups` (crear: admin/contable: restaurar: solo admin — restaurar es la acción más destructiva del sistema, se restringió a propósito).

Decisiones de seguridad documentadas honestamente en `ARCHITECTURE.md` en vez de prometerse sin implementar:

- **Cifrado del archivo `.db`: no implementado.** Mitigación recomendada mientras tanto: cifrado de disco del sistema operativo. No se afirma cumplimiento de cifrado en ningún texto de la app.
- **Keychain del sistema operativo: no aplica** a la arquitectura web (era un requisito de la versión Tauri/escritorio descartada). El único secreto de servidor (`JWT_SECRET`) se maneja por variable de entorno, el patrón estándar para procesos de servidor.

Criterio de salida:

- [x] Crear respaldo — verificado en backend y en navegador.
- [x] Restaurar en una instalación de prueba — verificado de extremo a extremo: backend (test real de restore mientras el servidor corre) y navegador (Playwright, con el flujo completo de confirmación → restauración → logout forzado → vuelta a iniciar sesión → datos revertidos correctamente).
- [x] Registrar auditoría de cada acción crítica — incluye la creación de respaldos (la restauración también se audita, aunque por la naturaleza de la operación ese registro específico no sobrevive en la base de datos restaurada; queda constancia en el log del servidor, explicado en el código).
- [x] Documentado claramente qué protege y qué no protege el respaldo — sin cifrado por defecto, declarado explícitamente en `ARCHITECTURE.md`, no como promesa sino como limitación conocida.

## Fase 8: E2E, accesibilidad y empaquetado — Completada

Entregables:

- [x] Playwright como dependencia real del proyecto (`@playwright/test` en `devDependencies`), con `playwright.config.ts`, global setup/teardown (`e2e/setup.ts`, `e2e/teardown.ts`) que reinicia la base de datos antes de correr y limpia después, y `npm run test:e2e` como script dedicado.
- [x] Test E2E del flujo crítico completo (`e2e/critical-path.spec.ts`): onboarding → cliente → producto → factura (confirmar + pago parcial) → asiento manual contable → reporte (estado de resultados) → respaldo → cliente extra → restaurar → logout forzado → re-login → verificar que el cliente extra ya no existe (datos revertidos).
- [x] Revisión de accesibilidad por teclado: agregado `useEscapeKey` hook (`src/shared/hooks/useEscapeKey.ts`) en todos los diálogos modales (pago de facturas, pago de cuentas por pagar, confirmar restauración); todos los elementos interactivos son `<button>` o `<input>`; los modales tienen `role="dialog"`, `aria-modal="true"`, y se cierran al hacer clic en el fondo (`onClick` en overlay).
- [x] Estados de error, vacío y carga en toda la UI: `EmptyState` en todos los módulos con lista, mensajes de error inline, indicadores de "Creando...", "Guardando...", "Generando..." en botones durante operaciones async.
- [x] Documentación de instalación completa para el dueño del negocio (`docs/INSTALACION.md`): instalación de Node.js, configuración del `.env`, migración de base de datos, cómo arrancar, cómo acceder desde la red local (con instrucciones de Firewall), cómo respaldar, cómo actualizar, solución de problemas en tabla.

Criterio de salida:

- [x] E2E cubre: crear empresa, cliente, producto, factura, pago, asiento, reporte, respaldo y restauración — todo en un solo test automatizado con `npm run test:e2e`, sin internet, pasando en primera ejecución.
- [x] App usable sin internet — toda la lógica y los datos son locales; el único caso con internet opcional es la visualización de iconos de Lucide que se usan como dependencia local (no CDN).
- [x] Documentación suficiente para instalación por un no-programador — `docs/INSTALACION.md` guía paso a paso desde cero.

## Deudas técnicas conocidas

- Confirmar estrategia de PDF.
- Definir si se ofrece cifrado opcional del archivo SQLite más adelante.
- Ajustar pruebas E2E al entorno real de despliegue (Windows, posible OneDrive).
- Diseñar mecanismo futuro de facturación electrónica sin mezclarlo con el MVP.
- Evaluar migración a PostgreSQL solo si el uso real demuestra que SQLite es limitante (no antes).

## Comandos del proyecto (estado final tras Fase 8)

```bash
# Instalacion
npm install
npm --prefix server install
npm --prefix server run prisma:migrate  # crear/actualizar base de datos

# Desarrollo (levanta frontend en :5310 y backend en :4310 juntos)
npm run dev:all

# Build de produccion
npm run build

# Pruebas unitarias
npm.cmd run test           # frontend (Vitest)
npm.cmd --prefix server run test  # backend (Vitest, incluye prueba real de restore)

# Prueba E2E (Playwright, requiere banco de datos limpio, maneja el servidor sola)
npm run test:e2e

# Lint
npm.cmd run lint               # frontend
npm.cmd --prefix server run lint  # backend
```

Nota PowerShell: en Windows, usar `npm.cmd` en vez de `npm` si aparece el error "Scripts de PowerShell bloqueados".
