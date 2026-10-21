import React, { useState, useRef } from "react";
import GameShell from "./shared/GameShell";
import BetBar from "./shared/BetBar";
import Box from "./shared/Box";
import { COP, chips } from "../../data/games";
import { soundManager } from "../../utils/soundManager";

const SLOT_THEMES: Record<
  string,
  {
    name: string;
    symbols: string[];
    accent: string;
    bg1: string;
    bg2: string;
    icon: string;
    panelBg: string;
    panelBorderColor: string;
    panelShadow: string;
  }
> = {
  sl1: {
    name: "Dulce Fortuna",
    symbols: ["🍬", "🍭", "🍫", "🍓", "🍇", "💎", "👑"],
    accent: "#ff5ec4",
    bg1: "#3a1030",
    bg2: "#160a16",
    icon: "🍭",
    panelBg:
      "radial-gradient(ellipse at 50% 25%, #4f0e42 0%, #2b0829 45%, #130315 100%)",
    panelBorderColor: "rgba(255, 94, 196, 0.45)",
    panelShadow:
      "inset 0 0 90px rgba(0, 0, 0, 0.65), 0 0 45px rgba(255, 94, 196, 0.25)",
  },
  sl2: {
    name: "Tesoro Azteca",
    symbols: ["🗿", "🐍", "☀️", "🏺", "💰", "💎", "👑"],
    accent: "#2ee6a8",
    bg1: "#0f2e22",
    bg2: "#0a1712",
    icon: "🗿",
    panelBg:
      "radial-gradient(ellipse at 50% 25%, #0d3829 0%, #061f17 45%, #030e0a 100%)",
    panelBorderColor: "rgba(46, 230, 168, 0.4)",
    panelShadow:
      "inset 0 0 90px rgba(0, 0, 0, 0.65), 0 0 45px rgba(46, 230, 168, 0.2)",
  },
  sl3: {
    name: "Dragón Dorado",
    symbols: ["🐉", "🔥", "⚡", "🏮", "💎", "7️⃣", "👑"],
    accent: "#ff5230",
    bg1: "#3a1408",
    bg2: "#160806",
    icon: "🐉",
    panelBg:
      "radial-gradient(ellipse at 50% 25%, #4e1505 0%, #270a03 45%, #110401 100%)",
    panelBorderColor: "rgba(255, 82, 48, 0.45)",
    panelShadow:
      "inset 0 0 90px rgba(0, 0, 0, 0.65), 0 0 45px rgba(255, 82, 48, 0.25)",
  },
  sl4: {
    name: "Jackpot Imperial",
    symbols: ["👑", "💰", "⭐", "🎰", "💎", "7️⃣", "🔔"],
    accent: "#c39bff",
    bg1: "#241633",
    bg2: "#0e0a16",
    icon: "👑",
    panelBg:
      "radial-gradient(ellipse at 50% 25%, #351354 0%, #1d0930 45%, #0b0314 100%)",
    panelBorderColor: "rgba(195, 155, 255, 0.45)",
    panelShadow:
      "inset 0 0 90px rgba(0, 0, 0, 0.65), 0 0 45px rgba(195, 155, 255, 0.25)",
  },
  sl5: {
    name: "Frutas Explosivas",
    symbols: ["🍒", "🍋", "🍇", "🍉", "🍓", "⭐", "💎"],
    accent: "#4be05b",
    bg1: "#123018",
    bg2: "#0a170c",
    icon: "🍉",
    panelBg:
      "radial-gradient(ellipse at 50% 25%, #183e18 0%, #0d220d 45%, #051005 100%)",
    panelBorderColor: "rgba(75, 224, 91, 0.4)",
    panelShadow:
      "inset 0 0 90px rgba(0, 0, 0, 0.65), 0 0 45px rgba(75, 224, 91, 0.2)",
  },
  sl6: {
    name: "Siete Dorado",
    symbols: ["7️⃣", "🔔", "🍒", "⭐", "💎", "🍋", "👑"],
    accent: "#3fb6ff",
    bg1: "#0e1a3a",
    bg2: "#080c16",
    icon: "7️⃣",
    panelBg:
      "radial-gradient(ellipse at 50% 25%, #0e2752 0%, #07142d 45%, #030917 100%)",
    panelBorderColor: "rgba(63, 182, 255, 0.45)",
    panelShadow:
      "inset 0 0 90px rgba(0, 0, 0, 0.65), 0 0 45px rgba(63, 182, 255, 0.25)",
  },
};

