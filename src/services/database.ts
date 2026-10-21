// ========================================================
// CLIENTE DE BASE DE DATOS Y API CENTRAL — CASINO OASIS
// ========================================================

export const DATABASE_URL = (
  import.meta.env.VITE_DATABASE_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

export type DbStatus = "connected" | "connecting" | "disconnected";

let currentStatus: DbStatus = "connecting";
const listeners: Set<(status: DbStatus) => void> = new Set();

export function getDbStatus(): DbStatus {
  return currentStatus;
}

export function subscribeDbStatus(listener: (status: DbStatus) => void): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

function setDbStatus(newStatus: DbStatus) {
  if (currentStatus !== newStatus) {
    currentStatus = newStatus;
    listeners.forEach((l) => l(newStatus));
  }
}

/**
 * Realiza peticiones a la API del servidor de base de datos
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${DATABASE_URL}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = localStorage.getItem("oasis_auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.message) {
          errorMsg = errorJson.message;
        }
      } catch {
        // Ignorar si el cuerpo no es JSON
      }
      throw new Error(errorMsg);
    }

    setDbStatus("connected");
    return await res.json();
  } catch (err: any) {
    // Si la conexión falla por servidor caído o URL incorrecta
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      setDbStatus("disconnected");
      throw new Error(
        `No se pudo conectar a la base de datos en (${DATABASE_URL}). Asegúrate de iniciar tu servidor de base de datos.`
      );
    }
    throw err;
  }
}

/**
 * Comprueba el estado de la base de datos
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${DATABASE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      setDbStatus("connected");
      return true;
    }
    setDbStatus("disconnected");
    return false;
  } catch {
    setDbStatus("disconnected");
    return false;
  }
}
