import React, { useState } from "react";
import GameShell from "./shared/GameShell";
import BetBar from "./shared/BetBar";
import Box from "./shared/Box";
import Card from "./shared/Card";
import { COP, chips } from "../../data/games";
import { soundManager } from "../../utils/soundManager";

interface CardObj {
  rank: string;
  suit: string;
}

const VP_PAYTABLE = [
  { key: "royal", label: "Escalera Real", mult: 250 },
  { key: "straightflush", label: "Escalera de Color", mult: 50 },
  { key: "four", label: "Póker (4 iguales)", mult: 25 },
  { key: "full", label: "Full House", mult: 9 },
  { key: "flush", label: "Color", mult: 6 },
  { key: "straight", label: "Escalera", mult: 4 },
  { key: "three", label: "Trío", mult: 3 },
  { key: "twopair", label: "Doble Par", mult: 2 },
  { key: "jacksbetter", label: "Pareja J o mayor", mult: 1 },
];

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];

function rankVal(r: string) {
  if (r === "A") return 14;
  if (r === "K") return 13;
  if (r === "Q") return 12;
  if (r === "J") return 11;
  return Number(r);
}

function buildDeck(): CardObj[] {
  const d: CardObj[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      d.push({ rank: r, suit: s });
    }
  }
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function evalPokerHand(cards: CardObj[]): string {
  const vals = cards.map((c) => rankVal(c.rank)).sort((a, b) => a - b);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(vals)];
  let isStraight = false;
  if (uniq.length === 5) {
    if (uniq[4] - uniq[0] === 4) isStraight = true;
    if (JSON.stringify(uniq) === JSON.stringify([2, 3, 4, 5, 14]))
      isStraight = true; // A-2-3-4-5
  }
  const counts: Record<number, number> = {};
  vals.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const countArr = Object.values(counts).sort((a, b) => b - a);
  const highCount = countArr[0];

  if (isFlush && isStraight && uniq.includes(14) && uniq.includes(13))
    return "royal";
  if (isFlush && isStraight) return "straightflush";
  if (highCount === 4) return "four";
  if (highCount === 3 && countArr[1] === 2) return "full";
  if (isFlush) return "flush";
  if (isStraight) return "straight";
  if (highCount === 3) return "three";
  if (countArr[0] === 2 && countArr[1] === 2) return "twopair";
  if (countArr[0] === 2) {
    const pairVal = Number(Object.keys(counts).find((k) => counts[Number(k)] === 2));
    if (pairVal >= 11) return "jacksbetter";
  }
  return "none";
}

export default function Poker({
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
  const [deck, setDeck] = useState<CardObj[]>([]);
  const [hand, setHand] = useState<(CardObj | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [held, setHeld] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [bet, setBet] = useState(25000);
  const [phase, setPhase] = useState<"bet" | "draw" | "done">("bet");
  const [lastResultKey, setLastResultKey] = useState<string | null>(null);
  const [resultBanner, setResultBanner] = useState<{
    label: string;
    netWin: number;
    cls: string;
  } | null>(null);

  const deal = () => {
    if (balance < bet) {
      notify("Saldo insuficiente.");
      return;
    }

    change(-bet, bet);
    soundManager.playSFX('cardDraw');
    const newDeck = buildDeck();
    const dealtHand = newDeck.splice(0, 5);

    setDeck(newDeck);
    setHand(dealtHand);
    setHeld([false, false, false, false, false]);
    setPhase("draw");
    setLastResultKey(null);
    setResultBanner(null);
    notify(`Repartiste por ${COP.format(bet)}. Elige las cartas a retener.`);
  };

  const toggleHold = (i: number) => {
    if (phase !== "draw") return;
    setHeld((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
    soundManager.playSFX('chip');
  };

  const draw = () => {
    const curDeck = [...deck];
    const newHand = hand.map((c, i) => {
      if (held[i] && c) return c;
      return curDeck.pop() || c;
    }) as CardObj[];

    const result = evalPokerHand(newHand);
    setHand(newHand);
    setDeck(curDeck);
    setPhase("done");
    setLastResultKey(result);

    soundManager.playSFX('cardDraw');

    const entry = VP_PAYTABLE.find((p) => p.key === result);
    if (entry) {
      const payout = bet * entry.mult;
      change(payout);
      soundManager.playSFX('winCoin');
      setResultBanner({
        label: entry.label,
        netWin: payout,
        cls: "win",
      });
      notify(`¡${entry.label}! Ganaste ${COP.format(payout)}.`);
    } else {
      soundManager.playSFX('bust');
      setResultBanner({
        label: "Sin combinación",
        netWin: -bet,
        cls: "lose",
      });
    }
  };

  const newRound = () => {
    setHand([null, null, null, null, null]);
    setHeld([false, false, false, false, false]);
    setPhase("bet");
    setLastResultKey(null);
    setResultBanner(null);
    soundManager.playSFX('chip');
  };

  const handleBack = () => {
    if (phase === "draw") {
      notify("🔒 Tienes una mano repartida. Elige tus cartas a retener y descarta antes de salir.");
      return;
    }
    back();
  };

  return (
    <GameShell title={title} name={name} balance={balance} back={handleBack} showChat>
      <div className="vp-paytable">
        {VP_PAYTABLE.map((p) => (
          <div
            key={p.key}
            className={`row ${lastResultKey === p.key ? "hit" : ""}`}
          >
            <span>{p.label}</span>
            <span>{p.mult}x</span>
          </div>
        ))}
      </div>

      <div className="vp-cards">
        {Array.from({ length: 5 }, (_, i) => {
          const c = hand[i];
          const isHeld = held[i];
          return (
            <div
              key={i}
              className="vp-card-slot"
              style={{ cursor: phase === "draw" ? "pointer" : "default" }}
              onClick={() => toggleHold(i)}
            >
              {c ? (
                <Card text={c.rank + c.suit} />
              ) : (
                <div className="pcard back"></div>
              )}
              <div className={`vp-hold ${isHeld ? "show" : ""}`}>RETENIDA</div>
            </div>
          );
        })}
      </div>

      {resultBanner && (
        <div className={`result-banner ${resultBanner.cls}`}>
          {resultBanner.label} · {resultBanner.netWin >= 0 ? "+" : ""}
          {COP.format(resultBanner.netWin)}
        </div>
      )}

      <div className="controls-bar">
        <div className="bet-readout">
          <Box label="APUESTA" value={COP.format(bet)} />
          <Box label="SALDO" value={COP.format(balance)} />
        </div>

        {phase === "bet" && <BetBar bet={bet} setBet={setBet} />}

        <div className="action-row">
          {phase === "bet" && (
            <button
              className="primary"
              onClick={deal}
              disabled={balance < bet}
            >
              Repartir
            </button>
          )}
          {phase === "draw" && (
            <button className="primary" onClick={draw}>
              Cambiar Cartas
            </button>
          )}
          {phase === "done" && (
            <button className="primary" onClick={newRound}>
              Nueva Mano
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
