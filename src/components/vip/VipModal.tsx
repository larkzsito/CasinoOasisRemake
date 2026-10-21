import React from "react";
import { VIP_RANKS, COP, VipRank } from "../../data/games";

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  wagered: number;
  onOpenDeposit?: () => void;
}

export default function VipModal({
  isOpen,
  onClose,
  wagered,
  onOpenDeposit
}: VipModalProps) {
  if (!isOpen) return null;

  const curVip: VipRank =
    [...VIP_RANKS].reverse().find((r) => wagered >= r.min) || VIP_RANKS[0];
  const nextVip = VIP_RANKS.find((r) => r.min > wagered);
  const curMin = curVip.min;
  const nextMin = nextVip ? nextVip.min : curMin;
  const vipPct = nextVip
    ? Math.min(100, Math.round(((wagered - curMin) / (nextMin - curMin)) * 100))
    : 100;

  const vipRoomThreshold = 50000000;
  const hasVipAccess = wagered >= vipRoomThreshold;
  const missingForVipRooms = Math.max(0, vipRoomThreshold - wagered);

  return (
    <div className="vip-modal-overlay" onClick={onClose}>
      <div className="vip-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="vip-modal-header">
          <div className="vip-header-title">
            <span className="vip-crown-icon">👑</span>
            <div>
              <h2>Club VIP Casino Oasis</h2>
              <p>Conoce los requisitos de gasto y beneficios exclusivos de cada rango</p>
            </div>
          </div>
          <button className="vip-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Current User Status Banner */}
        <div className="vip-status-card">
          <div className="vip-status-top">
            <div className="vip-current-badge">
              <span className="vip-icon-large">{curVip.icon}</span>
              <div>
                <div className="vip-rank-sub">Tu Rango Actual</div>
                <div className="vip-rank-main" style={{ color: curVip.accentColor }}>
                  {curVip.name}
                </div>
              </div>
            </div>
            <div className="vip-spend-stat">
              <div className="vip-spend-label">Total Gastado / Apostado</div>
              <div className="vip-spend-val">{COP.format(wagered)}</div>
            </div>
          </div>

          <div className="vip-progress-wrap">
            <div className="vip-progress-labels">
              <span>
                {nextVip
                  ? `Progreso hacia ${nextVip.name}`
                  : "¡Nivel Diamante Máximo Alcanzado!"}
              </span>
              <span className="vip-pct-text">{vipPct}%</span>
            </div>
            <div className="vip-progress-track">
              <div
                className="vip-progress-fill"
                style={{
                  width: `${vipPct}%`,
                  background: `linear-gradient(90deg, ${curVip.accentColor}, #eab308)`
                }}
              />
            </div>
            {nextVip && (
              <div className="vip-missing-note">
                Faltan <b>{COP.format(nextVip.min - wagered)}</b> en apuestas para desbloquear <b>{nextVip.name}</b>.
              </div>
            )}
          </div>

          {/* Special VIP Rooms Callout */}
          <div className={`vip-rooms-callout ${hasVipAccess ? "unlocked" : "locked"}`}>
            <span className="callout-icon">{hasVipAccess ? "🔓" : "🔒"}</span>
            <div className="callout-body">
              <div className="callout-title">
                {hasVipAccess
                  ? "¡Salas VIP y Chat Privado Desbloqueados!"
                  : "Requisito para Entrar a las Salas VIP: Rango Platino VIP ($50.000.000)"}
              </div>
              <div className="callout-desc">
                {hasVipAccess ? (
                  <>
                    Tienes acceso total garantizado a <b>Blackjack VIP</b>, <b>Ruleta VIP</b> y la sala de <b>Chat Privado VIP en tiempo real</b>.
                  </>
                ) : (
                  <>
                    Debes acumular al menos <b>$50.000.000 COP</b> en apuestas (Rango Platino VIP) para ingresar a las mesas VIP y chatear con jugadores de alto nivel.
                    {" "}Te faltan <b>{COP.format(missingForVipRooms)}</b>.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section title */}
        <div className="vip-section-sub">
          <h3>Tabla de Rangos, Gastos Requeridos y Beneficios</h3>
          <span>Recompensas acumulativas por nivel</span>
        </div>

        {/* Ranks Cards List */}
        <div className="vip-ranks-grid">
          {VIP_RANKS.map((r) => {
            const isCurrent = curVip.name === r.name;
            const isUnlocked = wagered >= r.min;
            const isVipRoomRank = r.min === 50000000;
            const isDiamondRank = r.min === 400000000;

            return (
              <div
                key={r.name}
                className={`vip-rank-card ${isCurrent ? "is-current" : ""} ${
                  isUnlocked ? "is-unlocked" : "is-locked"
                } ${isVipRoomRank ? "vip-room-tier" : ""} ${
                  isDiamondRank ? "diamond-tier" : ""
                }`}
              >
                <div className="rank-card-header">
                  <div className="rank-card-identity">
                    <span className="rank-card-icon">{r.icon}</span>
                    <div className="rank-card-meta">
                      <div className="rank-card-name" style={{ color: r.accentColor }}>
                        {r.name}
                      </div>
                      <span className="rank-badge-tag">{r.badge}</span>
                    </div>
                  </div>

                  <div className="rank-status-tag">
                    {isCurrent ? (
                      <span className="tag-current">⭐ Rango Actual</span>
                    ) : isUnlocked ? (
                      <span className="tag-unlocked">✓ Alcanzado</span>
                    ) : (
                      <span className="tag-missing">
                        Faltan {COP.format(r.min - wagered)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Spend Requirement Box */}
                <div className="rank-req-box">
                  <div className="rank-req-label">Gasto Requerido en Apuestas:</div>
                  <div className="rank-req-amount">
                    {r.min === 0 ? "Sin requisito inicial ($0 COP)" : COP.format(r.min)}
                  </div>
                  {isVipRoomRank && (
                    <div className="rank-vip-highlight">
                      🔥 ¡Acceso a Salas VIP y Chat Privado!
                    </div>
                  )}
                  {isDiamondRank && (
                    <div className="rank-diamond-highlight">
                      💎 ¡Rango Supremo Élite del Casino!
                    </div>
                  )}
                </div>

                {/* Benefits List */}
                <div className="rank-benefits-wrap">
                  <div className="rank-benefits-title">Beneficios del Rango:</div>
                  <ul className="rank-benefits-list">
                    {r.benefits.map((b, i) => (
                      <li key={i}>
                        <span className="check-icon">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="vip-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Entendido
          </button>
          {onOpenDeposit && (
            <button className="btn btn-gold" onClick={() => { onClose(); onOpenDeposit(); }}>
              💰 Agregar Saldo para Subir Rango
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
