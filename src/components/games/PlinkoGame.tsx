import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import GameShell from "./shared/GameShell";
import BetBar from "./shared/BetBar";
import Box from "./shared/Box";
import { COP } from "../../data/games";
import { soundManager } from "../../utils/soundManager";

export type Risk = "Low" | "Medium" | "High";

interface Ball {
  id: number;
  betAmt: number;
  x: number;
  y: number;
  leftMs: number;
  topMs: number;
  topEase: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface HistoryItem {
  id: number;
  mult: number;
  win: number;
}

const ROW_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const RISK_OPTIONS: { key: Risk; label: string; color: string }[] = [
  { key: "Low", label: "Bajo", color: "#10b981" },
  { key: "Medium", label: "Medio", color: "#f59e0b" },
  { key: "High", label: "Alto", color: "#ef4444" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function niceRound(n: number): number {
  if (n < 1) return Math.round(n * 10) / 10;
  if (n < 10) return Math.round(n * 10) / 10;
  if (n < 100) return Math.round(n);
  return Math.round(n);
}

// Genera tabla de multiplicadores balanceada y simétrica según filas y riesgo
function getMultipliers(rows: number, risk: Risk): number[] {
  if (rows === 12 && risk === "Medium") {
    return [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33];
  }
  if (rows === 8 && risk === "Low") {
    return [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6];
  }
  if (rows === 8 && risk === "Medium") {
    return [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13];
  }
  if (rows === 8 && risk === "High") {
    return [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29];
  }
  if (rows === 16 && risk === "High") {
    return [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000];
  }

  const slots = rows + 1;
  const center = rows / 2;
  const riskCfg: Record<Risk, { base: number; scale: number; pow: number }> = {
    Low: { base: 0.5, scale: rows * 0.9, pow: 3.8 },
    Medium: { base: 0.3, scale: Math.pow(rows, 1.8), pow: 5.5 },
    High: { base: 0.2, scale: Math.pow(rows, 2.6), pow: 7.2 },
  };
  const { base, scale, pow } = riskCfg[risk];

  const values: number[] = [];
  for (let k = 0; k < slots; k++) {
    const dist = Math.abs(k - center) / center;
    const raw = base + scale * Math.pow(dist, pow);
    values.push(niceRound(Math.max(0.2, raw)));
  }
  return values;
}

function getSlotStyle(mult: number, maxMult: number): { bg: string; border: string; shadow: string } {
  if (mult >= 20) {
    return {
      bg: "linear-gradient(180deg, #ec4899, #be185d)",
      border: "rgba(244, 114, 182, 0.8)",
      shadow: "0 0 16px rgba(236, 72, 153, 0.6)",
    };
  }
  if (mult >= 5) {
    return {
      bg: "linear-gradient(180deg, #f59e0b, #d97706)",
      border: "rgba(251, 191, 36, 0.8)",
      shadow: "0 0 14px rgba(245, 158, 11, 0.5)",
    };
  }
  if (mult >= 1.5) {
    return {
      bg: "linear-gradient(180deg, #8b5cf6, #6d28d9)",
      border: "rgba(167, 139, 250, 0.6)",
      shadow: "0 0 10px rgba(139, 92, 246, 0.4)",
    };
  }
  if (mult >= 1) {
    return {
      bg: "linear-gradient(180deg, #06b6d4, #0e7490)",
      border: "rgba(34, 211, 238, 0.5)",
      shadow: "0 0 8px rgba(6, 182, 212, 0.3)",
    };
  }
  return {
    bg: "linear-gradient(180deg, #374151, #1f2937)",
    border: "rgba(107, 114, 128, 0.4)",
    shadow: "none",
  };
}

let globalBallCounter = 0;

export default function PlinkoGame({
  title,
  name,
  balance,
  change,
  notify,
  back,
}: {
  title: string;
  name: string;
  balance: number;
  change: (d: number, w?: number) => void;
  notify: (m: string) => void;
  back: () => void;
}) {
  const [bet, setBet] = useState(10000);
  const [customBetInput, setCustomBetInput] = useState("10000");
  const [rows, setRows] = useState(12);
  const [risk] = useState<Risk>("High");
  const [balls, setBalls] = useState<Ball[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [flashSlot, setFlashSlot] = useState<number | null>(null);
  const [activePegs, setActivePegs] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAutoDropping, setIsAutoDropping] = useState(false);
  const [lastWinAmt, setLastWinAmt] = useState<number | null>(null);
  const [activeBallsCount, setActiveBallsCount] = useState(0);

  const timers = useRef<number[]>([]);
  const rippleIdCounter = useRef(0);
  const autoIntervalRef = useRef<number | null>(null);
  const historyCounter = useRef(0);

  const multipliers = useMemo(() => getMultipliers(rows, risk), [rows, risk]);
  const maxMult = useMemo(() => Math.max(...multipliers), [multipliers]);

  // Dimensiones del tablero
  const spacingX = rows > 14 ? 34 : rows > 11 ? 40 : 46;
  const spacingY = rows > 14 ? 32 : rows > 11 ? 38 : 44;
  const topPadding = 28;
  const lastRowPegCount = rows + 2;
  const boardWidth = (lastRowPegCount - 1) * spacingX + 60;
  const boardHeight = topPadding + (rows - 1) * spacingY + 60;
  const centerX = boardWidth / 2;

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      if (autoIntervalRef.current) window.clearInterval(autoIntervalRef.current);
    };
  }, []);

