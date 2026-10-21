import React, { useState, useRef } from "react";
import GameShell from "./shared/GameShell";
import BetBar from "./shared/BetBar";
import Box from "./shared/Box";
import { COP, chips } from "../../data/games";
import { soundManager } from "../../utils/soundManager";

const RED_NUMS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const WHEEL_STEP = 360 / WHEEL_ORDER.length;

function numColor(n: number) {
  if (n === 0) return "green";
  return RED_NUMS.includes(n) ? "red" : "black";
}

function wheelColorHex(n: number) {
  if (n === 0) return "#0f8f4f";
  return RED_NUMS.includes(n) ? "#c62840" : "#14161c";
}

function buildWheelGradient() {
  const stops = WHEEL_ORDER.map(
    (n, i) =>
      `${wheelColorHex(n)} ${(i * WHEEL_STEP).toFixed(2)}deg ${(
        (i + 1) *
        WHEEL_STEP
      ).toFixed(2)}deg`
  );
  return `conic-gradient(${stops.join(",")})`;
}

function isOutsideWin(key: string, n: number) {
  if (n === 0) return false;
  const color = numColor(n);
  if (key === "red") return color === "red";
  if (key === "black") return color === "black";
  if (key === "even") return n % 2 === 0;
  if (key === "odd") return n % 2 === 1;
  if (key === "low") return n >= 1 && n <= 18;
  if (key === "high") return n >= 19 && n <= 36;
  if (key === "dozen1") return n >= 1 && n <= 12;
  if (key === "dozen2") return n >= 13 && n <= 24;
  if (key === "dozen3") return n >= 25 && n <= 36;
  return false;
}

function mod360(x: number) {
  return ((x % 360) + 360) % 360;
}

