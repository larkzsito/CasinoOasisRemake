// ========================================================
// SERVICIO DE AUTENTICACIÓN — CASINO OASIS
// ========================================================
import { apiRequest } from "./database";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role?: string;
  token?: string;
}

type AuthListener = (user: User | null) => void;
const authListeners: Set<AuthListener> = new Set();

let currentUser: User | null = null;

// Inicializar sesión desde almacenamiento local
try {
  const savedUser = localStorage.getItem("oasis_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
  }
} catch {
  currentUser = null;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function onAuthStateChanged(callback: AuthListener): () => void {
  authListeners.add(callback);
  callback(currentUser);
  return () => {
    authListeners.delete(callback);
  };
}

function notifyAuthChange(user: User | null) {
  currentUser = user;
  if (user) {
    localStorage.setItem("oasis_user", JSON.stringify(user));
    if (user.token) {
      localStorage.setItem("oasis_auth_token", user.token);
    }
  } else {
    localStorage.removeItem("oasis_user");
    localStorage.removeItem("oasis_auth_token");
  }
  authListeners.forEach((fn) => fn(currentUser));
}

/**
 * Iniciar sesión con email y contraseña en la base de datos
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const data = await apiRequest<{ user: User; token?: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password: pass }),
  });

  const loggedUser: User = {
    uid: data.user.uid,
    email: data.user.email,
    displayName: data.user.displayName || email.split("@")[0],
    role: data.user.role || "player",
    token: data.token || data.user.token,
  };

  notifyAuthChange(loggedUser);
  return loggedUser;
}

/**
 * Registro de nuevo usuario en la base de datos
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<User> {
  const data = await apiRequest<{ user: User; token?: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password: pass,
      displayName: displayName.trim() || email.split("@")[0],
    }),
  });

  const newUser: User = {
    uid: data.user.uid,
    email: data.user.email,
    displayName: data.user.displayName,
    role: data.user.role || "player",
    token: data.token || data.user.token,
  };

  notifyAuthChange(newUser);
  return newUser;
}

/**
 * Cerrar sesión
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Si el servidor está apagado o falla la red, cerramos de todos modos localmente
  } finally {
    notifyAuthChange(null);
  }
}

/**
 * Enviar solicitud de restablecimiento de contraseña
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await apiRequest("/auth/reset-password/request", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

/**
 * Verificar token de restablecimiento de contraseña
 */
export async function verifyResetToken(token: string): Promise<string> {
  const res = await apiRequest<{ email: string }>("/auth/reset-password/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return res.email;
}

/**
 * Confirmar nueva contraseña con el token
 */
export async function confirmNewPassword(token: string, newPassword: string): Promise<void> {
  await apiRequest("/auth/reset-password/confirm", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

/**
 * Mapeo de errores de autenticación a mensajes legibles
 */
export function mapAuthError(err: any): string {
  const msg = err?.message || "";
  if (msg.includes("Failed to fetch") || msg.includes("No se pudo conectar")) {
    return "Error de conexión: No se pudo contactar con el servidor de base de datos. Por favor verifica que tu servidor esté encendido.";
  }
  if (msg.includes("Invalid credentials") || msg.includes("incorrect")) {
    return "Correo o contraseña incorrectos.";
  }
  if (msg.includes("already in use") || msg.includes("ya existe") || msg.includes("ya está registrado")) {
    return "Este correo ya está registrado. Por favor inicia sesión.";
  }
  if (msg.includes("weak") || msg.includes("al menos 6")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return msg || "Ocurrió un error al procesar la solicitud.";
}
