// ========================================================
// SERVICIO DE CHAT EN TIEMPO REAL — CASINO OASIS
// ========================================================
import { apiRequest } from "./database";
import { getCurrentUser } from "./authService";

export interface ChatMessage {
  id?: string;
  userId?: string;
  userName: string;
  text: string;
  game?: string;
  channel?: "general" | "vip";
  createdAt?: number;
  type?: "sys" | "win" | "vip" | "";
}

export const CHAT_TTL_MS = 3 * 60 * 1000; // 3 minutos

/**
 * Suscribirse a mensajes de chat de una sala (general o vip)
 */
export function subscribeChatMessages(
  channel: "general" | "vip",
  callback: (messages: ChatMessage[]) => void,
  onError?: (err: any) => void
): () => void {
  let isMounted = true;

  const fetchChat = async () => {
    try {
      const data = await apiRequest<ChatMessage[]>(`/chat/${channel}`);
      if (isMounted && Array.isArray(data)) {
        const now = Date.now();
        // Filtrar mensajes menores a 3 minutos
        const fresh = data.filter((m) => {
          const time = typeof m.createdAt === "number" ? m.createdAt : now;
          return now - time <= CHAT_TTL_MS;
        });
        callback(fresh);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  fetchChat();
  const interval = setInterval(fetchChat, 2000);

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}

/**
 * Enviar mensaje de chat a la base de datos
 */
export async function sendChatMessage(
  channel: "general" | "vip",
  params: {
    text: string;
    game?: string;
    isVip?: boolean;
    userName?: string;
  }
): Promise<ChatMessage> {
  const user = getCurrentUser();
  const senderName =
    user?.displayName || params.userName || (params.isVip ? "Jugador VIP" : "Jugador Oasis");
  const senderId = user?.uid || "guest";

  const msgPayload: ChatMessage = {
    userId: senderId,
    userName: senderName,
    text: params.text.trim(),
    game: params.game || (params.isVip ? "Mesa VIP" : "Casino"),
    channel,
    createdAt: Date.now(),
    type: params.isVip ? "vip" : "",
  };

  return await apiRequest<ChatMessage>(`/chat/${channel}`, {
    method: "POST",
    body: JSON.stringify(msgPayload),
  });
}