  const pegPositions = useMemo(() => {
    const list: { x: number; y: number; row: number; col: number; key: string }[] = [];
    for (let i = 0; i < rows; i++) {
      const count = i + 3;
      const y = topPadding + i * spacingY;
      for (let j = 0; j < count; j++) {
        const x = centerX + (j - (count - 1) / 2) * spacingX;
        list.push({ x, y, row: i, col: j, key: `${i}-${j}` });
      }
    }
    return list;
  }, [rows, centerX, spacingX, spacingY, topPadding]);

  function nearestPegKey(rowIndex: number, x: number) {
    const count = rowIndex + 3;
    let col = Math.round((x - centerX) / spacingX + (count - 1) / 2);
    col = Math.max(0, Math.min(count - 1, col));
    return `${rowIndex}-${col}`;
  }

  function ballX(rightMoves: number, stepsDone: number) {
    return centerX + (2 * rightMoves - stepsDone) * (spacingX / 2);
  }

  function updateBall(id: number, patch: Partial<Ball>) {
    setBalls((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function impact(x: number, y: number, pegKey: string) {
    soundManager.playSFX("plinkoBounce");

    const rid = ++rippleIdCounter.current;
    setRipples((r) => [...r, { id: rid, x, y }]);
    const t1 = window.setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.id !== rid));
    }, 320);
    timers.current.push(t1);

