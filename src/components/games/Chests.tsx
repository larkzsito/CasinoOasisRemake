import React, { useState, useEffect, useRef } from "react";
import GameShell from "./shared/GameShell";
import Box from "./shared/Box";
import { COP } from "../../data/games";
import { soundManager } from "../../utils/soundManager";
import imgMoto from "../../assets/chests/moto_10m.png";
import imgIphone17 from "../../assets/chests/iphone17_5m.png";
import imgLaptop from "../../assets/chests/laptop_25m.png";
import imgIphone11 from "../../assets/chests/iphone11_1m.png";
import imgTenis from "../../assets/chests/tenis_200k.png";
import imgMonster from "../../assets/chests/monster_10k.png";
import imgLabubu from "../../assets/chests/sticker_labubu.png";
import imgAirpods from "../../assets/chests/airpods_400k.png";
import imgCamisa from "../../assets/chests/camisa_150k.png";
import imgAudifonos from "../../assets/chests/audifonos_25k.png";
import imgTicketPlata from "../../assets/chests/ticket_plata_200.png";
import imgMouse from "../../assets/chests/mouse_50k.png";
import imgPeluche from "../../assets/chests/peluche_20k.png";
import imgTicketOro from "../../assets/chests/ticket_oro_500.png";
import imgTicketBronce from "../../assets/chests/ticket_bronce_50.png";
import imgLvTrainer from "../../assets/chests/lv_trainer_7m.png";
import imgLvJacket from "../../assets/chests/lv_jacket_14m.png";
import imgPs5 from "../../assets/chests/ps5_3.4m.png";
import imgRolex from "../../assets/chests/rolex_40m.png";

interface Prize {
  value: number;
  probability: number;
  rarity: "legendary" | "epic" | "rare" | "common" | "trash";
  name?: string;
  image?: string;
}

interface Chest {
  id: string;
  name: string;
  price: number;
  icon: string;
  accent: string;
  glow: string;
  prizes: Prize[];
}

const CHESTS: Chest[] = [
  {
    id: "ch_classic",
    name: "Caja Oasis Clásica",
    price: 20000,
    icon: "📦",
    accent: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.4)",
    prizes: [
      { value: 50, probability: 10.0, rarity: "trash", name: "Ticket de Bronce", image: imgTicketBronce },
      { value: 500, probability: 15.0, rarity: "trash", name: "Ticket de Oro", image: imgTicketOro },
      { value: 1000, probability: 29.0, rarity: "trash", name: "Sticker Labubu", image: imgLabubu },
      { value: 10000, probability: 56.0, rarity: "common", name: "Monster Energy", image: imgMonster },
      { value: 20000, probability: 35.0, rarity: "common", name: "Peluche Elefante", image: imgPeluche },
      { value: 50000, probability: 10, rarity: "rare", name: "Mouse Logitech G", image: imgMouse },
      { value: 200000, probability: 7.8, rarity: "epic", name: "Tenis Nike Air Force", image: imgTenis },
      { value: 1000000, probability: 2.5, rarity: "epic", name: "iPhone 11", image: imgIphone11 },
      { value: 3400000, probability: 1.0, rarity: "legendary", name: "PlayStation 5", image: imgPs5 },
      { value: 5000000, probability: 0.3, rarity: "legendary", name: "iPhone 17 Pro Max", image: imgIphone17 },
    ],
  },
  {
    id: "ch_gold",
    name: "Caja Oasis de Oro",
    price: 150000,
    icon: "👑",
    accent: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.4)",
    prizes: [
      { value: 200, probability: 6.0, rarity: "trash", name: "Ticket de Plata", image: imgTicketPlata },
      { value: 1000, probability: 7.5, rarity: "trash", name: "Sticker Labubu", image: imgLabubu },
      { value: 10000, probability: 8.0, rarity: "common", name: "Monster Energy", image: imgMonster },
      { value: 25000, probability: 43.0, rarity: "common", name: "Audífonos Sony", image: imgAudifonos },
      { value: 150000, probability: 37.0, rarity: "common", name: "Camisa Clemont", image: imgCamisa },
      { value: 400000, probability: 24.0, rarity: "rare", name: "AirPods", image: imgAirpods },
      { value: 1000000, probability: 6.3, rarity: "epic", name: "iPhone 11", image: imgIphone11 },
      { value: 3400000, probability: 2.7, rarity: "epic", name: "PlayStation 5", image: imgPs5 },
      { value: 5000000, probability: 1.8, rarity: "legendary", name: "iPhone 17 Pro Max", image: imgIphone17 },
      { value: 7400000, probability: 0.98, rarity: "legendary", name: "LV Trainer Sneaker", image: imgLvTrainer },
      { value: 10000000, probability: 0.70, rarity: "legendary", name: "Moto Honda X-Blade", image: imgMoto },
      { value: 14200000, probability: 0.20, rarity: "legendary", name: "Monogram Quilted Liner Jacket", image: imgLvJacket },
      { value: 40000000, probability: 0.07, rarity: "legendary", name: "Rolex Submariner", image: imgRolex },
    ],
  },
  {
    id: "ch_vip",
    name: "Caja Imperial VIP",
    price: 1000000,
    icon: "💎",
    accent: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.4)",
    prizes: [
      { value: 1000, probability: 3.0, rarity: "trash", name: "Sticker Labubu", image: imgLabubu },
      { value: 10000, probability: 5.0, rarity: "trash", name: "Monster Energy", image: imgMonster },
      { value: 200000, probability: 48.0, rarity: "common", name: "Tenis Nike Air Force", image: imgTenis },
      { value: 1000000, probability: 38.0, rarity: "common", name: "iPhone 11", image: imgIphone11 },
      { value: 2500000, probability: 16.0, rarity: "rare", name: "Portátil Lenovo IdeaPad", image: imgLaptop },
      { value: 3400000, probability: 4.3, rarity: "epic", name: "PlayStation 5", image: imgPs5 },
      { value: 5000000, probability: 2.8, rarity: "epic", name: "iPhone 17 Pro Max", image: imgIphone17 },
      { value: 7400000, probability: 1.4, rarity: "legendary", name: "LV Trainer Sneaker", image: imgLvTrainer },
      { value: 10000000, probability: 1, rarity: "legendary", name: "Moto Honda X-Blade", image: imgMoto },
      { value: 14200000, probability: 0.50, rarity: "legendary", name: "Monogram Quilted Liner Jacket", image: imgLvJacket },
      { value: 40000000, probability: 0.12, rarity: "legendary", name: "Rolex Submariner", image: imgRolex },
    ],
  },
];

