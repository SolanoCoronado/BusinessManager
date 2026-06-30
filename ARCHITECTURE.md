# LedgerLocal - Arquitectura

## Nombre y configuración de producto

El nombre temporal del producto es `LedgerLocal`. Debe vivir en una constante central, por ejemplo:

```ts
export const PRODUCT_CONFIG = {
  name: "LedgerLocal",
  defaultLocale: "es-CR",
  defaultCurrency: "CRC",
  secondaryCurrency: "USD",
} as const;
```

## Visión técnica

LedgerLocal será una aplicación de escritorio local-first construida con:

- Tauri v2 para el contenedor de escritorio y comandos nativos.
- React + TypeScript strict para la interfaz.
- Vite para desarrollo y build.
- Tailwind CSS para estilos locales.
- SQLite local para persistencia.
- Rust para acceso a base de datos, migraciones, validaciones críticas y operaciones sensibles.
- Zod y React Hook Form para validación y formularios en frontend.
- Vitest para pruebas unitarias.
- Playwright para pruebas E2E cuando la base de Tauri esté lista.

## Capas

```text
UI React
  Pages
  Components
  Hooks
  Schemas
Application services
  Use cases
  Permission checks
  DTO mapping
Tauri command boundary
  Typed commands
  Input validation
  Error mapping
Rust domain services
  Accounting engine
  Document workflows
  Backup/restore
  Audit logging
Persistence
  SQLite
  Migrations
  Repository functions
```

## Reglas de frontera

- React no ejecuta SQL.
- Los componentes no contienen lógica contable.
- Las páginas orquestan componentes y hooks; no concentran JSX grande ni reglas de negocio.
- Toda operación financiera confirmada pasa por servicios de dominio.
- Los comandos Tauri validan entradas y devuelven errores tipados.
- Las migraciones son versionadas y reproducibles.
- Las entidades críticas usan eliminación lógica o estados de anulación/reversión.

## Módulos

### `auth`

Inicio de sesión local, usuarios, roles, permisos y sesión activa.

### `companies`

Creación, edición, activación, archivo, respaldo y restauración por empresa.

### `accounting`

Catálogo de cuentas, diario general, asientos, líneas contables, reversos y cálculo de saldos.

### `customers` y `vendors`

Terceros, saldos pendientes e historial de documentos.

### `products`

Productos y servicios, impuestos aplicables y cuentas contables relacionadas.

### `invoices`

Cotizaciones, facturas, líneas, estados, confirmación, anulación, duplicado, PDF e historial.

### `payments`

Cobros de clientes, pagos a proveedores e ingresos no facturados.

### `expenses` y `bills`

Gastos pagados, facturas de proveedor y cuentas por pagar.

### `banking`

Cuentas bancarias/caja, movimientos, importación CSV, clasificación y transferencias.

### `reconciliation`

Conciliaciones bancarias, diferencias, movimientos pendientes y reapertura auditable.

### `reports`

Consultas financieras, exportación CSV/PDF e impresión.

### `audit`

Registro y consulta de eventos locales.

### `backups`

Creación, validación, cifrado disponible, historial y restauración.

## Flujo de una factura confirmada

```text
Formulario React
  -> schema Zod frontend
  -> comando Tauri confirm_invoice
  -> validación Rust
  -> verificación permisos
  -> transacción SQLite
  -> actualización factura
  -> creación asiento contable
  -> registro auditoría
  -> commit
  -> respuesta tipada
```

Regla contable:

- Débito: cuentas por cobrar.
- Crédito: ingresos.
- Crédito: impuesto por pagar, si aplica.

## Manejo de errores

Los errores deben mapearse a categorías:

- `ValidationError`
- `PermissionDenied`
- `NotFound`
- `Conflict`
- `AccountingRuleViolation`
- `StorageError`
- `SecurityError`
- `UnexpectedError`

La UI debe mostrar mensajes accionables en español sin exponer detalles internos sensibles.

## Estado local en frontend

El estado persistente vive en SQLite. El frontend puede usar:

- Estado local de componentes para formularios y filtros.
- Hooks por módulo para cargar y mutar datos.
- TanStack Query solo si mejora cache, invalidación y estados async locales.

## Estrategia offline

No hay dependencia de red en producción. Todos los assets deben empaquetarse localmente. Cualquier integración externa futura debe estar detrás de flags explícitos y apagada por defecto.

## Decisiones documentales

Las decisiones relevantes se documentarán en `docs/decisions/` como ADRs breves:

- Contexto.
- Decisión.
- Consecuencias.
- Alternativas consideradas.