function formatStake(n: number) {
  if (n >= 1000000) {
    const m = n / 1000000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `$${Math.round(n / 1000)}K`;
}

export default function Roulette({
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
  const [bets, setBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const isVip = title.toLowerCase().includes("vip");
  const [selectedChip, setSelectedChip] = useState(isVip ? 200000 : 25000);
  const [customChipInput, setCustomChipInput] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [wheelRot, setWheelRot] = useState(0);
  const [ballRot, setBallRot] = useState(0);
  const [resultBanner, setResultBanner] = useState<{
    label: string;
    netWin: number;
    cls: string;
  } | null>(null);

  const [lightningActive, setLightningActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
  const lastBetsTotal = Object.values(lastBets).reduce((a, b) => a + b, 0);

  const handleBetClick = (key: string) => {
    if (spinning || lightningActive) return;
    if (balance < totalBet + selectedChip) {
      notify("Saldo insuficiente.");
      return;
    }
    setBets((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + selectedChip,
    }));
    soundManager.playSFX('chip');
  };

  const clearBets = () => {
    if (spinning || lightningActive) return;
    setBets({});
  };

  const executeSpin = () => {
    setSpinning(true);
    soundManager.playSFX('rouletteSpin');

    const nextWheelRot =
      wheelRot + 360 * (6 + Math.floor(Math.random() * 3)) + Math.random() * 360;
    const nextBallRot =
      ballRot - 360 * (8 + Math.floor(Math.random() * 3)) - Math.random() * 360;

    setWheelRot(nextWheelRot);
    setBallRot(nextBallRot);

    setTimeout(() => {
      const ballScreenAngle = mod360(nextBallRot);
      const localAngle = mod360(ballScreenAngle - nextWheelRot);
      const idx = Math.floor(localAngle / WHEEL_STEP) % WHEEL_ORDER.length;
      const n = WHEEL_ORDER[idx];

      finishSpin(n);
    }, 4350);
  };

  const spin = () => {
    if (totalBet <= 0) {
      notify("Coloca al menos una apuesta.");
      return;
    }
    if (balance < totalBet) {
      notify("Saldo insuficiente.");
      return;
    }

    change(-totalBet, totalBet);
    setResultBanner(null);

    const isLightningRoulette =
      title.toLowerCase().includes("relampago") ||
      title.toLowerCase().includes("relámpago") ||
      name.toLowerCase().includes("relampago") ||
      name.toLowerCase().includes("relámpago");

    if (isLightningRoulette) {
      setLightningActive(true);
      soundManager.playSFX('lightningEffect');
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }

      // Allow the lightning animation to play before wheel starts spinning
      setTimeout(() => {
        soundManager.stopSFX('lightningEffect');
        setLightningActive(false);
        executeSpin();
      }, 2200);
    } else {
      executeSpin();
    }
  };

  const finishSpin = (n: number) => {
    soundManager.stopSFX('rouletteSpin');
    let winnings = 0;
    Object.entries(bets).forEach(([key, amt]) => {
      if (key.startsWith("n")) {
        const num = Number(key.slice(1));
        if (num === n) winnings += amt * 36;
      } else {
        if (isOutsideWin(key, n)) {
          const mult = key.startsWith("dozen") ? 3 : 2;
          winnings += amt * mult;
        }
      }
    });

    if (winnings > 0) {
      change(winnings);
      soundManager.playSFX('winCoin');
    } else {
      soundManager.playSFX('bust');
    }

    setSpinning(false);
    setLastResult(n);

    const net = winnings - totalBet;
    if (winnings > 0) {
      setResultBanner({
        label: `Salió el ${n} (${numColor(n).toUpperCase()})`,
        netWin: net,
        cls: "win",
      });
      notify(`Salió el ${n}. ¡Ganaste ${COP.format(winnings)}!`);
    } else {
      setResultBanner({
        label: `Salió el ${n} (${numColor(n).toUpperCase()})`,
        netWin: -totalBet,
        cls: "lose",
      });
      notify(`Salió el ${n}. Sin suerte esta vez.`);
    }

    setLastBets(bets);
    setBets({});
  };

  const repeatBet = () => {
    if (spinning || lightningActive) return;
    if (lastBetsTotal <= 0) {
      notify("No hay apuesta anterior para repetir.");
      return;
    }
    if (balance < lastBetsTotal) {
      notify("Saldo insuficiente para repetir la apuesta.");
      return;
    }
    setBets(lastBets);
    soundManager.playSFX('chip');
    notify(`Apuesta repetida: ${COP.format(lastBetsTotal)}`);
  };

  // Build rows for 1..36
  const rows: number[][] = [[], [], []];
  for (let col = 1; col <= 12; col++) {
    for (let r = 0; r < 3; r++) {
      const n = col * 3 - r;
      rows[r].push(n);
    }
  }

  const outsideBets = [
    { key: "dozen1", label: "1-12" },
    { key: "dozen2", label: "13-24" },
    { key: "dozen3", label: "25-36" },
    { key: "low", label: "1-18" },
    { key: "even", label: "PAR" },
    { key: "red", label: "ROJO" },
    { key: "black", label: "NEGRO" },
    { key: "odd", label: "IMPAR" },
    { key: "high", label: "19-36" },
  ];

  const handleBack = () => {
    if (spinning || lightningActive) {
      notify("🔒 Espera a que termine la jugada de ruleta.");
      return;
    }
    back();
  };

  return (
    <GameShell title={title} name={name} balance={balance} back={handleBack} showChat={isVip}>
      <div className="roulette-stage">
        <div className="roulette-wheel-block">
          <div className="wheel-wrap">
            <div className="wheel-rim"></div>
            <div
              className="wheel-numbers"
              style={{
                background: buildWheelGradient(),
                transform: `rotate(${wheelRot}deg)`,
                transition: spinning
                  ? "transform 4.2s cubic-bezier(.12,.72,.13,1)"
                  : "none",
              }}
            >
              {WHEEL_ORDER.map((n, i) => {
                const angle = i * WHEEL_STEP + WHEEL_STEP / 2;
                const rad = ((angle - 90) * Math.PI) / 180;
                const x = Math.cos(rad) * 90;
                const y = Math.sin(rad) * 90;
                return (
                  <span
                    key={i}
                    className="seg-label"
                    style={{
                      transform: `translate(${x.toFixed(2)}px, ${y.toFixed(
                        2
                      )}px)`,
                    }}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
            <div
              className="wheel-ball-track"
              style={{
                transform: `rotate(${ballRot}deg)`,
                transition: spinning
                  ? "transform 3.6s cubic-bezier(.1,.7,.15,1)"
                  : "none",
              }}
            >
              <div className="wheel-ball"></div>
            </div>
            <div className="wheel-hub"></div>
            {lightningActive && (
              <div className="wheel-lightning-overlay">
                <video
                  ref={videoRef}
                  src="/assets/lightning_effect.mp4"
                  autoPlay
                  muted
                  playsInline
                  className="wheel-lightning-video"
                />
              </div>
            )}
          </div>
          <div className="spin-status">
            {lightningActive ? "⚡ ¡CARGA RELÁMPAGO! ⚡" : spinning ? "Girando..." : ""}
          </div>
          <div className="roulette-result">
            {!spinning && !lightningActive && lastResult !== null && (
              <div
                className="num"
                style={{
                  background:
                    numColor(lastResult) === "red"
                      ? "#c62840"
                      : numColor(lastResult) === "black"
                      ? "#191b22"
                      : "#0f8f4f",
                }}
              >
                {lastResult}
              </div>
            )}
            {!spinning && lastResult === null && (
              <span className="waiting">
                Coloca tus apuestas y gira la ruleta
              </span>
            )}
          </div>
        </div>

        <div className="roulette-side-controls">
          <div className="roulette-readout-compact">
            <div className={`box ${totalBet > 0 ? "highlight" : ""}`}>
              <span>APUESTA TOTAL</span>
              <b>{COP.format(totalBet)}</b>
            </div>
            <div className="box highlight-gold">
              <span>FICHA ACTIVA</span>
              <b>{COP.format(selectedChip)}</b>
            </div>
            <div className="box">
              <span>SALDO</span>
              <b>{COP.format(balance)}</b>
            </div>
          </div>

          <div className="roulette-chips-section">
            <div className="roulette-chips-header">
              <span>🪙 SELECCIONA TU FICHA</span>
              {selectedChip ? (
                <span className="badge-chip-val">{COP.format(selectedChip)}</span>
              ) : null}
            </div>

            {isVip && !spinning ? (
              <div className="vip-custom-bet-bar">
                <div className="vip-badge-tag">👑 MESA VIP · FICHA SIN LÍMITE</div>
                <div className="vip-input-row">
                  <input
                    type="number"
                    min={200000}
                    step={50000}
                    placeholder="Mínimo $200.000 COP..."
                    value={customChipInput}
                    onChange={(e) => setCustomChipInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-gold btn-sm"
                    onClick={() => {
                      const val = parseInt(customChipInput, 10);
                      if (isNaN(val) || val < 200000) {
                        notify("La apuesta mínima en mesa VIP es de $200.000 COP.");
                        return;
                      }
                      setSelectedChip(val);
                      notify(`Ficha activa fijada en ${COP.format(val)}.`);
                    }}
                  >
                    Fijar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      if (balance <= 0) {
                        notify("No tienes saldo disponible.");
                        return;
                      }
                      setSelectedChip(balance);
                      notify(`Ficha fijada en todo tu saldo: ${COP.format(balance)}`);
                    }}
                  >
                    All-In
                  </button>
                </div>
                <div className="vip-quick-chips">
                  {[200000, 500000, 1000000, 2500000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`vip-chip-pill ${selectedChip === amt ? "active" : ""}`}
                      onClick={() => {
                        setSelectedChip(amt);
                        notify(`Ficha de ${COP.format(amt)} seleccionada.`);
                      }}
                    >
                      {amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="roulette-chips-wrap">
                <BetBar bet={selectedChip} setBet={setSelectedChip} />
              </div>
            )}
          </div>

          <div className="roulette-action-row roulette-action-row--three">
            <button
              type="button"
              className="btn-roulette-clear"
              onClick={clearBets}
              disabled={spinning || lightningActive || totalBet <= 0}
              title="Borrar todas las fichas del tapete"
            >
              <span className="btn-icon">🗑️</span>
              <span>Borrar</span>
            </button>
            <button
              type="button"
              className="btn-roulette-repeat"
              onClick={repeatBet}
              disabled={spinning || lightningActive || lastBetsTotal <= 0 || balance < lastBetsTotal}
              title={lastBetsTotal <= 0 ? "Sin apuesta anterior" : `Repetir ${COP.format(lastBetsTotal)}`}
            >
              <span className="btn-icon">🔁</span>
              <span>Repetir</span>
            </button>
            <button
              type="button"
              className={`btn-roulette-spin ${totalBet > 0 && !spinning && !lightningActive ? "ready-to-spin" : ""}`}
              onClick={spin}
              disabled={spinning || lightningActive || totalBet <= 0}
              title={totalBet <= 0 ? "Coloca al menos una apuesta en el tapete" : "Girar la ruleta"}
            >
              <span className="btn-spin-icon">{lightningActive ? "⚡" : "🎡"}</span>
              <div className="btn-spin-text-wrap">
                <span className="btn-spin-main">
                  {lightningActive ? "¡RELÁMPAGO!" : spinning ? "GIRANDO..." : "GIRAR"}
                </span>
                {totalBet > 0 && !spinning && !lightningActive && (
                  <span className="btn-spin-sub">{COP.format(totalBet)}</span>
                )}
              </div>
            </button>
          </div>

          {resultBanner && (
            <div className={`result-banner ${resultBanner.cls} roulette-side-banner`}>
              {resultBanner.label} · {resultBanner.netWin >= 0 ? "+" : ""}
              {COP.format(resultBanner.netWin)}
            </div>
          )}
        </div>
      </div>

      <div className="roulette-board">
        <div
          className={`rb-zero ${lastResult === 0 ? "win" : ""}`}
          onClick={() => handleBetClick("n0")}
        >
          0{bets["n0"] ? <span className="stake">{formatStake(bets["n0"])}</span> : null}
        </div>
        {rows[0].map((n) => {
          const key = "n" + n;
          const stake = bets[key];
          const winCls = lastResult === n ? "win" : "";
          return (
            <div
              key={n}
              className={`rb-num ${numColor(n)} ${winCls}`}
              onClick={() => handleBetClick(key)}
            >
              {n}
              {stake ? <span className="stake">{formatStake(stake)}</span> : null}
            </div>
          );
        })}
        {rows[1].map((n) => {
          const key = "n" + n;
          const stake = bets[key];
          const winCls = lastResult === n ? "win" : "";
          return (
            <div
              key={n}
              className={`rb-num ${numColor(n)} ${winCls}`}
              onClick={() => handleBetClick(key)}
            >
              {n}
              {stake ? <span className="stake">{formatStake(stake)}</span> : null}
            </div>
          );
        })}
        {rows[2].map((n) => {
          const key = "n" + n;
          const stake = bets[key];
          const winCls = lastResult === n ? "win" : "";
          return (
            <div
              key={n}
              className={`rb-num ${numColor(n)} ${winCls}`}
              onClick={() => handleBetClick(key)}
            >
              {n}
              {stake ? <span className="stake">{formatStake(stake)}</span> : null}
            </div>
          );
        })}
      </div>

      <div className="roulette-outside">
        {outsideBets.map(({ key, label }) => {
          const stake = bets[key];
          const winCls =
            lastResult !== null && isOutsideWin(key, lastResult) ? "win" : "";
          return (
            <div
              key={key}
              className={`rb-outside ${winCls}`}
              onClick={() => handleBetClick(key)}
            >
              {label}
              {stake ? <span className="stake">{formatStake(stake)}</span> : null}
            </div>
          );
        })}
      </div>
    </GameShell>
  );
}
