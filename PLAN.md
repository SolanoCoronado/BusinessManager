# LedgerLocal - Plan de planificación

> Reemplaza la versión anterior basada en Tauri/escritorio. Pivote a app web local decidido el 2026-06-30: ver `ARCHITECTURE.md` y `DATA_MODEL.md`.

## Estado del repositorio

El frontend (`src/`) ya existe como scaffold React + Vite + TypeScript strict + Tailwind, con estructura feature-based y un primer módulo de validación contable (`journalValidation.ts`). El backend (`server/`) todavía no existe; está documentado pero no creado. `src-tauri/` y las dependencias `@tauri-apps/*` quedan obsoletos y se eliminarán en la siguiente parte de limpieza de scaffold.

## Objetivo de esta fase de planificación

Definir la base técnica y funcional de LedgerLocal como **aplicación web 100% local y gratuita** (sin nube, sin licencias, sin servidor pago) antes de escribir el backend. Esta fase produjo `ARCHITECTURE.md` y `DATA_MODEL.md` actualizados; este documento guía el orden de implementación.

## Principios del producto

- Web real: la interfaz se usa desde el navegador, servida por un proceso Node corriendo en la propia PC o red del negocio.
- Sin nube, sin telemetría, sin servicios pagos. SQLite como única base de datos.
- Contabilidad de partida doble como núcleo, no como capa secundaria.
- Las operaciones confirmadas deben ser trazables, auditables y reversibles (anulación/reverso, no edición directa).
- UI profesional en español, responsive, usable en escritorio y tablet.
- Preparado para Costa Rica (CRC/USD) sin afirmar cumplimiento fiscal oficial (no es facturación electrónica certificada).
- Arquitectura extensible para módulos futuros (facturación electrónica, nómina, sincronización opcional) sin comprometer el MVP.

## MVP de la primera versión funcional

El MVP debe permitir:

- Crear y administrar la empresa (datos básicos, moneda, período fiscal).
- Crear usuarios locales y asignar roles.
- Configurar catálogo de cuentas inicial, impuestos y moneda.
- Registrar clientes, proveedores, productos y servicios.
- Crear, confirmar, anular y duplicar facturas.
- Registrar pagos parciales o totales de facturas.
- Registrar gastos pagados y cuentas por pagar (bills de proveedor).
- Generar asientos automáticos vinculados a documentos comerciales.
- Crear asientos manuales balanceados.
- Importar movimientos bancarios por CSV con vista previa y validación.
- Realizar una conciliación bancaria simple.
- Consultar estado de resultados, balance general, balance de comprobación y reportes operativos iniciales.
- Exportar reportes a CSV y PDF.
- Crear y restaurar respaldos (copia del archivo SQLite).
- Revisar auditoría básica de cambios.
- Funcionar sin conexión a internet (excepto, opcionalmente, para traer tasas de cambio).

## Fuera del MVP

Quedan para versiones futuras:

- Nómina.
- Integración bancaria automática (APIs de bancos).
- Facturación electrónica oficial certificada.
- Envío automático de correos.
- Acceso remoto fuera de la red local del negocio (requeriría exponer el servidor a internet, decisión deliberada y posterior).
- Aplicación móvil nativa.
- Sincronización en nube.
- Inteligencia artificial.
- Inventario físico completo (lotes, series, múltiples almacenes).
- Migración a PostgreSQL (solo si el negocio crece a un punto donde SQLite sea limitante; el modelo de datos ya está preparado para ese cambio sin reescritura del dominio).

## Estructura objetivo

```text
src/                  # frontend (existente)
  app/
  modules/
  shared/
  tests/
server/               # backend (por crear)
  src/
    modules/
    shared/
    db/
    app.ts
    server.ts
  prisma/
    schema.prisma
    migrations/
  backups/
  tests/
docs/
  decisions/
  testing/
```

Ver `ARCHITECTURE.md` para el detalle de capas dentro de cada módulo.

## Fases de implementación

### Fase 0: Limpieza de scaffold y base del backend

