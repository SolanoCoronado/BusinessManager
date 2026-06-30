# LedgerLocal - Plan de planificación

## Estado del repositorio

El repositorio visible está vacío al iniciar esta fase. No existe todavía una aplicación React, Tauri, backend Rust, migraciones, pruebas ni documentación previa del producto.

Nota operativa: `git status` no pudo ejecutarse por un problema de permisos/ruta en OneDrive dentro del entorno actual. La inspección de archivos se realizó con listado directo del workspace y `rg --files`, sin encontrar archivos.

## Objetivo de esta fase

Definir la base técnica y funcional de LedgerLocal antes de escribir implementación. Esta fase produce documentos de arquitectura, seguridad, modelo de datos y roadmap para guiar el desarrollo por fases.

## Principios del producto

- Local-first real: los datos financieros viven en SQLite local.
- Sin nube, telemetría, CDN, fuentes remotas ni servicios externos en producción.
- Contabilidad de partida doble como núcleo, no como capa secundaria.
- Las operaciones confirmadas deben ser trazables, auditables y reversibles.
- UI profesional en español, enfocada en escritorio y accesibilidad por teclado.
- Preparado para Costa Rica sin afirmar cumplimiento fiscal oficial.
- Arquitectura extensible para módulos futuros como facturación electrónica, nómina o sincronización opcional.

## MVP de la primera versión funcional

El MVP debe permitir:

- Crear y administrar empresas locales.
- Crear usuarios locales y asignar roles.
- Configurar catálogo de cuentas inicial, impuestos, moneda y período fiscal.
- Registrar clientes, proveedores, productos y servicios.
- Crear, confirmar, anular y duplicar facturas.
- Registrar pagos parciales o totales de facturas.
- Registrar gastos pagados y cuentas por pagar.
- Generar asientos automáticos vinculados a documentos comerciales.
- Crear asientos manuales balanceados.
- Importar movimientos bancarios por CSV con vista previa y validación.
- Realizar una conciliación bancaria simple.
- Consultar estado de resultados, balance general, balance de comprobación y reportes operativos iniciales.
- Exportar reportes a CSV y PDF local.
- Crear y restaurar respaldos locales.
- Revisar auditoría local.
- Usar la aplicación sin conexión permanente.

## Fuera del MVP

Quedan para versiones futuras:

- Nómina.
- Integración bancaria automática.
- Facturación electrónica oficial.
- Envío automático de correos.
- Multiusuario simultáneo por red.
- Aplicación móvil.
- Sincronización en nube.
- Inteligencia artificial.
- Conexiones directas con Hacienda, bancos o terceros.
- Inventario físico completo.
- Cifrado SQLCipher completo si las dependencias nativas no quedan listas en la primera base técnica; la arquitectura sí debe dejar el punto de extensión.

## Estructura inicial propuesta

```text
src/
  app/
    components/
    config/
    layouts/
    providers/
    routes/
  modules/
    accounting/
    audit/
    auth/
    backups/
    banking/
    bills/
    companies/
    customers/
    dashboard/
    expenses/
    invoices/
    payments/
    products/
    reconciliation/
    reports/
    settings/
    vendors/
  shared/
    components/
    constants/
    hooks/
    lib/
    types/
    utils/
  tests/
src-tauri/
  capabilities/
  migrations/
  src/
    commands/
    db/
    domain/
    security/
    services/
docs/
  decisions/
  testing/
```

Cada módulo de `src/modules/<feature>` usará, cuando aplique:

```text
components/
hooks/
pages/
schemas/
services/
stores/
tests/
types/
```

## Fases de implementación

### Fase 0: Base técnica

- Crear proyecto Tauri v2 + React + Vite + TypeScript strict.
- Configurar Tailwind CSS, ESLint, Prettier y Vitest.
- Definir rutas, layout de escritorio, configuración de producto y constantes regionales.
- Establecer estructura feature-based.
- Agregar documentación de decisiones iniciales.

### Fase 1: Persistencia, empresas, usuarios y roles

- Integrar SQLite local desde Rust.
- Crear sistema de migraciones versionadas.
- Implementar empresas, configuración inicial, usuarios locales, roles y permisos.
- Registrar auditoría básica.

### Fase 2: Núcleo contable

- Implementar catálogo de cuentas.
- Crear motor de asientos de partida doble.
- Validar balance, reversión, bloqueo de asientos confirmados y cálculo de saldos.
- Agregar pruebas unitarias contables.

### Fase 3: Maestros operativos

- Clientes, proveedores, productos y servicios.
- Impuestos configurables.
- Configuración regional CRC/USD.

### Fase 4: Documentos comerciales

- Facturas, cotizaciones, pagos, gastos y cuentas por pagar.
- Generación de asientos automáticos.
- PDF local e impresión.

### Fase 5: Banco y conciliación

- Cuentas bancarias y caja.
- Movimientos manuales.
- Importación CSV con mapeo, validaciones y duplicados.
- Conciliación bancaria confirmable y auditable.

### Fase 6: Reportes

- Estado de resultados, balance general, balance de comprobación, libro diario y libro mayor.
- Reportes de cuentas por cobrar, cuentas por pagar, ventas, gastos, flujo de caja e impuestos.
- Exportación CSV/PDF.

### Fase 7: Seguridad, respaldos y restauración

- Respaldos locales.
- Validación y restauración segura.
- Preparación de cifrado con SQLCipher o mecanismo equivalente.
- Keychain del sistema operativo para secretos.
- Endurecimiento de permisos y auditoría.

### Fase 8: E2E, accesibilidad y empaquetado

- Playwright para flujo completo mínimo.
- Revisión de accesibilidad por teclado.
- Documentación de instalación y operación.
- Empaquetado local de escritorio.

## Riesgos técnicos

- Compatibilidad de SQLCipher con Tauri v2 y empaquetado por sistema operativo.
- Manejo seguro de claves locales sin degradar recuperación de respaldos.
- Complejidad de reglas contables al mezclar facturas, pagos, anulaciones y reversos.
- Exportación PDF local consistente sin dependencias externas.
- Pruebas E2E de Tauri pueden requerir configuración específica del entorno.
- OneDrive puede introducir problemas de permisos, locking o rutas largas durante desarrollo.

## Decisiones pendientes

- Elegir crate SQLite: `rusqlite`, `sqlx` con SQLite o plugin oficial/comunitario de Tauri.
- Definir estrategia final de cifrado: SQLCipher directo, cifrado de respaldo solamente al inicio o capa de almacenamiento cifrada.
- Elegir mecanismo de keychain: plugin Tauri, crate nativo o integración por plataforma.
- Decidir si TanStack Query aporta valor para operaciones locales o si basta un servicio local tipado con estado React.
- Definir herramienta de PDF local: render HTML a PDF, librería Rust o generación desde frontend.
- Definir si el modo multiempresa usa una sola base con `company_id` o un archivo SQLite por empresa.

## Suposiciones iniciales

- La primera versión se instala y usa en un solo computador.
- Un usuario administrador local existe por empresa o instalación.
- Se usará una sola base SQLite local con `company_id` obligatorio en entidades de negocio, salvo tablas globales como roles base y configuración de instalación.
- El producto no hará llamadas de red en producción.
- Los documentos contables confirmados se corrigen por reversión o ajuste, no por edición directa.
