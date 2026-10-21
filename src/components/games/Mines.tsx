import React, { useState } from "react";
import GameShell from "./shared/GameShell";
import BetBar from "./shared/BetBar";
import Box from "./shared/Box";
import { COP, chips } from "../../data/games";
import { soundManager } from "../../utils/soundManager";

function mineMultiplier(k: number, minesCount: number, size = 25) {
  let mult = 1;
  let remaining = size;
  for (let i = 0; i < k; i++) {
    const pSafe = (remaining - minesCount) / remaining;
    mult *= 1 / pSafe;
    remaining--;
  }
  return mult * 0.96;
}

export default function Mines({
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
  const [size] = useState(25);
  const [minesCount, setMinesCount] = useState(3);
  const [bet, setBet] = useState(25000);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [active, setActive] = useState(false);
  const [safePicks, setSafePicks] = useState(0);
  const [resultBanner, setResultBanner] = useState<{
    label: string;
    netWin: number;
    cls: string;
  } | null>(null);

  const curMult = mineMultiplier(safePicks, minesCount, size);
  const potential = bet * curMult;

  const startRound = () => {
    if (balance < bet) {
      notify("Saldo insuficiente.");
      return;
    }

    change(-bet, bet);
    soundManager.playSFX('chip');
    const newMines = new Set<number>();
    while (newMines.size < minesCount) {
      newMines.add(Math.floor(Math.random() * size));
    }

    setMines(newMines);
    setRevealed(new Set());
    setSafePicks(0);
    setActive(true);
    setResultBanner(null);
    notify(`Ronda iniciada con ${minesCount} minas. ¡Suerte!`);
  };

  const pickCell = (i: number) => {
    if (!active || revealed.has(i)) return;

    const newRev = new Set(revealed);
    newRev.add(i);

    if (mines.has(i)) {
      // Hit a bomb -> reveal all
      for (let k = 0; k < size; k++) newRev.add(k);
      setRevealed(newRev);
      setActive(false);
      soundManager.playSFX('minesExplosion');
      setResultBanner({
        label: "¡Mina encontrada!",
        netWin: -bet,
        cls: "lose",
      });
      notify(`💣 ¡Boom! Perdiste ${COP.format(bet)}.`);
    } else {
      setRevealed(newRev);
      setSafePicks((s) => s + 1);
      soundManager.playSFX('minesSafe');
    }
  };

  const cashout = () => {
    if (!active || safePicks === 0) return;
    const payout = bet * curMult;
    change(payout);
    setActive(false);
    soundManager.playSFX('minesCashout');
    setResultBanner({
      label: `Retiraste con ${curMult.toFixed(2)}x`,
      netWin: payout,
      cls: "win",
    });
    notify(
      `Retiraste con ${curMult.toFixed(2)}x: ganaste ${COP.format(payout)}.`
    );
  };

  const handleBack = () => {
    if (active) {
      notify("🔒 Tienes una partida activa. Retírate o termina la ronda antes de salir.");
      return;
    }
    back();
  };

  return (
    <GameShell title={title} name={name} balance={balance} back={handleBack}>
      <div className="mines-container">
        {/* Left Side: Chips, Mines Selector & Bet/Cashout Controls */}
        <div className="mines-sidebar">
          <div className="mines-readout">
            <div className="box">
              <span>SALDO</span>
              <b>{COP.format(balance)}</b>
            </div>
            <div className="box highlight">
              <span>APUESTA</span>
              <b>{COP.format(bet)}</b>
            </div>
            <div className="box highlight-gold">
              <span>MINAS</span>
              <b>{minesCount} 💣</b>
            </div>
          </div>

          {/* Mines Count Selector */}
          <div className="mines-control-group">
            <div className="control-group-title">
              <span>💣 CANTIDAD DE MINAS</span>
              <span className="control-group-val">{minesCount} minas</span>
            </div>
            <div className="mines-setup-buttons">
              {[3, 5, 10, 20].map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={active}
                  className={`mine-count-btn ${minesCount === m ? "active" : ""}`}
                  onClick={() => {
                    if (!active) {
                      setMinesCount(m);
                      soundManager.playSFX("chip");
                    }
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Chips Selector (Fichas) */}
          <div className="mines-control-group">
            <div className="control-group-title">
              <span>🪙 SELECCIONA TU FICHA</span>
              <span className="control-group-val">{COP.format(bet)}</span>
            </div>
            <div className={`mines-chips-wrap ${active ? "is-disabled" : ""}`}>
              <BetBar bet={bet} setBet={setBet} />
            </div>
          </div>

          {/* Live Game Stats when Active */}
          {active && (
            <div className="mines-live-card">
              <div className="live-stat-row">
                <span>Multiplicador actual:</span>
                <b className="stat-gold">{curMult.toFixed(2)}x</b>
              </div>
              <div className="live-stat-row">
                <span>Ganancia potencial:</span>
                <b className="stat-green">{COP.format(potential)}</b>
              </div>
              <div className="live-stat-row">
                <span>Gemas descubiertas:</span>
                <b>{safePicks} de {size - minesCount} 💎</b>
              </div>
            </div>
          )}

          {/* Bet / Cashout Button */}
          <div className="mines-action-wrap">
            {!active ? (
              <button
                type="button"
                className={`btn-mines-bet ${balance >= bet ? "ready" : ""}`}
                onClick={startRound}
                disabled={balance < bet}
                title="Iniciar ronda de Minas"
              >
                <span className="btn-mines-icon">🎮</span>
                <div className="btn-mines-text">
                  <span className="btn-mines-title">INICIAR RONDA</span>
                  <span className="btn-mines-sub">Apostar {COP.format(bet)}</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                className={`btn-mines-cashout ${safePicks > 0 ? "can-cashout" : ""}`}
                onClick={cashout}
                disabled={safePicks === 0}
                title={safePicks === 0 ? "Destapa al menos una gema" : "Retirar premio"}
              >
                <span className="btn-mines-icon">💰</span>
                <div className="btn-mines-text">
                  <span className="btn-mines-title">
                    {safePicks === 0 ? "ELIGE UNA CASILLA" : "RETIRAR PREMIO"}
                  </span>
                  <span className="btn-mines-sub">
                    {safePicks === 0
                      ? "Descubre una gema para cobrar"
                      : COP.format(potential)}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Mines Board Grid */}
        <div className="mines-board-area">
          <div className="mines-board-header">
            {active ? (
              <div className="mines-active-banner">
                <span>💎 Ronda en juego: destapa casillas seguras sin tocar minas</span>
              </div>
            ) : (
              <div className="mines-idle-banner">
                <span>Elige tus minas y tu ficha a la izquierda, luego presiona Iniciar Ronda</span>
              </div>
            )}
          </div>

          <div className="mines-grid">
            {Array.from({ length: size }, (_, i) => {
              const isRev = revealed.has(i);
              const isMine = mines.has(i);
              let cls = "mine-cell";
              let content = "";
              if (isRev) {
                cls += " revealed " + (isMine ? "bomb" : "safe");
                content = isMine ? "💣" : "💎";
              }
              return (
                <div
                  key={i}
                  className={cls}
                  onClick={() => pickCell(i)}
                >
                  {content}
                </div>
              );
            })}
          </div>

          {resultBanner && (
            <div className={`result-banner ${resultBanner.cls} mines-result-banner`}>
              {resultBanner.label} · {resultBanner.netWin >= 0 ? "+" : ""}
              {COP.format(resultBanner.netWin)}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