- Eliminar `src-tauri/` y dependencias `@tauri-apps/*`.
- Crear `server/` con Fastify + TypeScript + Prisma configurado para SQLite.
- Configurar scripts (`dev`, `build`, `test`) para correr frontend y backend juntos en desarrollo.
- Endpoint de salud (`GET /api/v1/health`) y conexión frontend↔backend verificada end-to-end.

### Fase 1: Empresa, usuarios y roles

- Modelos `Company`, `User`, `Role`/`Permission` en Prisma + migraciones.
- Endpoints y UI de onboarding inicial (crear empresa, crear usuario admin).
- Login local (JWT), cambio de contraseña, gestión de usuarios.
- Auditoría básica (`AuditLog`) registrando login y cambios de usuario/rol.

### Fase 2: Núcleo contable

- Catálogo de cuentas jerárquico con cuentas iniciales sugeridas para pequeña empresa.
- Motor de asientos de partida doble (`JournalEntry`/`JournalLine`).
- Validación de balance, confirmación, reversión y bloqueo de edición de asientos confirmados.
- Cálculo de saldo de cuenta. Pruebas unitarias contables (reutilizando y extendiendo `journalValidation.ts`).

### Fase 3: Maestros operativos

- Clientes, proveedores, productos y servicios (CRUD + validaciones).
- Impuestos configurables (`TaxRate`).
- Configuración regional CRC/USD y formato de moneda/fecha.

### Fase 4: Documentos comerciales

- Cotizaciones y facturas, confirmación con asiento automático.
- Pagos parciales y totales.
- Gastos pagados y facturas de proveedor (bills) con cuentas por pagar.
- Anulación auditable.
- Generación de PDF para facturas.

### Fase 5: Banco y conciliación

- Cuentas bancarias y caja.
- Movimientos manuales.
- Importación CSV con mapeo de columnas, vista previa, validaciones y detección de duplicados.
- Conciliación bancaria confirmable y auditable.

### Fase 6: Reportes

- Estado de resultados, balance general, balance de comprobación, libro diario, libro mayor.
- Reportes de cuentas por cobrar/pagar por antigüedad, ventas por cliente, gastos por categoría, flujo de caja, resumen de impuestos.
- Exportación CSV/PDF.

### Fase 7: Seguridad, respaldos y restauración

- Respaldos locales (copia programable del archivo SQLite).
- Validación y restauración segura, con copia previa antes de restaurar.
- Endurecimiento de permisos por rol y auditoría completa de acciones sensibles.

### Fase 8: E2E, accesibilidad y empaquetado

- Playwright para el flujo completo mínimo (empresa → cliente → producto → factura → pago → asiento → reporte → respaldo → restauración).
- Revisión de accesibilidad por teclado.
- Documentación de instalación y operación (cómo levantar el servidor local, cómo respaldar, cómo acceder desde otro equipo de la red).
- Empaquetado simple (script de arranque, o contenedor Docker opcional para quien lo prefiera).

## Riesgos técnicos

- Concurrencia de escritura en SQLite si varios usuarios trabajan a la vez (mitigado: negocio pequeño, pocos usuarios concurrentes; documentado como límite conocido).
- Generación de PDF consistente sin dependencias pesadas.
- Complejidad de reglas contables al mezclar facturas, pagos, anulaciones y reversos.
- OneDrive puede introducir problemas de permisos, locking o rutas largas durante desarrollo (ya observado en este entorno).
- Acceso desde otros equipos de la red local requiere configurar el firewall de Windows correctamente; documentar pasos.

## Decisiones ya tomadas

- Web (no escritorio empaquetado): confirmado.
- Backend: Node.js + TypeScript + Fastify: confirmado.
- Base de datos: SQLite vía Prisma: confirmado (sin costo, sin servidor externo).
- Despliegue: un solo negocio por instalación, corriendo en la propia PC/red: confirmado.

## Decisiones pendientes

- Librería de generación de PDF.
- Si las migraciones de Prisma se aplican automáticamente al iniciar el servidor o manualmente.
- Estrategia de tasas de cambio para multimoneda (manual por defecto, API externa opcional si hay internet).
- Si se ofrece un instalador/empaquetado nativo más adelante o basta con un script `npm run start`.
