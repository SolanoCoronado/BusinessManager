# LedgerLocal - Modelo de datos inicial

## Estrategia

La primera versión usará SQLite local con migraciones versionadas. La propuesta inicial es una sola base por instalación con `company_id` en las tablas de negocio para soportar múltiples empresas sin sincronización.

Las operaciones financieras confirmadas deben ejecutarse en transacciones SQLite para mantener consistencia entre documentos comerciales, asientos contables y auditoría.

## Convenciones

- Claves primarias: `id` como UUID o ULID en texto.
- Fechas: ISO 8601 en UTC para timestamps; fechas contables como `YYYY-MM-DD`.
- Montos: enteros en unidad menor cuando sea posible, con `currency_code`; para CRC puede usarse escala 2 por consistencia contable.
- Estados: enums controlados en aplicación y constraints donde aplique.
- Eliminación: lógica para entidades críticas mediante `archived_at`, `voided_at`, `deleted_at` o estado.
- Auditoría: toda operación importante registra evento local.

## Tablas mínimas

### Configuración y seguridad

- `companies`
- `users`
- `roles`
- `user_roles`
- `settings`
- `fiscal_periods`
- `audit_events`

### Contabilidad

- `chart_of_accounts`
- `journal_entries`
- `journal_entry_lines`
- `sequence_counters`
- `tax_rates`

### Terceros y catálogo operativo

- `customers`
- `vendors`
- `products_services`
- `attachments`

### Ventas y cobros

- `invoices`
- `invoice_lines`
- `payments`

### Compras, gastos y pagos

- `expenses`
- `bills`
- `bill_lines`

### Banco y conciliación

- `bank_accounts`
- `bank_transactions`
- `bank_reconciliations`
- `bank_reconciliation_items`

### Respaldo

- `backups`

## Tablas adicionales recomendadas

- `document_events`: historial específico de documentos comerciales.
- `payment_allocations`: aplicación de pagos a facturas o cuentas por pagar.
- `account_balances_cache`: cache recalculable por período para reportes, si el rendimiento lo exige.
- `csv_import_batches`: trazabilidad de importaciones bancarias.
- `csv_import_rows`: filas importadas, errores y estado de confirmación.
- `reversal_links`: relación explícita entre asientos originales y reversos, si no se modela directamente en `journal_entries`.

## Entidades principales

### `companies`

Campos clave:

- `id`
- `legal_name`
- `display_name`
- `tax_id`
- `address`
- `base_currency`
- `secondary_currency`
- `fiscal_year_start_month`
- `accounting_method`
- `is_active`
- `archived_at`
- `created_at`
- `updated_at`

### `users`

Campos clave:

- `id`
- `company_id`
- `name`
- `username`
- `password_hash`
- `password_algorithm`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

No se guardan contraseñas en texto plano.

### `chart_of_accounts`

Campos clave:

- `id`
- `company_id`
- `code`
- `name`
- `type`
- `subtype`
- `parent_account_id`
- `is_active`
- `allows_posting`
- `currency_code`
- `created_at`
- `updated_at`

Tipos mínimos:

- Activo.
- Pasivo.
- Patrimonio.
- Ingreso.
- Costo de ventas.
- Gasto.

### `journal_entries`

Campos clave:

- `id`
- `company_id`
- `entry_number`
- `entry_date`
- `description`
- `reference`
- `source_type`
- `source_id`
- `status`
- `created_by_user_id`
- `confirmed_by_user_id`
- `created_at`
- `confirmed_at`
- `reversed_entry_id`

Estados:

- `draft`
- `confirmed`
- `reverted`

### `journal_entry_lines`

Campos clave:

- `id`
- `journal_entry_id`
- `account_id`
- `description`
- `debit_amount`
- `credit_amount`
- `currency_code`
- `line_order`

Reglas:

- No permitir débitos o créditos negativos.
- Una línea no debe tener débito y crédito simultáneamente.
- Un asiento confirmado requiere al menos dos líneas.
- La suma de débitos debe ser igual a la suma de créditos.

SQLite no puede garantizar fácilmente esta regla con un simple constraint de tabla; debe validarse en servicio de dominio y transacción, con pruebas unitarias.

### `invoices`

Campos clave:

- `id`
- `company_id`
- `customer_id`
- `invoice_number`
- `quote_id`
- `status`
- `issue_date`
- `due_date`
- `subtotal_amount`
- `discount_amount`
- `tax_amount`
- `total_amount`
- `paid_amount`
- `balance_due`
- `currency_code`
- `journal_entry_id`
- `created_by_user_id`
- `confirmed_at`
- `voided_at`

Estados:

- `draft`
- `confirmed`
- `partially_paid`
- `paid`
- `overdue`
- `voided`

### `payments`

Campos clave:

- `id`
- `company_id`
- `payment_type`
- `customer_id`
- `vendor_id`
- `payment_date`
- `amount`
- `currency_code`
- `deposit_account_id`
- `journal_entry_id`
- `status`
- `created_at`

La asignación a facturas o cuentas por pagar se modela con `payment_allocations`.

### `bank_transactions`

Campos clave:

- `id`
- `company_id`
- `bank_account_id`
- `transaction_date`
- `description`
- `amount`
- `currency_code`
- `external_reference`
- `fingerprint`
- `status`
- `journal_entry_id`
- `reconciled_at`
- `created_at`

El `fingerprint` ayuda a detectar duplicados en importaciones CSV.

## Integridad obligatoria

- Toda factura confirmada tiene `journal_entry_id`.
- Todo pago confirmado tiene `journal_entry_id`.
- Todo gasto confirmado tiene `journal_entry_id`.
- Todo asiento confirmado balancea débitos y créditos.
- Una factura anulada no recibe pagos nuevos.
- Un pago no puede superar el saldo pendiente salvo mecanismo explícito de anticipos.
- Los documentos comerciales mantienen referencia a sus asientos.
- Las claves foráneas deben estar activas con `PRAGMA foreign_keys = ON`.
- Las consultas de escritura críticas deben ejecutarse dentro de transacciones.

## Catálogo de cuentas inicial

El catálogo inicial para una pequeña empresa de servicios/comercio incluirá:

- Activo
  - Caja.
  - Bancos.
  - Cuentas por cobrar.
  - Inventario futuro.
  - Impuestos por cobrar, si aplica.
- Pasivo
  - Cuentas por pagar.
  - Impuestos por pagar.
  - Préstamos.
- Patrimonio
  - Capital.
  - Utilidades retenidas.
- Ingreso
  - Ventas de servicios.
  - Ventas de productos.
- Costo de ventas
  - Costo de productos vendidos.
- Gasto
  - Alquiler.
  - Servicios públicos.
  - Sueldos como clasificación futura no nómina.
  - Honorarios.
  - Transporte.
  - Gastos administrativos.

## Reportes derivados

Los reportes se generarán desde asientos confirmados y documentos vinculados. La fuente contable primaria será `journal_entries` + `journal_entry_lines`, no totales editables en UI.
