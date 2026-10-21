import React, { useState, useEffect, useRef, useCallback } from "react";
import GameShell from "./shared/GameShell";
import Box from "./shared/Box";
import { COP } from "../../data/games";
import { soundManager } from "../../utils/soundManager";
import explosionVideo from "../../assets/explosion_plane.mp4";
import planePng from "../../assets/Plane.png";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_BET = 10_000;
const MAX_BET = 5_000_000;
const HISTORY_MAX = 10;
const MAX_MULT = 50.0; // Hard cap at 50x multiplier

// Multiplier & Flight tuning
const DIVE_DURATION_SEC = 2.8; // smooth 2.8-second glide down to ground when crashing

type Phase = "waiting" | "flying" | "diving" | "crashed" | "cashed";

interface HistoryEntry { multiplier: number; crashed: boolean; }

/**
 * Generate a crash point with progressive crash hazard.
 * Includes a 7% early crash hazard (1.00x - 1.10x) to break low-multiplier farming exploits.
 * Multiplier capped at 50x MAX_MULT.
 */
function generateCrashPoint(): number {
  const r = Math.random();
  // 7% chance of early crash to prevent low-multiplier farming exploits
  if (r < 0.07) {
    return parseFloat((1.00 + Math.random() * 0.10).toFixed(2));
  }
  const minMult = 1.16;
  const raw = minMult + (-Math.log(1 - (r - 0.07) / 0.93) * 0.90);
  return Math.min(parseFloat(raw.toFixed(2)), MAX_MULT);
}

// ─── Chroma-key canvas for green-screen video ─────────────────────────────────
function ChromaKeyVideo({ src, playing, onEnded }: {
  src: string; playing: boolean; onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i + 1];
      if (g > 100 && g > d[i] * 1.4 && g > d[i + 2] * 1.4) d[i + 3] = 0;
    }
    ctx.putImageData(frame, 0, 0);
    rafRef.current = requestAnimationFrame(processFrame);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.currentTime = 0;
      video.play().catch(() => {});
      rafRef.current = requestAnimationFrame(processFrame);
    } else {
      video.pause();
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, processFrame]);

  return (
    <div className="chroma-key-wrapper">
      <video ref={videoRef} src={src} muted playsInline preload="auto"
        crossOrigin="anonymous" onEnded={onEnded} style={{ display: "none" }} />
      <canvas ref={canvasRef} className="chroma-key-canvas" />
    </div>
  );
}

