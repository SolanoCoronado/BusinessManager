# LedgerLocal - Roadmap

## Estado actual

Fase 0 iniciada y base tecnica frontend completada. El proyecto ya contiene scaffold React + Vite + TypeScript strict, Tailwind CSS, ESLint, Prettier, Vitest, estructura feature-based y cascaron Tauri v2.

Validaciones actuales:

- `npm.cmd run lint`: pasa.
- `npm.cmd run test`: pasa, 1 archivo de pruebas y 2 pruebas.
- `npm.cmd run build`: pasa.
- `npm.cmd run format`: pasa.

Fallos o bloqueos encontrados:

- `git status` fallo por permisos/ruta de OneDrive en el entorno.
- `rustc` y `cargo` no estan disponibles, por lo que Tauri no puede ejecutarse ni compilarse todavia.
- `npm run ...` puede fallar en PowerShell por bloqueo de `npm.ps1`; usar `npm.cmd run ...`.
- Vitest con el loader por defecto fallo al resolver config en OneDrive/sandbox; se configuro `--configLoader runner`.
- `npm.cmd run dev` arranca Vite, pero en este entorno falla despues durante el escaneo de dependencias por permisos al resolver paquetes en `node_modules`.
- `npm.cmd run preview -- --host 127.0.0.1 --port 4173` funciona sobre el build generado y responde HTTP 200.
- `npm install` reporto 1 vulnerabilidad baja, pero `npm audit` no se completo: la consulta externa fue bloqueada por privacidad/riesgo de enviar metadatos del proyecto.

## Fase 0: Base técnica

Objetivo: crear la base ejecutable del proyecto.

Entregables:

- Tauri v2 + React + Vite. Estado: parcial; scaffold creado, pendiente Rust/Cargo para ejecutar Tauri.
- TypeScript strict. Estado: completado.
- Tailwind CSS local. Estado: completado.
- ESLint + Prettier. Estado: completado.
- Vitest. Estado: completado.
- Estructura feature-based. Estado: completado.
- Configuración central de producto `LedgerLocal`. Estado: completado.
- Layout de escritorio y rutas base. Estado: parcial; layout inicial creado, rutas formales pendientes.
- Documentación de comandos de desarrollo. Estado: completado en este roadmap y ADR 0001.

Criterio de salida:

- `npm.cmd run lint` pasa.
- `npm.cmd run test` pasa.
- `npm.cmd run build` pasa.
- La app web compilada abre localmente sin depender de internet mediante preview.
- Tauri queda pendiente hasta instalar Rust/Cargo.

## Fase 1: Base de datos, empresas, usuarios y roles

Entregables:

- SQLite local desde Rust.
- Migraciones versionadas.
- Empresas.
- Onboarding inicial.
- Usuarios locales.
- Roles y permisos.
- Auditoría básica.

Criterio de salida:

- Crear empresa local.
- Crear usuario administrador.
- Iniciar sesión local.
- Cambiar empresa activa.
- Pruebas unitarias de permisos por rol.

## Fase 2: Núcleo contable

Entregables:

- Catálogo de cuentas jerárquico.
- Catálogo inicial para pequeña empresa.
- Diario general.
- Validación de asientos balanceados.
- Confirmación, reversión y bloqueo de edición.
- Cálculo de saldo de cuenta.

Criterio de salida:

- Crear asiento manual balanceado.
- Rechazar asiento desbalanceado.
- Revertir asiento confirmado mediante asiento inverso.
- Pruebas unitarias contables pasan.

## Fase 3: Maestros operativos

Entregables:

- Clientes.
- Proveedores.
- Productos y servicios.
- Impuestos configurables.
- Configuración CRC/USD y formato regional.

Criterio de salida:

- Crear cliente, proveedor y producto.
- Asociar cuentas contables e impuestos.
- Validaciones y estados vacíos implementados.

## Fase 4: Facturas, pagos, gastos y cuentas por pagar

Entregables:

- Cotizaciones y facturas.
- Confirmación de facturas con asiento automático.
- Pagos parciales y totales.
- Gastos pagados.
- Facturas de proveedor y cuentas por pagar.
- Anulación auditable.
- PDF local inicial.

Criterio de salida:

- Crear y confirmar factura.
- Registrar pago parcial.
- Registrar gasto.
- Registrar cuenta por pagar y pago.
- Ver asientos vinculados.

## Fase 5: Banco, CSV y conciliación

Entregables:

- Cuentas bancarias y caja.
- Movimientos manuales.
- Importación CSV con preview y mapeo.
- Detección básica de duplicados.
- Conciliación bancaria.

Criterio de salida:

- Importar CSV.
- Cancelar antes de confirmar.
- Confirmar movimientos válidos.
- Conciliar cuenta con diferencia visible.

## Fase 6: Reportes financieros

Entregables:

- Estado de resultados.
- Balance general.
- Balance de comprobación.
- Libro diario.
- Libro mayor.
- Cuentas por cobrar por antigüedad.
- Cuentas por pagar por antigüedad.
- Ventas por cliente.
- Gastos por categoría.
- Flujo de caja básico.
- Resumen de impuestos.
- Exportación CSV y PDF.

Criterio de salida:

- Reportes filtran por empresa y rango de fechas.
- Totales y subtotales claros.
- Exportación local funcional.

## Fase 7: Auditoría, respaldos y seguridad

Entregables:

- Auditoría completa.
- Respaldos locales.
- Restauración validada.
- Copia previa antes de restaurar.
- Historial de respaldos.
- Preparación o activación de cifrado.
- Keychain para secretos.

Criterio de salida:

- Crear respaldo.
- Restaurar en empresa de prueba.
- Registrar auditoría.
- No afirmar cifrado hasta verificarlo.

## Fase 8: E2E, accesibilidad y empaquetado

Entregables:

- Flujo E2E mínimo.
- Revisión de accesibilidad por teclado.
- Estados de error, vacío y carga.
- Documentación de instalación.
- Empaquetado local.

Criterio de salida:

- E2E cubre crear empresa, cliente, producto, factura, pago, asiento, reporte, respaldo y restauración.
- App usable sin internet.
- Build de escritorio generado.

## Deudas técnicas conocidas

- Definir proveedor exacto de SQLite/cifrado.
- Confirmar estrategia de PDF.
- Confirmar estrategia de keychain.
- Ajustar pruebas E2E según soporte real de Tauri en el entorno.
- Diseñar mecanismo futuro de facturación electrónica sin mezclarlo con MVP.

## Comandos esperados cuando exista implementación

Estos comandos se concretarán en Fase 0:

```bash
npm install
npm.cmd run dev
npm.cmd run tauri dev
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```
