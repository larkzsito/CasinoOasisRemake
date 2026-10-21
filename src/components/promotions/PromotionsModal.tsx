import React, { useState } from "react";
import { COP } from "../../data/games";

interface Promotion {
  id: string;
  category: "all" | "welcome" | "deposit" | "cashback" | "vip";
  tag: string;
  tagColor: string;
  title: string;
  subtitle: string;
  highlight: string;
  description: string;
  code?: string;
  terms: string[];
  actionLabel: string;
  icon: string;
}

const PROMOTIONS: Promotion[] = [
  {
    id: "welcome-bonus",
    category: "welcome",
    tag: "MÁS POPULAR",
    tagColor: "#eab308",
    title: "Bono de Bienvenida Oasis 200%",
    subtitle: "Triplica tu primer depósito al instante",
    highlight: `Hasta ${COP.format(1000000)} + 100 Giros Gratis`,
    description: "Multiplica tus opciones de ganar en tu primer ingreso en Casino Oasis. Válido para tragamonedas y juegos en vivo seleccionados.",
    code: "OASIS200",
    terms: [
      "Depósito mínimo de $20.000 COP.",
      "Rollover x15 antes de solicitar retiros.",
      "Vigencia de 30 días a partir de la activación.",
      "100 giros gratis utilizables en Slots Oasis Bonanza."
    ],
    actionLabel: "Reclamar Bono",
    icon: "🎁"
  },
  {
    id: "weekend-cashback",
    category: "cashback",
    tag: "TODOS LOS VIERNES",
    tagColor: "#3b82f6",
    title: "Cashback Fin de Semana 15%",
    subtitle: "Recupera parte de tus jugadas no ganadoras",
    highlight: "15% de Reembolso Real",
    description: "Juega sin preocupaciones los fines de semana. Si la suerte no está de tu lado, te devolvemos el 15% de tus pérdidas netas cada lunes.",
    code: "CASHBACK15",
    terms: [
      "Aplica a partidas entre viernes 00:00 y domingo 23:59.",
      "Sin requisito de apuesta (fondos acreditados en saldo real).",
      "Reembolso máximo de $5.000.000 COP por usuario."
    ],
    actionLabel: "Activar Cashback",
    icon: "🛡️"
  },
  {
    id: "weekly-tournament",
    category: "vip",
    tag: "POZO MILLONARIO",
    tagColor: "#a855f7",
    title: "Torneo Semanal Oasis Gold",
    subtitle: "Compite con los mejores jugadores y lidera la tabla",
    highlight: `${COP.format(50000000)} en Premios`,
    description: "Cada apuesta que realices en ruleta, blackjack y slots acumula puntos en la tabla de líderes. Los primeros 50 puestos reciben premios en efectivo.",
    terms: [
      "Participación automática con apuestas desde $5.000 COP.",
      "Premio primer lugar: $15.000.000 COP libres de rollover.",
      "Cierre de clasificación todos los domingos a las 23:59."
    ],
    actionLabel: "Ver Clasificación",
    icon: "🏆"
  },
  {
    id: "crypto-reload",
    category: "deposit",
    tag: "BONO EXTRA",
    tagColor: "#10b981",
    title: "Recarga Relámpago +50%",
    subtitle: "Recibe 50% adicional en tus recargas entre semana",
    highlight: "+50% Extra en Saldo Demo/Real",
    description: "Aprovecha tus recargas de lunes a jueves y recibe una bonificación automática para jugar en cualquiera de nuestras salas.",
    code: "RECARGA50",
    terms: [
      "Válido de lunes a jueves para una recarga diaria.",
      "Monto mínimo de recarga: $50.000 COP.",
      "Tope máximo de bonificación: $500.000 COP."
    ],
    actionLabel: "Reclamar Código",
    icon: "⚡"
  },
  {
    id: "vip-club-mystery",
    category: "vip",
    tag: "EXCLUSIVO VIP",
    tagColor: "#f59e0b",
    title: "Cofres y Giros VIP Diarios",
    subtitle: "Recompensas exclusivas para rangos Oro, Platino y Diamante",
    highlight: "Hasta 250 Giros Gratis Diarios",
    description: "Los miembros del Club VIP reciben llaves gratuitas para los cofres de la fortuna y giros en tragamonedas con multiplicadores especiales.",
    terms: [
      "Disponible para usuarios con rango VIP Oro o superior.",
      "Se renueva todos los días a las 00:00 UTC.",
      "Los premios en cofres van desde saldo directo hasta bonos VIP."
    ],
    actionLabel: "Ver Beneficios VIP",
    icon: "👑"
  }
];