    setActivePegs((prev) => new Set(prev).add(pegKey));
    const t2 = window.setTimeout(() => {
      setActivePegs((prev) => {
        const next = new Set(prev);
        next.delete(pegKey);
        return next;
      });
    }, 180);
    timers.current.push(t2);
  }

  async function runBall(id: number, currentBet: number) {
    let rightMoves = 0;

    for (let k = 1; k <= rows; k++) {
      const goRight = Math.random() < 0.5;
      if (goRight) rightMoves++;

      const pegY = topPadding + (k - 1) * spacingY;
      const newX = ballX(rightMoves, k);
      const hop = 140 + Math.round(Math.random() * 20 - 10);

      if (k === 1) {
        updateBall(id, {
          x: newX,
          y: pegY,
          leftMs: hop,
          topMs: hop,
          topEase: "cubic-bezier(0.55,0,0.85,0.35)",
        });
        await sleep(hop);
        impact(newX, pegY, nearestPegKey(k - 1, newX));
        continue;
      }

      const riseMs = Math.round(hop * 0.38);
      const fallMs = hop - riseMs;
      const bump = Math.min(12, spacingY * 0.32);
      const riseY = pegY - spacingY - bump;

      updateBall(id, {
        x: newX,
        y: riseY,
        leftMs: hop,
        topMs: riseMs,
        topEase: "cubic-bezier(0.33,0,0.67,0)",
      });
      await sleep(riseMs);

      updateBall(id, {
        y: pegY,
        topMs: fallMs,
        topEase: "cubic-bezier(0.55,0,0.85,0.35)",
      });
      await sleep(fallMs);

      impact(newX, pegY, nearestPegKey(k - 1, newX));
    }

    // Caída final a la casilla de multiplicador
    const slotY = topPadding + rows * spacingY + 8;
    updateBall(id, { y: slotY, topMs: 150, topEase: "cubic-bezier(0.55,0,0.85,0.35)" });
    await sleep(150);

    const slot = rightMoves;
    const mult = multipliers[slot] ?? 1;
    const payout = Math.round(currentBet * mult);

    change(payout);
    setLastWinAmt(payout);
    setFlashSlot(slot);

    if (mult >= 10) {
      soundManager.playSFX("jackpot");
      notify(`💥 ¡GRAN PREMIO PLINKO! Multiplicador ${mult}x: ${COP.format(payout)}`);
    } else if (mult >= 1.5) {
      soundManager.playSFX("winCoin");
    } else {
      soundManager.playSFX("plinkoSlot");
    }

    setHistory((prev) => {
      const item: HistoryItem = { id: ++historyCounter.current, mult, win: payout };
      return [item, ...prev.slice(0, 7)];
    });

    const t = window.setTimeout(() => setFlashSlot(null), 550);
    timers.current.push(t);

    await sleep(220);
    setBalls((bs) => bs.filter((b) => b.id !== id));
    setActiveBallsCount((c) => Math.max(0, c - 1));
  }

  const dropBall = useCallback(() => {
    if (balance < bet) {
      notify("Saldo demo insuficiente para esta apuesta.");
      if (isAutoDropping) setIsAutoDropping(false);
      return;
    }

    change(-bet, bet);
    soundManager.playSFX("chip");
    setActiveBallsCount((c) => c + 1);

    const id = ++globalBallCounter;
    const newBall: Ball = {
      id,
      betAmt: bet,
      x: centerX,
      y: topPadding - 24,
      leftMs: 140,
      topMs: 140,
      topEase: "ease-in",
    };
    setBalls((bs) => [...bs, newBall]);
    runBall(id, bet);
  }, [balance, bet, change, centerX, topPadding, isAutoDropping, notify, rows, risk, multipliers]);

  // Manejo de Auto-Drop
  useEffect(() => {
    if (isAutoDropping) {
      autoIntervalRef.current = window.setInterval(() => {
        dropBall();
      }, 350);
    } else {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    }
    return () => {
      if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    };
  }, [isAutoDropping, dropBall]);

  // Cantidad minima y maxima de apuesta
  const handleBetChange = (val: number) => {
    const clamped = Math.max(10000, Math.min(5000000, val));
    setBet(clamped);
    setCustomBetInput(String(clamped));
  };

  const handleBack = () => {
    if (activeBallsCount > 0) {
      notify("⏳ Hay bolas cayendo en el tablero. Espera que finalicen antes de salir.");
      return;
    }
    back();
  };

  return (
    <GameShell title={title} name={name} balance={balance} back={handleBack} showChat={false}>
      <div className="plinko-game-wrapper">
        {/* Panel lateral de controles */}
        <div className="plinko-sidebar">
          {/* Apuesta Header */}
          <div className="plinko-panel-section">
            <div className="plinko-section-title">
              <span>CANTIDAD DE APUESTA</span>
              <span className="plinko-badge">COP</span>
            </div>

            <div className="plinko-bet-input-wrap">
              <span className="plinko-currency-prefix">$</span>
              <input
                type="number"
                className="plinko-bet-input"
                value={customBetInput}
                onChange={(e) => {
                  setCustomBetInput(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n > 0) setBet(n);
                }}
                onBlur={() => handleBetChange(bet)}
              />
              <div className="plinko-bet-quick-actions">
                <button
                  type="button"
                  onClick={() => handleBetChange(Math.floor(bet / 2))}
                  title="Mitad"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => handleBetChange(bet * 2)}
                  title="Doble"
                >
                  2×
                </button>
                <button
                  type="button"
                  onClick={() => handleBetChange(Math.min(balance, 1000000))}
                  title="Máximo"
                >
                  MÁX
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <BetBar bet={bet} setBet={handleBetChange} />
            </div>
          </div>



          {/* Selector de Filas */}
          <div className="plinko-panel-section">
            <div className="plinko-section-title">
              <span>FILAS DE CLAVIJAS ({rows})</span>
              <span style={{ color: "var(--gold)", fontWeight: 800 }}>{rows + 1} CASILLAS</span>
            </div>
            <div className="plinko-rows-grid">
              {ROW_OPTIONS.map((r) => (
                <button
                  key={r}
                  className={`plinko-row-pill ${rows === r ? "active" : ""}`}
                  onClick={() => {
                    if (activeBallsCount === 0) setRows(r);
                    else notify("Espera a que caigan las bolas para cambiar filas.");
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Acciones: Soltar Bola / Auto-Drop */}
          <div className="plinko-action-panel">
            <button
              className="plinko-drop-btn"
              onClick={dropBall}
              disabled={balance < bet}
            >
              <span className="plinko-btn-text">🔴 SOLTAR BOLA</span>
              <span className="plinko-btn-sub">{COP.format(bet)}</span>
            </button>

            <button
              className={`plinko-auto-btn ${isAutoDropping ? "active" : ""}`}
              onClick={() => setIsAutoDropping(!isAutoDropping)}
            >
              {isAutoDropping ? "⏹ DETENER AUTO" : "⚡ MODO CONTINUO (AUTO)"}
            </button>
          </div>
        </div>

        {/* Tablero central y juego Plinko */}
        <div className="plinko-board-wrapper">
          {/* Barra superior de Historial de multiplicadores */}
          <div className="plinko-history-ribbon">
            <span className="plinko-history-label">HISTORIAL:</span>
            <div className="plinko-history-items">
              {history.length === 0 ? (
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  Suelta una bola para ver resultados recientes...
                </span>
              ) : (
                history.map((h) => {
                  const style = getSlotStyle(h.mult, maxMult);
                  return (
                    <div
                      key={h.id}
                      className="plinko-history-chip"
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        boxShadow: style.shadow,
                      }}
                      title={`Ganancia: ${COP.format(h.win)}`}
                    >
                      {h.mult}×
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Contenedor del Tablero Plinko */}
          <div className="plinko-board-container">
            <div
              className="plinko-pegs-area"
              style={{
                position: "relative",
                width: boardWidth,
                height: boardHeight,
                margin: "0 auto",
              }}
            >
              {/* Clavijas / Pins */}
              {pegPositions.map((p) => {
                const isHit = activePegs.has(p.key);
                return (
                  <div
                    key={p.key}
                    className={`plinko-peg ${isHit ? "hit" : ""}`}
                    style={{
                      left: p.x - 4.5,
                      top: p.y - 4.5,
                    }}
                  />
                );
              })}

              {/* Ondas de Choque (Ripples) */}
              {ripples.map((r) => (
                <div
                  key={r.id}
                  className="plinko-ripple-effect"
                  style={{
                    left: r.x - 12,
                    top: r.y - 12,
                  }}
                />
              ))}

              {/* Bolas activas */}
              {balls.map((ball) => (
                <div
                  key={ball.id}
                  className="plinko-ball-orb"
                  style={{
                    left: ball.x - 8,
                    top: ball.y - 8,
                    transition: `left ${ball.leftMs}ms linear, top ${ball.topMs}ms ${ball.topEase}`,
                  }}
                />
              ))}
            </div>

            {/* Casillas de Multiplicadores inferiores */}
            <div
              className="plinko-slots-row"
              style={{
                width: boardWidth,
                margin: "8px auto 0",
              }}
            >
              {multipliers.map((m, i) => {
                const style = getSlotStyle(m, maxMult);
                const isFlashed = flashSlot === i;
                return (
                  <div
                    key={i}
                    className={`plinko-slot-box ${isFlashed ? "flashed" : ""}`}
                    style={{
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      boxShadow: isFlashed
                        ? "0 0 24px rgba(255, 255, 255, 0.9), 0 -6px 12px rgba(236, 72, 153, 0.8)"
                        : style.shadow,
                    }}
                  >
                    <span className="plinko-slot-val">{m}×</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info bar inferior */}
          <div className="plinko-stats-bar">
            <Box label="APUESTA TOTAL" value={COP.format(bet)} />
            <Box label="BOLAS ACTIVAS" value={String(activeBallsCount)} />
            <Box
              label="ÚLTIMO PREMIO"
              value={lastWinAmt !== null ? COP.format(lastWinAmt) : "—"}
            />
            <Box
              label="MÁX. MULTIPLICADOR"
              value={`${maxMult}× (${COP.format(bet * maxMult)})`}
            />
          </div>
        </div>
      </div>
    </GameShell>
  );
}
