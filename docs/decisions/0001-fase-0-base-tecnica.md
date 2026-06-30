# ADR 0001: Base tecnica inicial

## Contexto

LedgerLocal necesita una base de escritorio local-first con React, TypeScript estricto, Tauri v2, pruebas, linting y una estructura feature-based antes de implementar reglas de negocio.

## Decision

Se creo el scaffold inicial con:

- React + Vite + TypeScript strict.
- Tailwind CSS local.
- ESLint flat config.
- Prettier.
- Vitest.
- Tauri v2 en `src-tauri`.
- Estructura feature-based en `src/modules`.
- Configuracion central del producto en `src/app/config/product.ts`.
- UI inicial de escritorio sin datos financieros simulados.
- Prueba unitaria inicial para validacion de asientos balanceados.

## Consecuencias

- La interfaz web puede compilarse y probarse sin Rust.
- Tauri queda preparado, pero no puede ejecutarse hasta instalar Rust/Cargo.
- Vitest usa `--configLoader runner` porque el loader por defecto con esbuild falla en esta ruta de OneDrive/sandbox.
- Vite preview usa `--configLoader runner` por el mismo motivo.
- El servidor dev de Vite aun requiere investigar el escaneo de dependencias en esta ruta; el build y preview funcionan.
- Los comandos deben ejecutarse como `npm.cmd` en PowerShell cuando la politica local bloquee `npm.ps1`.

## Alternativas consideradas

- Usar un generador automatico de Tauri: se evito para mantener control en un workspace vacio y por la ausencia de Rust/Cargo.
- Usar Electron: descartado porque la arquitectura preferida es Tauri v2.
- Usar datos mock de dashboard: descartado para no aparentar informacion financiera real.
