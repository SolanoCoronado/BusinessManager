# Guía de instalación — LedgerLocal

> Guía para instalar y arrancar LedgerLocal en la computadora del negocio.
> No se requiere experiencia técnica avanzada; sigue los pasos en orden.
> Si algo falla, ve a la sección "Solución de problemas" al final.

---

## Requisitos previos

### 1. Node.js

Node.js es el motor que corre el servidor de LedgerLocal.

1. Ve a [https://nodejs.org](https://nodejs.org) y descarga la versión **LTS** (la que dice "Recommended for most users").
2. Ejecuta el instalador. Acepta todas las opciones por defecto.
3. Cuando termine, abre una ventana de **Símbolo del sistema** (cmd) o **PowerShell** y escribe:
   ```
   node -v
   ```
   Si ves un número como `v20.x.x` o mayor, Node.js está instalado correctamente.

### 2. Git (opcional pero recomendado)

Git permite descargar y actualizar el código fácilmente.

1. Ve a [https://git-scm.com](https://git-scm.com) y descarga el instalador para Windows.
2. Instala con las opciones por defecto.

---

## Instalación

### Opción A — Con Git (recomendada)

Abre una ventana de **PowerShell** en la carpeta donde quieres instalar LedgerLocal (por ejemplo, `C:\Programas\`) y ejecuta:

```powershell
git clone <URL-del-repositorio> LedgerLocal
cd LedgerLocal
```

### Opción B — Sin Git

1. Descarga el archivo `.zip` del proyecto.
2. Extrae la carpeta en un lugar como `C:\Programas\LedgerLocal`.
3. Abre una ventana de **PowerShell** y navega a esa carpeta:
   ```powershell
   cd "C:\Programas\LedgerLocal"
   ```

---

## Configuración inicial

### 1. Instalar dependencias del proyecto

En la carpeta del proyecto, ejecuta:

```powershell
npm install
npm --prefix server install
```

Esto puede tardar 1-2 minutos la primera vez mientras se descargan los paquetes.

### 2. Crear el archivo de configuración del servidor

Copia el archivo de ejemplo:

```powershell
Copy-Item server\.env.example server\.env
```

Abre `server\.env` con el Bloc de notas y cambia la línea de `JWT_SECRET` por una frase larga y difícil de adivinar:

```
DATABASE_URL="file:./dev.db"
PORT=4310
JWT_SECRET="pon-aqui-una-frase-larga-y-dificil-de-adivinar-como-tu-negocio-nombre-2024"
```

> **Importante:** nunca compartas este archivo ni lo publiques en internet. Contiene el secreto que protege las sesiones de usuario.

### 3. Preparar la base de datos

```powershell
npm --prefix server run prisma:migrate
```

Este comando crea el archivo de base de datos (`server\prisma\dev.db`) con todas las tablas necesarias. Solo se necesita ejecutar una vez (o cada vez que actualices LedgerLocal a una versión nueva).

---

## Arrancar LedgerLocal

```powershell
npm run dev:all
```

Cuando veas mensajes como:

```
[api] Server listening at http://0.0.0.0:4310
[web] VITE ready in ...
[web] Local: http://localhost:5310/
```

...el sistema está corriendo. Abre tu navegador y ve a:

**http://localhost:5310**

La primera vez verás una pantalla para configurar el negocio y crear el usuario administrador.

---

## Acceder desde otros equipos de la red

Para que otros computadores en la misma red WiFi o LAN puedan acceder:

1. Averigua la dirección IP del equipo donde corre LedgerLocal:
   ```powershell
   ipconfig
   ```
   Busca la línea "Dirección IPv4" bajo tu conexión de red. Ejemplo: `192.168.1.15`.

2. Desde los otros equipos, abre el navegador y ve a:
   ```
   http://192.168.1.15:5310
   ```
   (Reemplaza `192.168.1.15` con la IP real de tu equipo.)

3. Si no conecta, puede que el firewall de Windows esté bloqueando el puerto 5310. Para abrirlo:
   - Busca "Firewall de Windows Defender" en el menú inicio.
   - Ve a "Configuración avanzada" → "Reglas de entrada" → "Nueva regla".
   - Tipo: Puerto. Protocolo TCP. Puerto específico: `5310` y `4310`.
   - Permite la conexión, aplica en todas las redes.

---

## Cómo respaldar los datos

LedgerLocal incluye una pantalla de respaldos (módulo "Respaldos" en el menú). Desde ahí puedes crear un respaldo con un clic.

El respaldo se guarda como un archivo `.db` en la carpeta `server\backups\` dentro de LedgerLocal. Copia esa carpeta regularmente a:
- Una memoria USB.
- Una carpeta de Google Drive o OneDrive (solo el archivo `.db`, no el código del proyecto).

**Restaurar:** desde la pantalla de Respaldos, selecciona el archivo a restaurar y confirma. El sistema guarda automáticamente una copia del estado actual antes de restaurar.

---

## Actualizaciones

Cuando haya una versión nueva de LedgerLocal:

```powershell
git pull          # descarga la actualización (solo con Opción A)
npm install
npm --prefix server install
npm --prefix server run prisma:migrate
npm run dev:all
```

Si usaste la Opción B (sin Git), descarga el nuevo `.zip`, extrae sobre la carpeta existente (sin borrar `server\.env` ni `server\prisma\dev.db`), y ejecuta los últimos tres comandos.

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|---------|
| `node` no se reconoce | Node.js no está instalado o el PATH no se actualizó | Reinicia la terminal después de instalar Node.js |
| Puerto en uso (`EADDRINUSE`) | Otro programa ya usa el puerto | Cambia `PORT` en `server\.env` a otro número (ej. 4311) y ajusta el proxy en `vite.config.ts` |
| "No se encontro el archivo de base de datos" en Respaldos | La base de datos no se creó | Ejecuta `npm --prefix server run prisma:migrate` |
| Página en blanco o error 502 | El servidor backend no está corriendo | Verifica que `npm run dev:all` sigue activo en la terminal |
| No conecta desde otro equipo | Firewall bloqueando | Abre los puertos 4310 y 5310 en el Firewall de Windows (ver sección anterior) |

---

## Dejar LedgerLocal corriendo en segundo plano (producción)

Para que LedgerLocal siga corriendo aunque cierres la terminal, usa un administrador de procesos como **PM2**:

```powershell
npm install -g pm2
# Primero construye el proyecto:
npm run build
# Inicia el servidor en segundo plano:
pm2 start "node dist/server.js" --name ledgerlocal --cwd server
# Para que arranque automáticamente al reiniciar:
pm2 startup
pm2 save
```

También necesitarás servir el frontend estático. Configura Nginx o usa el propio servidor Fastify para servir `dist/` — consulta la documentación de Fastify Static para configurarlo.

---

*Generado el 2026-06-30. Versión inicial del sistema LedgerLocal.*
