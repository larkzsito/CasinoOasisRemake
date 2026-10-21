# Casino Oasis — Plataforma de Juegos Casino React

Plataforma interactiva de juegos de casino en línea construida con React + Vite + TypeScript y desacoplada de Firebase.

---

## 🚀 Inicio Rápido

### 1. Clonar e Instalar Dependencias

```bash
git clone <URL_DEL_REPOSITORIO>
cd CasinoOasisRemake
npm install
```

### 2. Configurar la Base de Datos

El proyecto está preparado para conectarse a cualquier servidor o base de datos externa a través de su cliente de API REST:

1. Crea un archivo `.env` en la raíz (puedes duplicar `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Configura la URL de tu base de datos / API y tu correo de administrador en `.env`:
   ```env
   # Endpoint de tu servidor de base de datos
   VITE_DATABASE_URL=http://localhost:4000/api

   # Correo que tendrá permisos de Administrador (/admin)
   VITE_ADMIN_EMAIL=tu-correo@ejemplo.com
   ```

---

## 👑 Cómo Volverse Administrador y Acceder al Panel (/admin)

Para tener privilegios de administrador y gestionar el modo de mantenimiento y anuncios:

1. **Establece tu correo de administrador en `.env`:**
   ```env
   VITE_ADMIN_EMAIL=tu-correo@ejemplo.com
   ```
2. **Inicia el servidor de base de datos y la aplicación:**
   ```bash
   npm run server
   npm run dev
   ```
3. **Crea tu cuenta o inicia sesión:**
   Ve a la pantalla de **Entrar / Registrarse** en el casino e introduce exactamente el correo que definiste en `VITE_ADMIN_EMAIL`.
4. **Accede al Panel de Control:**
   - La plataforma detectará automáticamente tu email y habilitará el botón **"Panel de Administración"** con un icono de corona en la barra superior del Lobby.
   - O puedes navegar directamente a la URL: `http://localhost:5173/admin`
5. **Funciones del Administrador:**
   - Activar y desactivar el **Modo Mantenimiento** en tiempo real (bloquea el acceso a los demás usuarios mientras tú sigues teniendo acceso total).
   - Programar un temporizador de mantenimiento con cuenta regresiva en vivo (desactivación automática).
   - Personalizar el mensaje de mantenimiento y anuncios globales para todos los visitantes.

---

## 🗄️ Servidor de Base de Datos Incluido

El proyecto incluye un servidor de base de datos listo para usar en Node.js que gestiona usuarios, saldos, chat en vivo y ajustes globales:

```bash
# Iniciar servidor de base de datos (Puerto 4000)
npm run server
```

El servidor creará automáticamente su base de datos local en `server/data/database.json`. También puedes conectar tu propia base de datos (PostgreSQL, MySQL, MongoDB, Supabase, SQLite, etc.) adaptando las rutas en `server/server.js` o apuntando `VITE_DATABASE_URL` a tu propio backend.

---

## 💻 Ejecutar la Aplicación Web

En una terminal ejecuta el servidor de base de datos y en otra la aplicación frontend:

```bash
# Terminal 1: Iniciar base de datos
npm run server

# Terminal 2: Iniciar frontend
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

---

## 📁 Estructura del Proyecto

- `server/server.js` — Servidor de base de datos y API REST autónomo
- `src/services/` — Capa de servicios y cliente de base de datos:
  - `database.ts`: Cliente de conexión HTTP y comprobación de estado de la BD
  - `authService.ts`: Registro, login, sesiones y recuperación de contraseñas
  - `userService.ts`: Gestión de perfiles, saldos en COP y monto apostado
  - `chatService.ts`: Chat multijugador con salas general y VIP
  - `siteSettingsService.ts`: Modo mantenimiento y configuración del sitio
  - `recentWinsService.ts`: Registro en vivo de premios de jugadores
- `src/components/` — Componentes React (Lobby, Juegos, Auth, Admin, etc.)
- `src/styles.css` — Estilos de la plataforma

---

## 🔒 Privacidad y Seguridad

- Sin dependencia de Firebase ni credenciales privadas en el repositorio.
- Todos los archivos `.env` y bases de datos locales están protegidos en `.gitignore`.
