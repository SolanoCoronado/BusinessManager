# LedgerLocal - Seguridad y privacidad

## Principio central

LedgerLocal debe funcionar sin conexión y sin enviar información financiera a terceros. La seguridad se basa en reducir superficie de red, validar entradas, proteger secretos locales y mantener trazabilidad completa.

## Privacidad

- No usar servicios cloud para datos.
- No usar telemetría, analítica, crash reporting remoto ni heatmaps.
- No cargar assets desde CDN.
- No realizar solicitudes de red en producción.
- No incluir fuentes, íconos, scripts, estilos o imágenes remotas.
- Mantener toda información financiera en SQLite local y archivos locales seleccionados por el usuario.

## Almacenamiento local

La base de datos será SQLite. La arquitectura debe permitir cifrado mediante SQLCipher o mecanismo equivalente.

Estrategia por etapas:

1. Fase inicial: SQLite local con permisos mínimos, migraciones y transacciones.
2. Preparación: abstracción de conexión para reemplazar SQLite estándar por SQLCipher.
3. Cifrado: activar SQLCipher o alternativa equivalente cuando la integración nativa y empaquetado estén verificados.
4. Respaldos: permitir respaldos cifrados cuando la gestión de claves esté disponible.

No se debe afirmar que la base está cifrada hasta que el cifrado esté realmente implementado y probado.

## Secretos y contraseñas

- Nunca guardar contraseñas en texto plano.
- Usar hash de contraseña con algoritmo moderno, sal y parámetros documentados.
- Guardar claves de cifrado y secretos en keychain/almacenamiento seguro del sistema operativo.
- Evitar secretos en archivos de configuración del proyecto.
- No registrar valores sensibles en logs.

## Control de acceso

Roles iniciales:

- Administrador: acceso completo.
- Contador: asientos, reportes, conciliaciones y ajustes.
- Operador: facturas, clientes, gastos y pagos.
- Solo lectura: consulta y reportes sin modificaciones.

Toda mutación sensible debe verificar permisos en el backend Rust, no solo en UI.

## Validación

- Zod valida formularios y DTOs en frontend.
- Rust valida nuevamente los comandos recibidos.
- Consultas siempre parametrizadas.
- Constraints e índices refuerzan integridad en SQLite.
- Nunca confiar en campos calculados enviados por la UI para totales contables finales.

## Auditoría

Eventos mínimos:

- Inicio de sesión.
- Creación de usuarios.
- Cambios de permisos.
- Creación, edición, confirmación, anulación y reversión de documentos.
- Restauración de respaldos.
- Eliminación lógica.
- Cambios de configuración.
- Exportaciones de datos.

Campos:

- Fecha y hora.
- Usuario.
- Tipo de acción.
- Entidad afectada.
- Identificador de entidad.
- Valor anterior resumido.
- Valor nuevo resumido.
- Motivo, si aplica.

## Reglas de inmutabilidad contable

- Un asiento confirmado no se edita directamente.
- Las correcciones se hacen mediante reversión o asiento de ajuste.
- Las eliminaciones de registros contables críticos son lógicas o reversibles.
- Las conciliaciones confirmadas quedan bloqueadas.
- Reabrir conciliaciones requiere rol Administrador o Contador y genera auditoría.

## Respaldos y restauración

La restauración es una operación de alto riesgo:

- Validar archivo antes de restaurar.
- Crear respaldo previo automáticamente.
- Restaurar en nueva empresa por defecto.
- Reemplazar empresa existente solo con confirmación fuerte.
- Registrar auditoría de respaldo y restauración.
- Mantener historial local de respaldos.

## Superficie de red

Producción debe bloquear dependencias de red por diseño:

- Sin llamadas HTTP automáticas.
- Sin SDKs externos.
- Sin assets remotos.
- Sin actualizaciones silenciosas no documentadas.

Integraciones futuras deben ser:

- Opcionales.
- Desactivadas por defecto.
- Aprobadas explícitamente por el usuario.
- Documentadas con alcance de datos enviados.

## Advertencia fiscal

La aplicación debe mostrar una advertencia configurable en reportes y configuración:

LedgerLocal no afirma cumplimiento fiscal oficial y no reemplaza el criterio de un contador público autorizado ni asesoría profesional.