const SLOT_PAY: Record<number, number> = {
  0: 2,
  1: 3,
  2: 5,
  3: 8,
  4: 12,
  5: 25,
  6: 80,
};
const SLOT_WEIGHTS = [30, 24, 18, 13, 8, 5, 2];
const REEL_STOP_MS = [900, 1200, 1550];
const ROW_H = 92;

function weightedSymbolIndex(): number {
  const total = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SLOT_WEIGHTS.length; i++) {
    r -= SLOT_WEIGHTS[i];
    if (r <= 0) return i;
  }
  return 0;
}

function randomSymbol(syms: string[]): string {
  return syms[weightedSymbolIndex()];
}

function buildStrip(syms: string[], finalCol: string[], padCount: number) {
  const strip: string[] = [];
  for (let i = 0; i < padCount; i++) strip.push(randomSymbol(syms));
  finalCol.forEach((s) => strip.push(s));
  return strip;
}

export const SLOT_CHIPS = [3000, 5000, 10000, 15000];

export default function Slots({
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
  // Find theme matching title or default to sl1
  const themeEntry =
    Object.values(SLOT_THEMES).find((t) => t.name === title) ||
    SLOT_THEMES["sl1"];

  const [betPerLine, setBetPerLine] = useState(3000);
  const [activeRows, setActiveRows] = useState<number[]>([0, 1, 2]);
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState<string[][]>(() =>
    [0, 1, 2].map(() => [0, 1, 2].map(() => randomSymbol(themeEntry.symbols)))
  );
  const [strips, setStrips] = useState<string[][]>(grid);
  const [reelTransforms, setReelTransforms] = useState<string[]>([
    "translateY(0)",
    "translateY(0)",
    "translateY(0)",
  ]);
  const [reelTransitions, setReelTransitions] = useState<string[]>([
    "none",
    "none",
    "none",
  ]);
  const [isReelSpinning, setIsReelSpinning] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [winCells, setWinCells] = useState<{ col: number; row: number }[]>([]);
  const [bigWin, setBigWin] = useState(false);
  const [resultBanner, setResultBanner] = useState<{
    label: string;
    netWin: number;
    cls: string;
  } | null>(null);

  const totalBet = betPerLine * activeRows.length;

  const selectHileraCount = (count: number) => {
    if (spinning) return;
    soundManager.playSFX("chip");
    if (count === 1) {
      setActiveRows([1]); // Línea 1 (Central)
    } else if (count === 2) {
      setActiveRows([0, 1]); // Líneas 2 y 1 (Superior + Central)
    } else {
      setActiveRows([0, 1, 2]); // Todas las 3 hileras
    }
  };

  const toggleRow = (rowIdx: number) => {
    if (spinning) return;
    soundManager.playSFX("chip");
    setActiveRows((prev) => {
      if (prev.includes(rowIdx)) {
        if (prev.length === 1) {
          notify("Debes jugar con al menos 1 hilera.");
          return prev;
        }
        return prev.filter((r) => r !== rowIdx);
      } else {
        return [...prev, rowIdx].sort();
      }
    });
  };

  const spin = () => {
    if (balance < totalBet) {
      notify("Saldo insuficiente.");
      return;
    }

    change(-totalBet, totalBet);
    setSpinning(true);
    setBigWin(false);
    setWinCells([]);
    setResultBanner(null);
    soundManager.stopSFX("winCoin");
    soundManager.playSFX("slotsSpin");

    const syms = themeEntry.symbols;
    const finalGrid: string[][] = [[], [], []];
    for (let reel = 0; reel < 3; reel++) {
      for (let row = 0; row < 3; row++) {
        finalGrid[reel][row] = randomSymbol(syms);
      }
    }

    const newStrips: string[][] = [];
    const padCounts = [14, 18, 22];
    for (let r = 0; r < 3; r++) {
      newStrips.push(buildStrip(syms, finalGrid[r], padCounts[r]));
    }
    setStrips(newStrips);
    setIsReelSpinning([true, true, true]);
    setReelTransitions(["none", "none", "none"]);
    setReelTransforms(["translateY(0)", "translateY(0)", "translateY(0)"]);

    setTimeout(() => {
      setReelTransitions([
        `transform ${REEL_STOP_MS[0]}ms cubic-bezier(.13,.82,.16,1.005)`,
        `transform ${REEL_STOP_MS[1]}ms cubic-bezier(.13,.82,.16,1.005)`,
        `transform ${REEL_STOP_MS[2]}ms cubic-bezier(.13,.82,.16,1.005)`,
      ]);
      setReelTransforms([
        `translateY(-${padCounts[0] * ROW_H}px)`,
        `translateY(-${padCounts[1] * ROW_H}px)`,
        `translateY(-${padCounts[2] * ROW_H}px)`,
      ]);

      REEL_STOP_MS.forEach((ms, idx) => {
        setTimeout(() => {
          setIsReelSpinning((prev) => {
            const next = [...prev];
            next[idx] = false;
            return next;
          });
        }, ms - 120);
      });
    }, 50);

    setTimeout(() => {
      setGrid(finalGrid);
      setStrips(finalGrid);
      setReelTransitions(["none", "none", "none"]);
      setReelTransforms(["translateY(0)", "translateY(0)", "translateY(0)"]);
      setSpinning(false);

      // Evaluate active hileras (horizontal rows)
      const rowDefs = [
        {
          row: 0,
          name: "Hilera Superior",
          cells: [
            [0, 0],
            [1, 0],
            [2, 0],
          ],
        },
        {
          row: 1,
          name: "Hilera Central",
          cells: [
            [0, 1],
            [1, 1],
            [2, 1],
          ],
        },
        {
          row: 2,
          name: "Hilera Inferior",
          cells: [
            [0, 2],
            [1, 2],
            [2, 2],
          ],
        },
      ];

      // Check if all 9 positions have the exact same emoji
      const firstSym = finalGrid[0][0];
      const isFullBoard = [0, 1, 2].every((c) =>
        [0, 1, 2].every((r) => finalGrid[c][r] === firstSym)
      );
      const allRowsActive = [0, 1, 2].every((r) => activeRows.includes(r));

      let winnings = 0;
      let matchedCells: { col: number; row: number }[] = [];
      let isSpecialJackpot = false;

      if (isFullBoard && allRowsActive) {
        // Automatic 30 million jackpot for filling all 3 active hileras with the same emoji!
        isSpecialJackpot = true;
        winnings = 30000000;
        matchedCells = [
          { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
          { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 },
          { col: 0, row: 2 }, { col: 1, row: 2 }, { col: 2, row: 2 },
        ];
      } else {
        // Standard active hileras evaluation
        rowDefs
          .filter((def) => activeRows.includes(def.row))
          .forEach(({ cells }) => {
            const vals = cells.map(([c, r]) => finalGrid[c][r]);
            if (vals[0] === vals[1] && vals[1] === vals[2]) {
              const idx = syms.indexOf(vals[0]);
              winnings += betPerLine * (SLOT_PAY[idx] || 2);
              cells.forEach(([c, r]) => matchedCells.push({ col: c, row: r }));
            }
          });
      }

      setWinCells(matchedCells);

      if (winnings > 0) {
        change(winnings);
        const isBig = isSpecialJackpot || winnings >= totalBet * 10;
        setBigWin(isBig);
        if (isSpecialJackpot) {
          setResultBanner({
            label: "💎 ¡SUPER JACKPOT 30M! (Pantalla Completa)",
            netWin: winnings,
            cls: "win",
          });
          notify(
            `💎 ¡INCREÍBLE! ¡Todas las hileras con ${firstSym}! ¡Ganaste $30.000.000 COP automáticos!`
          );
          soundManager.playSFX("jackpot");
        } else {
          setResultBanner({
            label: `${isBig ? "🎉 GRAN PREMIO · " : ""}¡GANASTE!`,
            netWin: winnings,
            cls: "win",
          });
          notify(
            `¡${isBig ? "GRAN PREMIO! " : ""}Ganaste ${COP.format(winnings)}!`
          );
          if (isBig) {
            soundManager.playSFX("jackpot");
          } else {
            soundManager.playSFX("winCoin");
          }
        }
      } else {
        soundManager.playSFX("bust");
        setResultBanner({
          label: "Sin premio esta vez",
          netWin: -totalBet,
          cls: "lose",
        });
      }

      // If full board occurred but not all rows were active, show informative tip
      if (isFullBoard && !allRowsActive) {
        notify(
          "ℹ️ ¡Pantalla completa! Para activar el Jackpot de $30.000.000 COP debes jugar con las 3 hileras activas."
        );
      }
    }, REEL_STOP_MS[2] + 100);
  };

  const handleBack = () => {
    if (spinning) {
      notify("🔒 Espera a que los rodillos terminen de girar.");
      return;
    }
    back();
  };

  return (
    <GameShell
      title={title}
      name={name}
      balance={balance}
      back={handleBack}
      tableStyle={{
        background: themeEntry.panelBg,
        border: `1px solid ${themeEntry.panelBorderColor}`,
        boxShadow: themeEntry.panelShadow,
      }}
      tableClassName="slot-theme-panel"
    >
      <div className="slot-machine">
        <div className="slot-stage-wrap">
          <div
            className={`slot-cabinet ${bigWin ? "big-win" : ""}`}
            style={
              {
                "--slot-accent": themeEntry.accent,
                "--slot-bg1": themeEntry.bg1,
                "--slot-bg2": themeEntry.bg2,
              } as React.CSSProperties
            }
          >
            <div className="slot-marquee">
              <span className="ic">{themeEntry.icon}</span>
              {themeEntry.name}
            </div>

            <div className="slot-reels-stage">
              <div className="payline-column left">
                <button
                  type="button"
                  className={`payline-tag ${activeRows.includes(0) ? "active" : ""}`}
                  onClick={() => toggleRow(0)}
                  disabled={spinning}
                  title="Línea 2 (Hilera Superior)"
                >
                  <span className="pl-num">2</span>
                  <span className="pl-dot" />
                </button>
                <button
                  type="button"
                  className={`payline-tag ${activeRows.includes(1) ? "active" : ""}`}
                  onClick={() => toggleRow(1)}
                  disabled={spinning}
                  title="Línea 1 (Hilera Central)"
                >
                  <span className="pl-num">1</span>
                  <span className="pl-dot" />
                </button>
                <button
                  type="button"
                  className={`payline-tag ${activeRows.includes(2) ? "active" : ""}`}
                  onClick={() => toggleRow(2)}
                  disabled={spinning}
                  title="Línea 3 (Hilera Inferior)"
                >
                  <span className="pl-num">3</span>
                  <span className="pl-dot" />
                </button>
              </div>

              <div className="reels">
                {[0, 1, 2].map((ri) => (
                  <div
                    key={ri}
                    className={`reel ${isReelSpinning[ri] ? "is-spinning" : ""}`}
                  >
                    <div
                      className="reel-strip"
                      style={{
                        transform: reelTransforms[ri],
                        transition: reelTransitions[ri],
                      }}
                    >
                      {strips[ri].map((s, row) => {
                        const isWin = winCells.some(
                          (c) => c.col === ri && c.row === row
                        );
                        const isInactive = !spinning && !activeRows.includes(row);
                        return (
                          <div
                            key={row}
                            className={`sym ${isWin ? "win-sym" : ""} ${
                              isInactive ? "inactive-sym" : ""
                            }`}
                          >
                            {s}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="payline-column right">
                <button
                  type="button"
                  className={`payline-tag ${activeRows.includes(0) ? "active" : ""}`}
                  onClick={() => toggleRow(0)}
                  disabled={spinning}
                  title="Línea 2 (Hilera Superior)"
                >
                  <span className="pl-num">2</span>
                  <span className="pl-dot" />
                </button>
                <button
                  type="button"
                  className={`payline-tag ${activeRows.includes(1) ? "active" : ""}`}
                  onClick={() => toggleRow(1)}
                  disabled={spinning}
                  title="Línea 1 (Hilera Central)"
                >
                  <span className="pl-num">1</span>
                  <span className="pl-dot" />
                </button>
                <button
                  type="button"
                  className={`payline-tag ${activeRows.includes(2) ? "active" : ""}`}
                  onClick={() => toggleRow(2)}
                  disabled={spinning}
                  title="Línea 3 (Hilera Inferior)"
                >
                  <span className="pl-num">3</span>
                  <span className="pl-dot" />
                </button>
              </div>
            </div>

            <div className="slot-lines">
              {activeRows.length}{" "}
              {activeRows.length === 1 ? "hilera activa" : "hileras activas"} ·{" "}
              <b>3 símbolos iguales</b> en una hilera = premio
            </div>

            <div className="slot-special-rule">
              <span className="sr-icon">💎</span>
              <span>
                <b>Jackpot 30M:</b> Mismo emoji en toda la pantalla con las <b>3 hileras activas</b> paga <b>$30.000.000 COP</b> automáticamente.
              </span>
            </div>
          </div>

          <div className="slot-side-action">
            <button
              type="button"
              className={`slot-spin-hero-btn ${spinning ? "is-spinning" : ""}`}
              onClick={spin}
              disabled={spinning || balance < totalBet}
              title="Girar los rodillos"
            >
              <div className="hero-btn-content">
                <span className="hero-spin-icon">{spinning ? "⚡" : "🎰"}</span>
                <span className="hero-spin-title">{spinning ? "GIRANDO" : "GIRAR"}</span>
                <span className="hero-spin-bet">{COP.format(totalBet)}</span>
              </div>
            </button>
          </div>
        </div>

        {resultBanner && (
          <div className={`result-banner ${resultBanner.cls}`}>
            {resultBanner.label} · {resultBanner.netWin >= 0 ? "+" : ""}
            {COP.format(resultBanner.netWin)}
          </div>
        )}
      </div>

      <div className="controls-bar">
        <div className="bet-readout">
          <Box label="APUESTA POR HILERA" value={COP.format(betPerLine)} />
          <Box label="HILERAS ACTIVAS" value={`${activeRows.length} de 3`} />
          <Box label="APUESTA TOTAL" value={COP.format(totalBet)} />
          <Box label="SALDO" value={COP.format(balance)} />
        </div>

        <div className="hilera-selector-wrap">
          <div className="hilera-header">
            <span>🎯 HILERAS A JUGAR</span>
            <span className="hilera-badge-info">
              {activeRows.length === 1
                ? "1 Hilera (Central)"
                : activeRows.length === 2
                ? "2 Hileras (Central + Superior)"
                : "3 Hileras (⭐ Jackpot 30M Activo)"}
            </span>
          </div>
          <div className="hilera-btn-group">
            <button
              type="button"
              className={`hilera-btn ${activeRows.length === 1 ? "selected" : ""}`}
              onClick={() => selectHileraCount(1)}
              disabled={spinning}
            >
              <div className="h-top">
                <span>⭐</span> 1 HILERA
              </div>
              <div className="h-sub">Fila Central</div>
            </button>
            <button
              type="button"
              className={`hilera-btn ${activeRows.length === 2 ? "selected" : ""}`}
              onClick={() => selectHileraCount(2)}
              disabled={spinning}
            >
              <div className="h-top">
                <span>⚡</span> 2 HILERAS
              </div>
              <div className="h-sub">Superior + Central</div>
            </button>
            <button
              type="button"
              className={`hilera-btn ${activeRows.length === 3 ? "selected" : ""}`}
              onClick={() => selectHileraCount(3)}
              disabled={spinning}
            >
              <div className="h-top">
                <span>🔥</span> 3 HILERAS
              </div>
              <div className="h-sub">Todas las filas</div>
            </button>
          </div>
          <div className="hilera-pills-row">
            <button
              type="button"
              className={`hilera-pill ${activeRows.includes(0) ? "active" : ""}`}
              onClick={() => toggleRow(0)}
              disabled={spinning}
            >
              Línea 2 (Superior)
            </button>
            <button
              type="button"
              className={`hilera-pill ${activeRows.includes(1) ? "active" : ""}`}
              onClick={() => toggleRow(1)}
              disabled={spinning}
            >
              Línea 1 (Central)
            </button>
            <button
              type="button"
              className={`hilera-pill ${activeRows.includes(2) ? "active" : ""}`}
              onClick={() => toggleRow(2)}
              disabled={spinning}
            >
              Línea 3 (Inferior)
            </button>
          </div>
        </div>

        {!spinning && (
          <BetBar
            bet={betPerLine}
            setBet={setBetPerLine}
            chips={SLOT_CHIPS}
            formatLabel={(n) => `${n / 1000}mil`}
          />
        )}
      </div>
    </GameShell>
  );
}