const RARITY_LABELS = {
  legendary: { label: "Legendario", color: "#f59e0b" },
  epic:      { label: "Épico",      color: "#a855f7" },
  rare:      { label: "Raro",       color: "#3b82f6" },
  common:    { label: "Común",      color: "#10b981" },
  trash:     { label: "Chatarra",   color: "#6b7280" },
};

const formatShortValue = (val: number): string => {
  if (val >= 1000000) {
    const m = val / 1000000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (val >= 1000) {
    const k = val / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `$${val}`;
};

// ─── Per-carousel lane state ───────────────────────────────────────────────────
interface CarouselState {
  items: Prize[];
  transform: string;
  transition: string;
  winner: Prize | null;
  revealed: boolean;
}

function buildLane(prizes: Prize[]): CarouselState {
  const totalProb = prizes.reduce((s, p) => s + p.probability, 0);
  const getRnd = (): Prize => {
    let r = Math.random() * totalProb;
    for (const p of prizes) { r -= p.probability; if (r <= 0) return p; }
    return prizes[prizes.length - 1];
  };
  const items: Prize[] = [];
  for (let i = 0; i < 60; i++) items.push(getRnd());
  return { items, transform: "translateX(0px)", transition: "none", winner: null, revealed: false };
}

export default function Chests({
  title, name, balance, change, notify, back,
}: {
  title: string; name: string; balance: number;
  change: (d: number, w?: number) => void;
  notify: (m: string) => void; back: () => void;
}) {
  const [selectedChestIdx, setSelectedChestIdx] = useState(0);
  const [quantity, setQuantity] = useState<1 | 2 | 5>(1);
  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  useEffect(() => { spinningRef.current = spinning; }, [spinning]);

  // All roulette lanes (1 for x1 mode, 2 or 5 for multi mode)
  const [lanes, setLanes] = useState<CarouselState[]>(() => [buildLane(CHESTS[0].prizes)]);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [multiWinners, setMultiWinners] = useState<Prize[]>([]);  // kept for modal display
  const wheelWindowRef = useRef<HTMLDivElement | null>(null);

  const activeChest = CHESTS[selectedChestIdx];
  const totalCost = activeChest.price * quantity;

  // Reset lanes when chest or quantity changes
  useEffect(() => {
    setShowPrizeModal(false);
    setLanes(Array.from({ length: quantity }, () => buildLane(CHESTS[selectedChestIdx].prizes)));
  }, [selectedChestIdx, quantity]);

  // Weighted random selection
  const getRandomPrize = (prizes: Prize[]): Prize => {
    const total = prizes.reduce((s, p) => s + p.probability, 0);
    let r = Math.random() * total;
    for (const p of prizes) { r -= p.probability; if (r <= 0) return p; }
    return prizes[prizes.length - 1];
  };

  // Decelerating tick sounds staggered by lane index
  const playDeceleratingTicks = (laneIdx: number) => {
    let count = 0;
    const max = 35;
    let delay = 35;
    const tick = () => {
      if (count >= max || !spinningRef.current) return;
      soundManager.playSFX("chestTic");
      count++;
      delay = 35 + Math.pow(count / max, 3.5) * 550;
      setTimeout(tick, delay);
    };
    setTimeout(tick, delay + laneIdx * 200);
  };

  const handleOpen = () => {
    if (balance < totalCost) { notify("Saldo insuficiente."); return; }
    soundManager.stopSFX("winCoin");
    change(-totalCost, totalCost);
    setSpinning(true);
    setShowPrizeModal(false);
    setMultiWinners([]);

    // Dynamically measure actual card width from DOM (handles mobile & desktop sizing seamlessly)
    const cardEl = wheelWindowRef.current?.querySelector<HTMLElement>(".tape-card");
    const cardW = cardEl ? cardEl.offsetWidth : 110;
    const gap = 8;
    const cardStep = cardW + gap;
    const WIN_INDEX = 35;
    const containerW = wheelWindowRef.current?.offsetWidth || 700;

    // Center of the winning card relative to tape start
    const cardCenter = WIN_INDEX * cardStep + cardW / 2;
    // Offset required to align the winning card directly under the center indicator (containerW / 2)
    const baseOffset = cardCenter - containerW / 2;

    const SPIN_MS = 4500;
    const LANE_GAP_MS = 600;

    // Pick winners for all lanes
    const winners = Array.from({ length: quantity }, () => getRandomPrize(activeChest.prizes));
    setMultiWinners(winners);

    // Pre-calculate individual lane offsets (subtle natural jitter safely inside card bounds)
    const maxJitter = Math.min(20, Math.floor(cardW * 0.22));
    const laneOffsets = winners.map(() => {
      const jitter = (Math.random() - 0.5) * (maxJitter * 2);
      return Math.round(baseOffset + jitter);
    });

    // Plant each winner at position WIN_INDEX of fresh lanes
    setLanes(prev => prev.map((lane, i) => {
      const freshLane = buildLane(activeChest.prizes);
      freshLane.items[WIN_INDEX] = winners[i];
      return {
        ...freshLane,
        transform: "translateX(0px)",
        transition: "none",
        winner: winners[i],
        revealed: false,
      };
    }));

    // Animate each lane sequentially
    winners.forEach((winner, idx) => {
      const startDelay = idx * LANE_GAP_MS;
      const offset = laneOffsets[idx];

      // Kick off spin
      setTimeout(() => {
        setLanes(prev => prev.map((lane, i) =>
          i !== idx ? lane : {
            ...lane,
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.15, 1)`,
            transform: `translateX(-${offset}px)`,
          }
        ));
        playDeceleratingTicks(idx);
      }, startDelay + 50);

      // Reveal result
      setTimeout(() => {
        setLanes(prev => prev.map((lane, i) =>
          i !== idx ? lane : { ...lane, revealed: true }
        ));
        change(winner.value);
        soundManager.playSFX("chestOpen");
        if (winner.rarity === "legendary") soundManager.playSFX("jackpot");
        else if (winner.rarity === "epic" || winner.rarity === "rare") soundManager.playSFX("winCoin");

        // After ALL lanes finish, show the prize summary modal
        if (idx === quantity - 1) {
          setSpinning(false);
          setShowPrizeModal(true);
        }
      }, startDelay + SPIN_MS + 100);
    });
  };

  const handleBack = () => {
    if (spinning || showPrizeModal) {
      notify("🔒 Reclama tu premio antes de volver al lobby.");
      return;
    }
    back();
  };

  const resetAll = () => {
    setShowPrizeModal(false);
    setLanes(Array.from({ length: quantity }, () => buildLane(activeChest.prizes)));
  };

  // Render one horizontal carousel lane
  const renderLane = (lane: CarouselState, laneIdx: number) => (
    <div key={laneIdx} className="chest-wheel-container" style={{ marginBottom: laneIdx < quantity - 1 ? 10 : 0 }}>
      {quantity > 1 && (
        <div className="lane-label">
          <span>Cofre {laneIdx + 1}</span>
          {lane.revealed && lane.winner && (
            <span className="lane-winner-badge" style={{ color: RARITY_LABELS[lane.winner.rarity].color }}>
              {COP.format(lane.winner.value)}&nbsp;·&nbsp;{RARITY_LABELS[lane.winner.rarity].label}
            </span>
          )}
        </div>
      )}
      <div className="wheel-window" ref={laneIdx === 0 ? wheelWindowRef : undefined}>
        <div className="wheel-pointers">
          <span className="pointer pointer-top"></span>
          <span className="pointer pointer-bottom"></span>
        </div>
        <div className="wheel-tape" style={{ transform: lane.transform, transition: lane.transition }}>
          {lane.items.map((item, idx) => (
            <div
              key={idx}
              className={`tape-card rarity-${item.rarity}`}
              style={{ borderBottomColor: RARITY_LABELS[item.rarity].color }}
            >
              {item.image ? (
                <div className="chest-card-img-wrap">
                  <img
                    src={item.image}
                    alt={item.name || ""}
                    className={`chest-card-img ${item.name?.toLowerCase().includes("ticket") ? "is-ticket" : ""}`}
                  />
                </div>
              ) : (
                <span className="chest-card-icon">🎁</span>
              )}
              <span className="chest-card-value">
                {formatShortValue(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <GameShell title={title} name={name} balance={balance} back={handleBack}>
      <div className="chests-game-layout">

        {/* Chest Select Tabs */}
        {!spinning && (
          <div className="chest-selector">
            {CHESTS.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                className={`chest-tab-btn ${selectedChestIdx === idx ? "active" : ""}`}
                style={{ "--chest-accent": c.accent } as React.CSSProperties}
                onClick={() => setSelectedChestIdx(idx)}
              >
                <span className="icon">{c.icon}</span>
                <div className="tab-meta">
                  <span className="c-name">{c.name}</span>
                  <span className="c-price">{COP.format(c.price)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Quantity selector */}
        {!spinning && (
          <div className="chest-quantity-selector">
            <span className="lbl">Abrir:</span>
            {([1, 2, 5] as const).map((q) => (
              <button
                key={q}
                type="button"
                className={`qty-btn ${quantity === q ? "active" : ""}`}
                onClick={() => setQuantity(q)}
              >
                x{q}
              </button>
            ))}
          </div>
        )}

        {/* Roulette lanes — all quantities use carousel(s) */}
        {lanes.map((lane, i) => renderLane(lane, i))}

        {/* Action Button */}
        <div className="chest-actions-bar">
          <button
            type="button"
            className="btn btn-gold btn-lg main-open-btn"
            onClick={handleOpen}
            disabled={spinning || balance < totalCost}
          >
            {spinning ? "Abriendo..." : (
              <>Abrir {quantity === 1 ? "Cofre" : `${quantity} Cofres`} por {COP.format(totalCost)}</>
            )}
          </button>
          {!spinning && (
            <button type="button" className="btn btn-outline btn-lg" onClick={resetAll}>
              Mezclar
            </button>
          )}
        </div>

        {/* Bottom Probabilities List */}
        {!spinning && (
          <div className="chest-prizes-list">
            <h4>Contenido y Probabilidades:</h4>
            <div className="prizes-grid">
              {activeChest.prizes.map((p, idx) => (
                <div
                  key={idx}
                  className={`prize-info-pill rarity-${p.rarity}`}
                  style={{
                    borderColor: RARITY_LABELS[p.rarity].color + "55",
                    background: `linear-gradient(135deg, rgba(20,22,28,0.8), ${RARITY_LABELS[p.rarity].color}12)`,
                  }}
                >
                  <div className="val-col">
                    {p.image ? (
                      <div className="prize-thumb-wrap">
                        <img
                          src={p.image}
                          alt={p.name || ""}
                          className={`prize-thumb-img ${p.name?.toLowerCase().includes("ticket") ? "is-ticket" : ""}`}
                        />
                      </div>
                    ) : (
                      <span className="dot" style={{ backgroundColor: RARITY_LABELS[p.rarity].color }}></span>
                    )}
                    <div className="prize-name-block">
                      <span className="value">{p.name || COP.format(p.value)}</span>
                      {p.name && <span className="sub-val">{COP.format(p.value)}</span>}
                    </div>
                  </div>
                  <div className="prob-col">
                    <span className="prob-pct">{p.probability.toFixed(2)}%</span>
                    <span className="rarity-tag" style={{ color: RARITY_LABELS[p.rarity].color }}>
                      {RARITY_LABELS[p.rarity].label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payout stats readout */}
        <div className="controls-bar" style={{ marginTop: 24 }}>
          <div className="bet-readout">
            <Box label="PRECIO UNITARIO" value={COP.format(activeChest.price)} />
            <Box label="CANTIDAD" value={`x${quantity}`} />
            <Box label="SALDO DISPONIBLE" value={COP.format(balance)} />
          </div>
        </div>

        {/* Modal: Prize reveal (x1 = single card, x2/x5 = full list + total) */}
        {showPrizeModal && multiWinners.length > 0 && (() => {
          const totalWon = multiWinners.reduce((s, p) => s + p.value, 0);
          const bestRarity = multiWinners.reduce((best, p) => {
            const order = ["legendary", "epic", "rare", "common", "trash"];
            return order.indexOf(p.rarity) < order.indexOf(best.rarity) ? p : best;
          }, multiWinners[0]);
          return (
            <div className="chest-win-modal-overlay">
              <div
                className="chest-win-modal rarity-win-glow"
                style={{ "--win-color": RARITY_LABELS[bestRarity.rarity].color } as React.CSSProperties}
              >
                <div className="particles-burst"></div>
                <h2>¡ENHORABUENA!</h2>
                {quantity === 1 ? (
                  <p>Has abierto el cofre y obtuviste:</p>
                ) : (
                  <p>Abriste <strong>{quantity} cofres</strong> y obtuviste:</p>
                )}

                {/* Single prize card (x1) */}
                {quantity === 1 && (
                  <div className="win-card" style={{ borderColor: RARITY_LABELS[multiWinners[0].rarity].color }}>
                    {multiWinners[0].image ? (
                      <div className="win-prize-img-wrap" style={{ "--modal-glow": RARITY_LABELS[multiWinners[0].rarity].color } as React.CSSProperties}>
                        <img
                          src={multiWinners[0].image}
                          alt={multiWinners[0].name || ""}
                          className={`win-prize-img ${multiWinners[0].name?.toLowerCase().includes("ticket") ? "is-ticket" : ""}`}
                        />
                      </div>
                    ) : (
                      <span className="win-prize-icon">🎁</span>
                    )}
                    <span className="win-prize-value">{multiWinners[0].name || COP.format(multiWinners[0].value)}</span>
                    {multiWinners[0].name && (
                      <span className="win-prize-subvalue">{COP.format(multiWinners[0].value)}</span>
                    )}
                    <span className="win-rarity-badge" style={{ backgroundColor: RARITY_LABELS[multiWinners[0].rarity].color }}>
                      {RARITY_LABELS[multiWinners[0].rarity].label}
                    </span>
                  </div>
                )}

                {/* Multi prize list (x2 / x5) */}
                {quantity > 1 && (
                  <div className="multi-win-list">
                    {multiWinners.map((prize, i) => (
                      <div key={i} className="multi-win-row" style={{ borderColor: RARITY_LABELS[prize.rarity].color + "55" }}>
                        <span className="multi-win-num">Cofre {i + 1}</span>
                        {prize.image ? (
                          <div className="multi-win-img-wrap" style={{ "--modal-glow": RARITY_LABELS[prize.rarity].color } as React.CSSProperties}>
                            <img
                              src={prize.image}
                              alt={prize.name || ""}
                              className={`multi-win-img ${prize.name?.toLowerCase().includes("ticket") ? "is-ticket" : ""}`}
                            />
                          </div>
                        ) : (
                          <span className="multi-win-icon">🎁</span>
                        )}
                        <div className="multi-win-info">
                          <span className="multi-win-value">{prize.name || COP.format(prize.value)}</span>
                          {prize.name && <span className="multi-win-subval">{COP.format(prize.value)}</span>}
                        </div>
                        <span className="multi-win-rarity" style={{ color: RARITY_LABELS[prize.rarity].color }}>
                          {RARITY_LABELS[prize.rarity].label}
                        </span>
                      </div>
                    ))}
                    <div className="multi-win-total">
                      <span>Total Ganado</span>
                      <span className="total-amount">{COP.format(totalWon)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-gold btn-block modal-collect-btn"
                  onClick={() => { setShowPrizeModal(false); resetAll(); }}
                >
                  Vender por {COP.format(totalWon)}
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    </GameShell>
  );
}