interface PromotionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToDeposit?: () => void;
  onOpenVip?: () => void;
  onNotify?: (msg: string) => void;
}

export default function PromotionsModal({
  isOpen,
  onClose,
  onGoToDeposit,
  onOpenVip,
  onNotify
}: PromotionsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredPromos = PROMOTIONS.filter(
    (p) => selectedCategory === "all" || p.category === selectedCategory
  );

  const handleCopyCode = (promo: Promotion) => {
    if (!promo.code) return;
    navigator.clipboard?.writeText(promo.code);
    setCopiedCodeId(promo.id);
    onNotify?.(`¡Código ${promo.code} copiado al portapapeles!`);
    setTimeout(() => {
      setCopiedCodeId((prev) => (prev === promo.id ? null : prev));
    }, 3000);
  };

  const handleAction = (promo: Promotion) => {
    if (promo.category === "vip" && onOpenVip) {
      onClose();
      onOpenVip();
    } else if (promo.code) {
      handleCopyCode(promo);
      if (onGoToDeposit) {
        onClose();
        onGoToDeposit();
      }
    } else {
      onNotify?.(`¡Promoción "${promo.title}" activada con éxito!`);
    }
  };

  return (
    <div className="promo-modal-backdrop" onClick={onClose}>
      <div
        className="promo-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="promo-modal-header">
          <div className="promo-modal-title-wrap">
            <span className="promo-modal-badge">🎰 OFERTAS ACTIVAS</span>
            <h2 className="promo-modal-title">Promociones y Bonos Exclusivos</h2>
            <p className="promo-modal-subtitle">
              Maximiza tu diversión con los mejores bonos, reembolsos y torneos de Casino Oasis.
            </p>
          </div>
          <button
            className="promo-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal de promociones"
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="promo-modal-tabs">
          {[
            { id: "all", label: "Todas las Ofertas", icon: "✨" },
            { id: "welcome", label: "Bienvenida", icon: "🎁" },
            { id: "deposit", label: "Recargas", icon: "⚡" },
            { id: "cashback", label: "Cashback", icon: "🛡️" },
            { id: "vip", label: "Torneos & VIP", icon: "👑" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`promo-tab-btn ${selectedCategory === tab.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(tab.id)}
            >
              <span className="promo-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Promotions Grid */}
        <div className="promo-modal-body">
          <div className="promo-cards-grid">
            {filteredPromos.map((promo) => {
              const isTermsOpen = expandedTermsId === promo.id;
              const isCopied = copiedCodeId === promo.id;

              return (
                <div key={promo.id} className="promo-card">
                  <div className="promo-card-top">
                    <div className="promo-card-icon">{promo.icon}</div>
                    <span
                      className="promo-tag"
                      style={{
                        borderColor: promo.tagColor,
                        color: promo.tagColor,
                        backgroundColor: `${promo.tagColor}15`,
                      }}
                    >
                      {promo.tag}
                    </span>
                  </div>

                  <h3 className="promo-card-title">{promo.title}</h3>
                  <div className="promo-highlight">{promo.highlight}</div>
                  <p className="promo-card-desc">{promo.description}</p>

                  {/* Promo Code Box if available */}
                  {promo.code && (
                    <div className="promo-code-container">
                      <span className="promo-code-label">Código promocional:</span>
                      <div className="promo-code-box">
                        <span className="promo-code-text">{promo.code}</span>
                        <button
                          className="promo-copy-btn"
                          onClick={() => handleCopyCode(promo)}
                          title="Copiar código"
                        >
                          {isCopied ? "✓ Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Terms accordion */}
                  <div className="promo-terms-section">
                    <button
                      className="promo-terms-toggle"
                      onClick={() =>
                        setExpandedTermsId(isTermsOpen ? null : promo.id)
                      }
                    >
                      <span>Términos y Condiciones</span>
                      <span>{isTermsOpen ? "▲" : "▼"}</span>
                    </button>
                    {isTermsOpen && (
                      <ul className="promo-terms-list">
                        {promo.terms.map((term, idx) => (
                          <li key={idx}>• {term}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    className="promo-action-btn"
                    onClick={() => handleAction(promo)}
                  >
                    {promo.actionLabel} ➔
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="promo-modal-footer">
          <span className="promo-footer-icon">ℹ️</span>
          <span>
            Los bonos están sujetos a verificación de cuenta y términos generales de juego responsable de Casino Oasis.
          </span>
        </div>
      </div>
    </div>
  );
}
