import React, { useState, useEffect, useRef } from "react";
import { soundManager } from "../../../utils/soundManager";
import {
  ChatMessage,
  subscribeChatMessages,
  sendChatMessage,
  CHAT_TTL_MS,
} from "../../../services/chatService";
import { getCurrentUser } from "../../../services/authService";

export type { ChatMessage };

interface ChatProps {
  game?: string;
  currentUserName?: string;
  isVip?: boolean;
}

function getCreatedMs(createdAt: any): number {
  if (!createdAt) return Date.now();
  if (typeof createdAt === "number") return createdAt;
  const d = new Date(createdAt);
  const time = d.getTime();
  return isNaN(time) ? Date.now() : time;
}

function formatTime(createdAt: any): string {
  if (!createdAt) return "";
  try {
    const d = typeof createdAt === "number" ? new Date(createdAt) : new Date(createdAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function Chat({
  game = "Blackjack",
  currentUserName = "Jugador Oasis",
  isVip = false,
}: ChatProps) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  const logRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const prevCountRef = useRef(0);

  const channel: "general" | "vip" = isVip ? "vip" : "general";

  /* ========================================================
     SUSCRIPCIÓN EN TIEMPO REAL (BD)
  ======================================================== */
  useEffect(() => {
    setIsConnecting(true);
    setMsgs([]);
    isFirstLoadRef.current = true;
    prevCountRef.current = 0;

    const unsubscribe = subscribeChatMessages(
      channel,
      (list) => {
        setMsgs(list);
        setIsConnecting(false);

        // Sonido si llega mensaje nuevo
        if (!isFirstLoadRef.current && list.length > prevCountRef.current) {
          const last = list[list.length - 1];
          const activeUser = getCurrentUser();
          if (last && last.userId !== activeUser?.uid) {
            soundManager.playSFX(isVip ? "winCoin" : "chip");
          }
        }

        prevCountRef.current = list.length;
        isFirstLoadRef.current = false;
      },
      (err) => {
        console.warn(`[Chat] Error conectando al canal ${channel}:`, err);
        setIsConnecting(false);
      }
    );

    return () => unsubscribe();
  }, [channel, isVip]);

  /* ========================================================
     PURGAR MENSAJES EXPIRADOS (> 3 MIN) LOCALMENTE
  ======================================================== */
  useEffect(() => {
    const pruneTimer = setInterval(() => {
      const now = Date.now();
      setMsgs((prev) => {
        const fresh = prev.filter(
          (m) => now - getCreatedMs(m.createdAt) <= CHAT_TTL_MS
        );
        return fresh.length !== prev.length ? fresh : prev;
      });
    }, 3000);

    return () => clearInterval(pruneTimer);
  }, []);

  /* =========================
     SCROLL AUTOMÁTICO
  ========================= */
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [msgs]);

  /* =========================
     ENVIAR MENSAJE
  ========================= */
  const sendMsg = async () => {
    const txt = input.trim();
    if (!txt || sending) return;

    setSending(true);
    setInput("");

    try {
      await sendChatMessage(channel, {
        text: txt,
        game: game || (isVip ? "Mesa VIP" : "Casino"),
        isVip,
        userName: currentUserName,
      });

      soundManager.playSFX("chip");
    } catch (err) {
      console.error(`Error al enviar mensaje en ${channel}:`, err);
    } finally {
      setSending(false);
    }
  };

  const currentUid = getCurrentUser()?.uid;

  return (
    <div className={`chat-panel ${isVip ? "chat-vip-panel" : ""}`}>
      {isVip ? (
        <div className="chat-head chat-head-vip">
          <div className="chat-head-left">
            <span className="chat-crown-icon">👑</span>
            <div className="chat-title-group">
              <b>CHAT PRIVADO VIP</b>
              <span className="chat-head-subtitle">🔒 Sala Exclusiva · Reset cada 3 min</span>
            </div>
          </div>
          <span className="chat-badge-live chat-badge-vip" title="El chat se restablece automáticamente cada 3 minutos">
            {isConnecting ? "Conectando..." : "👑 VIP · 3 min"}
          </span>
        </div>
      ) : (
        <div className="chat-head">
          <div className="chat-head-left">
            <span className="chat-status-pulse"></span>
            <div className="chat-title-group">
              <b>CHAT EN VIVO</b>
              <span className="chat-head-subtitle">Reset cada 3 min</span>
            </div>
          </div>
          <span className="chat-badge-live" title="El chat se restablece automáticamente cada 3 minutos">
            {isConnecting ? "Conectando..." : "🟢 En Vivo · 3 min"}
          </span>
        </div>
      )}

      <div className="chat-log" ref={logRef}>
        {msgs.length === 0 ? (
          <div className="chat-empty-hint">
            {isConnecting ? (
              <span className="chat-connecting-text">Conectando a la base de datos...</span>
            ) : (
              <>
                <span className="chat-empty-icon">{isVip ? "👑" : "💬"}</span>
                <p>
                  {isVip
                    ? "Bienvenido al Chat VIP. Los mensajes se limpian cada 3 minutos."
                    : "No hay mensajes recientes. ¡Sé el primero en saludar a la mesa!"}
                </p>
              </>
            )}
          </div>
        ) : (
          msgs.map((m, idx) => {
            const isMe = m.userId === currentUid && m.userId !== undefined && m.userId !== "";
            const isVipMsg = m.type === "vip" || m.channel === "vip";
            const isSys = m.type === "sys";
            const isWin = m.type === "win";

            return (
              <div
                key={m.id || idx}
                className={`chat-msg ${isMe ? "chat-msg-me" : ""} ${
                  isVipMsg ? "chat-msg-vip" : ""
                } ${isSys ? "chat-msg-sys" : ""} ${isWin ? "chat-msg-win" : ""}`}
              >
                <div className="chat-msg-meta">
                  <span className="chat-user">
                    {isVipMsg && <span className="chat-vip-star">⭐</span>}
                    {m.userName}
                  </span>
                  {m.game && <span className="chat-game-tag">· {m.game}</span>}
                  <span className="chat-time">{formatTime(m.createdAt)}</span>
                </div>
                <div className="chat-bubble">{m.text}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-field"
          placeholder={isVip ? "Mensaje VIP exclusivo..." : "Escribe tu mensaje..."}
          maxLength={250}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMsg();
            }
          }}
          disabled={sending}
        />
        <button
          className={`chat-send-btn ${isVip ? "chat-send-btn-vip" : ""}`}
          onClick={sendMsg}
          disabled={sending || !input.trim()}
          title="Enviar mensaje"
        >
          {sending ? "..." : "➤"}
        </button>
      </div>
    </div>
  );
}