// ─── Main Crash Component ─────────────────────────────────────────────────────
export default function Crash({ title, name, balance, change, notify, back }: {
  title: string; name: string; balance: number;
  change: (d: number, w?: number) => void;
  notify: (m: string) => void; back: () => void;
}) {
  // ── React state (drives UI only) ──────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("waiting");
  const [displayMult, setDisplayMult] = useState(1.0);   // shown in badge
  const [bet, setBet] = useState(10_000);
  const [betInput, setBetInput] = useState("10000");
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState<number | null>(null);
  const [showCashoutBadge, setShowCashoutBadge] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showExplosion, setShowExplosion] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // ── Mutable refs (shared with RAF loop, never cause re-renders) ───────────
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const rafRef           = useRef<number>(0);
  const cdRef            = useRef<ReturnType<typeof setInterval> | null>(null);
  const cashoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showExplosionRef = useRef(false);          // mirrors showExplosion state for RAF loop
  // Last known canvas position of the plane tip (percentage of canvas W/H)
  const planePosRef      = useRef({ xPct: 0.85, yPct: 0.15 });

  // Flight state (all mutable)
  const flightRef = useRef({
    phase:       "waiting" as Phase,
    startTs:     0,
    lastFrameTs: 0,
    elapsed:     0,
    mult:        1.0,
    visualY:     1.0,
    crashPoint:  2.0,
    hasBet:      false,
    bet:         10_000,
    diveStartTs: 0,
    diveFromY:   1.0,
    cashedAtMult: 0,    // multiplier at the moment of cashout (0 = not cashed)
    trail:       [] as { x: number; y: number }[],
    // Smooth aerodynamic wave & physics
    wavePhase1:  0.0,
    wavePhase2:  0.0,
    smoothedY:   1.0,
    velY:        0.0,
  });

  // ── Plane image (loaded once, used in drawFrame) ──────────────────────────
  const planeImgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = planePng;
    img.onload = () => { planeImgRef.current = img; };
  }, []);
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const f = flightRef.current;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const trail = f.trail;
    if (trail.length < 2 && f.phase !== "waiting") return;

    const pad = { left: 52, right: 48, top: 28, bottom: 38 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // Scale X so plane sits ~55% (2/4 left) across the chart width with clear sky ahead
    const maxX = Math.max(f.elapsed * 1.7, 7);
    const maxY = Math.max(f.mult + 0.6, 2.5);

    const toCvs = (x: number, y: number) => {
      const rawCx = pad.left + (x / maxX) * plotW;
      const rawCy = pad.top + plotH - ((y - 1) / Math.max(maxY - 1, 0.5)) * plotH;
      // Clamp strictly inside canvas padding so plane image NEVER leaks outside box!
      const cx = Math.max(pad.left + 28, Math.min(W - pad.right - 28, rawCx));
      const cy = Math.max(pad.top + 18, Math.min(H - pad.bottom - 18, rawCy));
      return { cx, cy };
    };

    // Grid lines
    const gridLevels = [1.5, 2, 3, 5, 10, 20, 50, 100];
    ctx.lineWidth = 1;
    gridLevels.forEach((yv) => {
      if (yv > maxY * 1.15) return;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      const { cy } = toCvs(0, yv);
      ctx.beginPath(); ctx.moveTo(pad.left, cy); ctx.lineTo(W - pad.right, cy); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.fillText(`${yv}×`, 3, cy + 4);
    });

    if (trail.length < 2) return;

    const crashed = f.phase === "crashed" || f.phase === "diving";
    const lineColor  = crashed ? "#e5455f" : "#1fbf75";
    const fillTop    = crashed ? "rgba(229,69,95,0.45)" : "rgba(31,191,117,0.40)";
    const fillBottom = crashed ? "rgba(229,69,95,0.04)" : "rgba(31,191,117,0.03)";

    const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBottom);

    // Filled area under trail
    const firstPt = toCvs(trail[0].x, trail[0].y);
    ctx.beginPath();
    ctx.moveTo(firstPt.cx, H - pad.bottom);
    ctx.lineTo(firstPt.cx, firstPt.cy);
    for (let i = 1; i < trail.length; i++) {
      const { cx, cy } = toCvs(trail[i].x, trail[i].y);
      ctx.lineTo(cx, cy);
    }
    const lastTr = toCvs(trail[trail.length - 1].x, trail[trail.length - 1].y);
    ctx.lineTo(lastTr.cx, H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Trail line — smooth with bezier via lineTo (already dense enough at 60fps)
    ctx.beginPath();
    ctx.moveTo(firstPt.cx, firstPt.cy);
    for (let i = 1; i < trail.length; i++) {
      const { cx, cy } = toCvs(trail[i].x, trail[i].y);
      ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    // ── Plane image ───────────────────────────────────────────────────────
    if (f.phase !== "crashed" && !showExplosionRef.current) {
      const tipPrev = trail.length > 3 ? toCvs(trail[trail.length - 3].x, trail[trail.length - 3].y) : firstPt;
      const tipCur  = toCvs(trail[trail.length - 1].x, trail[trail.length - 1].y);

      // Store position as percentage so the React overlay can follow it
      planePosRef.current = { xPct: tipCur.cx / W, yPct: tipCur.cy / H };

      // Angle of travel so the plane visually tilts with the path
      const angle = Math.atan2(tipCur.cy - tipPrev.cy, tipCur.cx - tipPrev.cx);

      const img = planeImgRef.current;
      const pw = 56, ph = 36;  // rendered plane size in px
      ctx.save();
      ctx.translate(tipCur.cx, tipCur.cy - 4);
      ctx.rotate(angle);
      if (img) {
        ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
      } else {
        // Fallback while image loads
        ctx.font = "26px serif";
        ctx.fillText("✈️", -13, 8);
      }
      ctx.restore();
    }
  }, []);  // drawFrame is stable — reads refs only

  // ── RAF loop ──────────────────────────────────────────────────────────────
  const rafLoop = useCallback((ts: number) => {
    const f = flightRef.current;
    if (!f.lastFrameTs) f.lastFrameTs = ts;
    const dt = Math.min(0.05, (ts - f.lastFrameTs) / 1000);
    f.lastFrameTs = ts;

    if (f.phase === "flying" || f.phase === "cashed") {
      f.elapsed = (ts - f.startTs) / 1000;

      // ── 1. Initial Runway Takeoff Phase (0s - 1.2s) ───────────────────────
      if (f.elapsed < 1.2) {
        // Plane rolls on ground preparing for takeoff — multiplier locked at 1.00x
        f.visualY   = 1.00;
        f.smoothedY = 1.00;
        f.velY      = 0.0;
        f.mult      = 1.00;
        setDisplayMult(1.00);

        const last = f.trail[f.trail.length - 1];
        if (!last || f.elapsed - last.x > 0.015) {
          f.trail.push({ x: f.elapsed, y: 1.00 });
        }
        drawFrame();
        rafRef.current = requestAnimationFrame(rafLoop);
        return;
      }

      // ── 2. Airborne Flight Phase (f.elapsed >= 1.2) ───────────────────────
      const flightTime = f.elapsed - 1.2;
      f.wavePhase1 += dt * 0.7;
      f.wavePhase2 += dt * 1.3;
      const wave = 0.16 * Math.sin(f.wavePhase1) + 0.07 * Math.cos(f.wavePhase2);
      const climbBase = 1.0 + Math.pow(flightTime * 0.28, 1.1);
      const targetY = Math.max(1.05, climbBase + wave);

      // Spring-damper physics for smooth vertical motion
      const force = (targetY - f.smoothedY) * 3.5;
      f.velY += force * dt;
      f.velY *= Math.pow(0.85, dt * 60); // damping
      const prevY = f.visualY;
      f.smoothedY += f.velY * dt;
      f.visualY = Math.max(1.05, f.smoothedY);

      // ── 3. Dynamic Altitude Multiplier: Climb = Add, Descent = Subtract ──
      const deltaY = f.visualY - prevY;
      if (deltaY > 0) {
        // Plane is climbing (going UP) → Multiplier INCREASES!
        const altitudeLevel = Math.max(0.1, f.visualY - 1.0);
        const multGain = (0.040 + deltaY * 0.5 + 0.025 * altitudeLevel) * dt * f.mult;
        f.mult += multGain;
      } else if (deltaY < 0) {
        // Plane is descending (going DOWN in wave) → Multiplier SUBTRACTS!
        const multLoss = Math.abs(deltaY) * 0.85 * f.mult;
        f.mult = Math.max(1.00, f.mult - multLoss);
      }

      // Hard cap multiplier at 50x (MAX_MULT)
      f.mult = Math.min(MAX_MULT, Math.max(1.00, f.mult));

      // Always update displayed multiplier to track live flight in real-time
      setDisplayMult(parseFloat(f.mult.toFixed(2)));

      // Record trail point
      const last = f.trail[f.trail.length - 1];
      if (!last || f.elapsed - last.x > 0.015) {
        f.trail.push({ x: f.elapsed, y: f.visualY });
        if (f.trail.length > 600) f.trail.shift();
      }

      // Trigger fatal descent when multiplier hits crash point (flying OR already cashed out)
      if ((f.phase === "flying" || f.phase === "cashed") && f.mult >= f.crashPoint) {
        f.phase = "diving";
        f.diveStartTs = ts;
        f.diveFromY = f.visualY;
        setPhase("diving");
      }

      drawFrame();
      rafRef.current = requestAnimationFrame(rafLoop);

    } else if (f.phase === "diving") {
      // ── Smooth Fatal Descent (Gliding down to ground; multiplier FROZEN) ──
      const diveElapsed = (ts - f.diveStartTs) / 1000;
      const diveProgress = Math.min(1.0, diveElapsed / DIVE_DURATION_SEC);

      // Non-linear smooth descent curve
      const glideRatio = Math.pow(diveProgress, 1.3);
      const smoothGlideY = f.diveFromY * (1.0 - glideRatio) + 1.0 * glideRatio;

      // Subtle aerodynamic flutter during descent
      const flutter = 0.04 * Math.sin(diveElapsed * 6.0) * (1.0 - diveProgress);
      const diveY = Math.max(1.0, smoothGlideY + flutter);
      f.visualY = diveY;

      f.elapsed += dt;

      // Record diving trail point
      const last = f.trail[f.trail.length - 1];
      const nextX = (last?.x ?? 0) + 0.02;
      f.trail.push({ x: nextX, y: diveY });
      if (f.trail.length > 600) f.trail.shift();

      drawFrame();

      if (diveProgress >= 1.0 || diveY <= 1.02) {
        // Plane touches ground — trigger explosion
        f.phase = "crashed";
        setPhase("crashed");
        showExplosionRef.current = true;
        setShowExplosion(true);
        soundManager.stopSFX("planeFlyLoop");
        soundManager.playSFX("planeExplosion");
        // Use the actual crash point for history (regardless of whether someone cashed out)
        setHistory((prev) => [{ multiplier: parseFloat(f.crashPoint.toFixed(2)), crashed: true }, ...prev].slice(0, HISTORY_MAX));
        drawFrame();  // redraw without plane image
        return; // stop RAF
      }

      rafRef.current = requestAnimationFrame(rafLoop);
    }
  }, [drawFrame]);

  // ── Start flight ──────────────────────────────────────────────────────────
  const startFlight = useCallback((startTs: number) => {
    const f = flightRef.current;
    f.phase       = "flying";
    f.startTs     = startTs;
    f.lastFrameTs = startTs;
    f.elapsed     = 0;
    f.mult        = 1.0;
    f.visualY     = 1.0;
    f.smoothedY   = 1.0;
    f.velY        = 0.0;
    f.wavePhase1  = 0.0;
    f.wavePhase2  = Math.PI * 0.5;
    f.trail       = [{ x: 0, y: 1.0 }];
    f.crashPoint  = generateCrashPoint();
    setPhase("flying");
    setDisplayMult(1.0);
    soundManager.playSFX("planeFlyLoop");   // start engine loop
    rafRef.current = requestAnimationFrame(rafLoop);
  }, [rafLoop]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (cashoutTimerRef.current) clearTimeout(cashoutTimerRef.current);

    const f = flightRef.current;
    f.phase       = "waiting";
    f.trail       = [];
    f.hasBet      = false;
    f.mult        = 1.0;
    f.elapsed     = 0;
    f.cashedAtMult = 0;

    setPhase("waiting");
    setHasBet(false);
    setCashedOut(null);
    setShowCashoutBadge(false);
    setDisplayMult(1.0);
    showExplosionRef.current = false;
    setShowExplosion(false);
    soundManager.stopSFX("planeFlyLoop");   // ensure engine loop is off between rounds
    soundManager.stopSFX("planeCountdown"); // ensure countdown beep is off

    let cd = 5;
    setCountdown(cd);

    cdRef.current = setInterval(() => {
      cd--;
      setCountdown(cd);
      if (cd === 3) {
        soundManager.playSFX("planeCountdown");  // beep at 3 seconds left
      }
      if (cd <= 0) {
        clearInterval(cdRef.current!);
        cdRef.current = null;
        requestAnimationFrame((ts) => startFlight(ts));
      }
    }, 1000);
  }, [startFlight]);

  // ── Cash out ──────────────────────────────────────────────────────────────
  const handleCashOut = useCallback(() => {
    const f = flightRef.current;
    if (!f.hasBet) return;
    if (f.phase === "diving") {
      notify("💥 ¡Demasiado tarde! El avión ya entró en picada.");
      return;
    }
    if (f.phase !== "flying") return;

    const m   = parseFloat(f.mult.toFixed(2));
    const pay = Math.floor(f.bet * m);
    change(pay);
    setCashedOut(m);
    setShowCashoutBadge(true);
    if (cashoutTimerRef.current) clearTimeout(cashoutTimerRef.current);
    cashoutTimerRef.current = setTimeout(() => {
      setShowCashoutBadge(false);
    }, 3000); // Disappears after 3 seconds

    setHasBet(false);
    f.hasBet      = false;
    f.cashedAtMult = m;
    f.phase       = "cashed";
    setPhase("cashed");

    setHistory((prev) => [{ multiplier: m, crashed: false }, ...prev].slice(0, HISTORY_MAX));
    soundManager.playSFX("winCoin");
    // RAF loop continues — plane flies and updates live multiplier until crash point
  }, [change, notify]);

  // ── Place bet ─────────────────────────────────────────────────────────────
  const handleBet = useCallback(() => {
    const f = flightRef.current;
    if (f.phase !== "waiting") { notify("Espera a la próxima ronda."); return; }
    if (bet < MIN_BET) { notify(`Apuesta mínima: ${COP.format(MIN_BET)}.`); return; }
    if (bet > balance)  { notify("Saldo insuficiente."); return; }
    change(-bet, bet);
    setHasBet(true);
    f.hasBet = true;
    f.bet    = bet;
    notify(`Apuesta de ${COP.format(bet)} registrada.`);
  }, [bet, balance, change, notify]);

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    startCountdown();
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (cdRef.current) clearInterval(cdRef.current);
      if (cashoutTimerRef.current) clearTimeout(cashoutTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bet helpers ───────────────────────────────────────────────────────────
  const adjustBet = (factor: number) => {
    const n = Math.max(MIN_BET, Math.min(MAX_BET, Math.round(bet * factor)));
    setBet(n); setBetInput(String(n));
  };
  const handleBetInput = (v: string) => {
    setBetInput(v);
    const n = parseInt(v.replace(/\D/g, ""), 10);
    if (!isNaN(n)) setBet(Math.max(MIN_BET, Math.min(MAX_BET, n)));
  };

  // ── Derived UI values ─────────────────────────────────────────────────────
  const isFlying  = phase === "flying";
  const isCrashed = phase === "crashed" || phase === "diving";
  const isDone    = phase === "crashed" || phase === "cashed";

  const multColor = isCrashed ? "#e5455f"
    : displayMult < 2  ? "#1fbf75"
    : displayMult < 5  ? "#3b82f6"
    : "#a855f7";

  const handleBack = () => {
    const f = flightRef.current;
    if (f.hasBet) {
      notify("🔒 Tienes una apuesta activa. Cobra tu premio o espera a que termine la ronda antes de salir.");
      return;
    }
    back();
  };

  return (
    <GameShell title={title} name={name} balance={balance} back={handleBack}>
      <div className="crash-game-layout">

        {/* History bar */}
        <div className="crash-history-bar">
          {history.map((h, i) => (
            <span key={i} className={`crash-history-pill ${h.crashed ? "crashed" : "safe"}`}>
              {h.multiplier.toFixed(2)}×
            </span>
          ))}
        </div>

        {/* Chart */}
        <div className="crash-chart-wrapper">
          {phase === "waiting" && (
            <div className="crash-countdown-overlay">
              <span className="crash-countdown-label">Próxima ronda en</span>
              <span className="crash-countdown-number">{countdown}</span>
            </div>
          )}

          <canvas ref={canvasRef} className="crash-canvas" width={700} height={320} />

          <div className="crash-multiplier-badge">
            {showCashoutBadge && cashedOut ? (
              <div className="crash-cashout-center">
                <span className="cashout-check">✅</span>
                <span className="cashout-label">Cobrado a</span>
                <span className="cashout-mult">{cashedOut.toFixed(2)}×</span>
                <span className="cashout-amount">{COP.format(Math.floor(bet * cashedOut))}</span>
              </div>
            ) : phase === "waiting" ? (
              <span className="crash-waiting-text">Esperando...</span>
            ) : isCrashed && phase === "crashed" ? (
              <>
                <span className="crash-flew-away">¡SE ESTRELLÓ!</span>
                <span className="crash-mult-value" style={{ color: "#e5455f" }}>
                  {displayMult.toFixed(2)}×
                </span>
              </>
            ) : phase === "diving" ? (
              <span className="crash-mult-value" style={{ color: "#e5455f" }}>
                {displayMult.toFixed(2)}×
              </span>
            ) : (
              <span className="crash-mult-value" style={{ color: multColor }}>
                {displayMult.toFixed(2)}×
              </span>
            )}
          </div>

          {showExplosion && (
            <div
              className="crash-explosion-overlay"
              style={{
                // Centre the explosion on the last known plane position
                left:      `${planePosRef.current.xPct * 100}%`,
                top:       `${planePosRef.current.yPct * 100}%`,
                transform: "translate(-50%, -50%)",
                width:  "42%",
                height: "55%",
              }}
            >
              <ChromaKeyVideo
                src={explosionVideo}
                playing={showExplosion}
                onEnded={() => {
                  showExplosionRef.current = false;
                  setShowExplosion(false);
                  setTimeout(startCountdown, 1200);
                }}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="crash-controls">
          <div className="crash-bet-panel">
            <label className="crash-bet-label">Apuesta (COP)</label>
            <div className="crash-bet-row">
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => adjustBet(0.5)} disabled={phase !== "waiting" || hasBet}>½</button>
              <input type="text" className="crash-bet-input" value={betInput}
                onChange={(e) => handleBetInput(e.target.value)}
                disabled={phase !== "waiting" || hasBet} />
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => adjustBet(2)} disabled={phase !== "waiting" || hasBet}>×2</button>
            </div>
            <div className="crash-quick-bets">
              {[10000, 25000, 50000, 100000].map((q) => (
                <button key={q} type="button" className="btn btn-outline btn-xs"
                  onClick={() => { setBet(q); setBetInput(String(q)); }}
                  disabled={phase !== "waiting" || hasBet}>
                  ${q >= 1000 ? `${q / 1000}K` : q}
                </button>
              ))}
            </div>
          </div>

          <div className="crash-action-col">
            {phase === "waiting" && !hasBet && (
              <button type="button" className="btn btn-gold btn-lg crash-action-btn"
                onClick={handleBet} disabled={balance < bet}>
                ✈️ Apostar {COP.format(bet)}
              </button>
            )}
            {phase === "waiting" && hasBet && (
              <button type="button" className="btn btn-green btn-lg crash-action-btn" disabled>
                ⏳ Registrada — inicia pronto
              </button>
            )}
            {isFlying && hasBet && (
              <button type="button" className="btn btn-green btn-lg crash-action-btn pulse-btn"
                onClick={handleCashOut}>
                💰 Cobrar {displayMult.toFixed(2)}×
                <br /><small>= {COP.format(Math.floor(bet * displayMult))}</small>
              </button>
            )}
            {isFlying && !hasBet && (
              <button type="button" className="btn btn-outline btn-lg crash-action-btn" disabled>
                🔒 Sin apuesta esta ronda
              </button>
            )}
            {(isDone || phase === "diving") && (
              <button type="button" className="btn btn-outline btn-lg crash-action-btn" disabled>
                {phase === "cashed" ? "✅ Cobrado con éxito" : "💥 Cayendo..."}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="controls-bar">
          <div className="bet-readout">
            <Box label="APUESTA ACTUAL" value={hasBet ? COP.format(bet) : "–"} />
            <Box label="GANANCIA POSIBLE"
              value={hasBet && isFlying ? COP.format(Math.floor(bet * displayMult)) : "–"} />
            <Box label="SALDO" value={COP.format(balance)} />
          </div>
        </div>

      </div>
    </GameShell>
  );
}

