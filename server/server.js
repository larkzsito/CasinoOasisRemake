/**
 * ========================================================
 * SERVIDOR DE BASE DE DATOS Y API REST — CASINO OASIS
 * ========================================================
 * Servidor autónomo en Node.js que gestiona autenticación,
 * saldos de usuarios, chat en vivo, ganancias y ajustes globales.
 * 
 * Ejecución:
 *   npm run server
 * ========================================================
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const DB_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DB_DIR, "database.json");

// Crear directorio de datos si no existe
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Estructura inicial de la base de datos
const initialDb = {
  users: {},
  settings: {
    maintenanceMode: false,
    maintenanceMessage:
      "Estamos realizando labores de mantenimiento y mejoras en la plataforma. Volveremos a estar disponibles muy pronto.",
    maintenanceEndTime: null,
    updatedAt: Date.now(),
    updatedBy: process.env.ADMIN_EMAIL || "admin@oasis.com",
  },
  chat: {
    general: [],
    vip: [],
  },
  wins: [],
  resetTokens: {},
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return { ...initialDb, ...JSON.parse(content) };
    }
  } catch (err) {
    console.error("[DB] Error al leer base de datos, inicializando nueva:", err);
  }
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Error al guardar en disco:", err);
  }
}

let db = loadDatabase();

// Helper para parsear JSON de la petición
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2e6) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Manejo de CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    // Health check
    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        status: "ok",
        message: "Servidor de base de datos Casino Oasis activo",
        timestamp: Date.now(),
      });
    }

    // ----------------------------------------------------
    // AUTH: REGISTRO
    // ----------------------------------------------------
    if (pathname === "/api/auth/register" && req.method === "POST") {
      const { email, password, displayName } = await parseBody(req);
      if (!email || !password) {
        return sendJson(res, 400, { message: "Email y contraseña requeridos" });
      }

      const cleanEmail = email.toLowerCase().trim();
      const userExists = Object.values(db.users).find((u) => u.email.toLowerCase() === cleanEmail);
      if (userExists) {
        return sendJson(res, 400, { message: "Este correo ya está registrado" });
      }

      const uid = `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const token = crypto.randomBytes(32).toString("hex");

      const newUser = {
        uid,
        email: cleanEmail,
        passwordHash: crypto.createHash("sha256").update(password).digest("hex"),
        displayName: displayName || cleanEmail.split("@")[0],
        balance: 10000, // Bono de bienvenida
        wagered: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      db.users[uid] = newUser;
      saveDatabase(db);

      const { passwordHash: _, ...userProfile } = newUser;
      return sendJson(res, 201, { user: userProfile, token });
    }

    // ----------------------------------------------------
    // AUTH: LOGIN
    // ----------------------------------------------------
    if (pathname === "/api/auth/login" && req.method === "POST") {
      const { email, password } = await parseBody(req);
      const cleanEmail = (email || "").toLowerCase().trim();
      const inputHash = crypto.createHash("sha256").update(password || "").digest("hex");

      const user = Object.values(db.users).find((u) => u.email.toLowerCase() === cleanEmail);
      if (!user || user.passwordHash !== inputHash) {
        return sendJson(res, 401, { message: "Correo o contraseña incorrectos" });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const { passwordHash: _, ...userProfile } = user;
      return sendJson(res, 200, { user: userProfile, token });
    }

    // ----------------------------------------------------
    // AUTH: LOGOUT
    // ----------------------------------------------------
    if (pathname === "/api/auth/logout" && req.method === "POST") {
      return sendJson(res, 200, { ok: true });
    }

    // ----------------------------------------------------
    // AUTH: RESET PASSWORD
    // ----------------------------------------------------
    if (pathname === "/api/auth/reset-password/request" && req.method === "POST") {
      const { email } = await parseBody(req);
      const cleanEmail = (email || "").toLowerCase().trim();
      const user = Object.values(db.users).find((u) => u.email.toLowerCase() === cleanEmail);

      if (user) {
        const token = crypto.randomBytes(24).toString("hex");
        db.resetTokens[token] = {
          email: cleanEmail,
          expiresAt: Date.now() + 30 * 60 * 1000, // 30 min
        };
        saveDatabase(db);
        console.log(`[PasswordReset] Token generado para ${cleanEmail}: ${token}`);
      }
      return sendJson(res, 200, { ok: true, message: "Enlace enviado si el correo existe" });
    }

    if (pathname === "/api/auth/reset-password/verify" && req.method === "POST") {
      const { token } = await parseBody(req);
      const record = db.resetTokens[token];
      if (!record || Date.now() > record.expiresAt) {
        return sendJson(res, 400, { message: "El enlace es inválido o ha expirado" });
      }
      return sendJson(res, 200, { ok: true, email: record.email });
    }

    if (pathname === "/api/auth/reset-password/confirm" && req.method === "POST") {
      const { token, newPassword } = await parseBody(req);
      const record = db.resetTokens[token];
      if (!record || Date.now() > record.expiresAt) {
        return sendJson(res, 400, { message: "El enlace es inválido o ha expirado" });
      }

      const user = Object.values(db.users).find((u) => u.email.toLowerCase() === record.email);
      if (!user) {
        return sendJson(res, 404, { message: "Usuario no encontrado" });
      }

      user.passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
      user.updatedAt = Date.now();
      delete db.resetTokens[token];
      saveDatabase(db);

      return sendJson(res, 200, { ok: true, message: "Contraseña actualizada exitosamente" });
    }

    // ----------------------------------------------------
    // USUARIOS: OBTENER Y ACTUALIZAR
    // ----------------------------------------------------
    const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && req.method === "GET") {
      const uid = decodeURIComponent(userMatch[1]);
      const user = db.users[uid];
      if (!user) {
        return sendJson(res, 404, { message: "Usuario no encontrado" });
      }
      const { passwordHash: _, ...profile } = user;
      return sendJson(res, 200, profile);
    }

    const syncMatch = pathname.match(/^\/api\/users\/([^/]+)\/sync$/);
    if (syncMatch && req.method === "POST") {
      const uid = decodeURIComponent(syncMatch[1]);
      const body = await parseBody(req);
      if (!db.users[uid]) {
        db.users[uid] = {
          uid,
          email: body.email || "",
          displayName: body.displayName || "Jugador Oasis",
          balance: body.balance || 10000,
          wagered: body.wagered || 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveDatabase(db);
      }
      const { passwordHash: _, ...profile } = db.users[uid];
      return sendJson(res, 200, profile);
    }

    const balanceMatch = pathname.match(/^\/api\/users\/([^/]+)\/balance$/);
    if (balanceMatch && req.method === "PUT") {
      const uid = decodeURIComponent(balanceMatch[1]);
      const { balance, addedWager } = await parseBody(req);
      if (db.users[uid]) {
        db.users[uid].balance = balance;
        if (addedWager) {
          db.users[uid].wagered = (db.users[uid].wagered || 0) + addedWager;
        }
        db.users[uid].updatedAt = Date.now();
        saveDatabase(db);
        const { passwordHash: _, ...profile } = db.users[uid];
        return sendJson(res, 200, profile);
      }
      return sendJson(res, 404, { message: "Usuario no encontrado" });
    }

    // ----------------------------------------------------
    // AJUSTES DEL SITIO Y MANTENIMIENTO
    // ----------------------------------------------------
    if (pathname === "/api/settings" && req.method === "GET") {
      return sendJson(res, 200, db.settings);
    }

    if (pathname === "/api/settings" && req.method === "PUT") {
      const updates = await parseBody(req);
      db.settings = {
        ...db.settings,
        ...updates,
        updatedAt: Date.now(),
      };
      saveDatabase(db);
      return sendJson(res, 200, db.settings);
    }

    // ----------------------------------------------------
    // CHAT (GENERAL Y VIP)
    // ----------------------------------------------------
    const chatMatch = pathname.match(/^\/api\/chat\/(general|vip)$/);
    if (chatMatch) {
      const channel = chatMatch[1];
      if (req.method === "GET") {
        const now = Date.now();
        // Filtrar mensajes de menos de 3 minutos
        const fresh = (db.chat[channel] || []).filter((m) => now - (m.createdAt || 0) <= 180000);
        return sendJson(res, 200, fresh);
      }

      if (req.method === "POST") {
        const msg = await parseBody(req);
        const newMsg = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ...msg,
          channel,
          createdAt: Date.now(),
        };

        if (!db.chat[channel]) db.chat[channel] = [];
        db.chat[channel].push(newMsg);

        // Mantener últimos 60 mensajes en memoria
        if (db.chat[channel].length > 60) {
          db.chat[channel] = db.chat[channel].slice(-60);
        }
        saveDatabase(db);
        return sendJson(res, 201, newMsg);
      }
    }

    // ----------------------------------------------------
    // GANANCIAS RECIENTES
    // ----------------------------------------------------
    if (pathname === "/api/wins" && req.method === "GET") {
      return sendJson(res, 200, db.wins || []);
    }

    if (pathname === "/api/wins" && req.method === "POST") {
      const win = await parseBody(req);
      const newWin = {
        id: `win_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...win,
        createdAt: Date.now(),
      };
      db.wins = [newWin, ...(db.wins || [])].slice(0, 20);
      saveDatabase(db);
      return sendJson(res, 201, newWin);
    }

    // Ruta no encontrada
    return sendJson(res, 404, { message: `Ruta ${pathname} no encontrada` });
  } catch (err) {
    console.error("[Servidor Error]", err);
    return sendJson(res, 500, { message: "Error interno del servidor", error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n🎰 Servidor de Base de Datos Casino Oasis ejecutándose en http://localhost:${PORT}`);
  console.log(`📡 Endpoint de API: http://localhost:${PORT}/api`);
  console.log(`💾 Base de datos local: ${DB_FILE}\n`);
});
