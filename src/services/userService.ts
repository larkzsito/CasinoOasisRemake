// ========================================================
// SERVICIO DE USUARIOS Y BALANCE — CASINO OASIS
// ========================================================
import { apiRequest } from "./database";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  balance: number;
  wagered: number;
  createdAt?: any;
  updatedAt?: any;
}

export const INITIAL_BALANCE = 10000; // $10.000 COP bienvenida

// Cache local en memoria para actualizaciones rápidas de saldo
const profileCache = new Map<string, UserProfile>();
const profileListeners = new Map<string, Set<(p: UserProfile | null) => void>>();

/**
 * Obtener perfil de usuario desde la base de datos
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const profile = await apiRequest<UserProfile>(`/users/${encodeURIComponent(uid)}`);
    profileCache.set(uid, profile);
    notifyProfileSubscribers(uid, profile);
    return profile;
  } catch (error) {
    console.warn("[UserService] Error al consultar perfil:", error);
    return profileCache.get(uid) || null;
  }
}

/**
 * Sincroniza o crea el perfil en la base de datos
 */
export async function syncUserProfile(
  uid: string,
  initialData?: { email?: string | null; displayName?: string | null }
): Promise<UserProfile> {
  const fallbackProfile: UserProfile = {
    uid,
    email: initialData?.email || "",
    displayName: initialData?.displayName || initialData?.email?.split("@")[0] || "Jugador Oasis",
    balance: INITIAL_BALANCE,
    wagered: 0,
  };

  try {
    const profile = await apiRequest<UserProfile>(`/users/${encodeURIComponent(uid)}/sync`, {
      method: "POST",
      body: JSON.stringify(fallbackProfile),
    });
    profileCache.set(uid, profile);
    notifyProfileSubscribers(uid, profile);
    return profile;
  } catch (err) {
    console.warn("[UserService] No se pudo sincronizar perfil con la base de datos:", err);
    profileCache.set(uid, fallbackProfile);
    return fallbackProfile;
  }
}

/**
 * Actualiza el balance y el monto total apostado en la base de datos
 */
export async function updateUserBalanceAndWager(
  uid: string,
  newBalance: number,
  addedWager: number = 0
): Promise<void> {
  const current = profileCache.get(uid);
  const updated: UserProfile = {
    uid,
    email: current?.email || "",
    displayName: current?.displayName || "Jugador Oasis",
    balance: newBalance,
    wagered: (current?.wagered || 0) + addedWager,
    updatedAt: Date.now(),
  };

  profileCache.set(uid, updated);
  notifyProfileSubscribers(uid, updated);

  try {
    await apiRequest(`/users/${encodeURIComponent(uid)}/balance`, {
      method: "PUT",
      body: JSON.stringify({
        balance: newBalance,
        addedWager,
      }),
    });
  } catch (error) {
    console.error("[UserService] Error al actualizar balance en base de datos:", error);
  }
}

/**
 * Suscripción periódica / tiempo real para el perfil del usuario
 */
export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  if (!profileListeners.has(uid)) {
    profileListeners.set(uid, new Set());
  }
  const set = profileListeners.get(uid)!;
  set.add(callback);

  // Enviar estado actual si existe
  if (profileCache.has(uid)) {
    callback(profileCache.get(uid)!);
  } else {
    getUserProfile(uid);
  }

  // Intervalo de sondeo (polling cada 5 segundos para sincronía de balance)
  const pollId = setInterval(() => {
    getUserProfile(uid);
  }, 5000);

  return () => {
    set.delete(callback);
    clearInterval(pollId);
    if (set.size === 0) {
      profileListeners.delete(uid);
    }
  };
}

function notifyProfileSubscribers(uid: string, profile: UserProfile | null) {
  const set = profileListeners.get(uid);
  if (set) {
    set.forEach((cb) => cb(profile));
  }
}
