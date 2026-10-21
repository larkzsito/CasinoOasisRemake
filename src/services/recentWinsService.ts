// ========================================================
// SERVICIO DE GANANCIAS RECIENTES — CASINO OASIS
// ========================================================
import { apiRequest } from "./database";

export interface RecentWin {
  id?: string;
  name: string;
  game: string;
  amt: number;
  timeAgo?: string;
  createdAt?: number;
  isReal?: boolean;
  winCount?: number;
}

export function formatTimeAgo(timestampMs?: number): string {
  if (!timestampMs) return "Reciente";
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 30) return "Hace un momento";
  if (diffSec < 60) return "Hace 1 min";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return "Hoy";
}

let cachedWins: RecentWin[] = [];
const winListeners: Set<(wins: RecentWin[]) => void> = new Set();

/**
 * Registra una ganancia en la base de datos
 */
export async function recordWin(
  playerName: string,
  gameName: string,
  amount: number
): Promise<void> {
  if (!amount || amount <= 0) return;

  const cleanPlayer = (playerName || "Jugador Oasis").trim();
  const winItem: RecentWin = {
    name: cleanPlayer,
    game: gameName,
    amt: Math.round(amount),
    createdAt: Date.now(),
    isReal: true,
  };

  // Añadir a caché local de inmediato
  cachedWins = [winItem, ...cachedWins].slice(0, 10);
  winListeners.forEach((fn) => fn(cachedWins.map((w) => ({ ...w, timeAgo: formatTimeAgo(w.createdAt) }))));

  try {
    await apiRequest("/wins", {
      method: "POST",
      body: JSON.stringify(winItem),
    });
  } catch (err) {
    console.warn("[RecentWins] No se pudo guardar ganancia en la base de datos:", err);
  }
}

/**
 * Suscripción periódica para las ganancias recientes
 */
export function subscribeRecentWins(
  callback: (wins: RecentWin[]) => void
): () => void {
  winListeners.add(callback);

  const fetchWins = async () => {
    try {
      const data = await apiRequest<RecentWin[]>("/wins");
      if (Array.isArray(data)) {
        cachedWins = data.map((w) => ({
          ...w,
          timeAgo: formatTimeAgo(w.createdAt),
        }));
        callback(cachedWins);
      }
    } catch {
      callback(cachedWins.map((w) => ({ ...w, timeAgo: formatTimeAgo(w.createdAt) })));
    }
  };

  fetchWins();
  const timer = setInterval(fetchWins, 5000);

  return () => {
    winListeners.delete(callback);
    clearInterval(timer);
  };
}
