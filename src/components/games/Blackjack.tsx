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

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♠", "♥", "♦", "♣"];

function cardValue(rank: string) {
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  if (rank === "A") return 11;
  return Number(rank);
}

function buildShoe(decks = 6): CardObj[] {
  const shoe: CardObj[] = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) {
      for (const r of RANKS) {
        shoe.push({ rank: r, suit: s });
      }
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function handTotal(cards: CardObj[]) {
  let sum = cards.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces = cards.filter((c) => c.rank === "A").length;
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function isBlackjackHand(cards: CardObj[]) {
  return cards.length === 2 && handTotal(cards) === 21;
}

export default function Blackjack({
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
  const [shoe, setShoe] = useState<CardObj[]>(() => buildShoe(6));
  const [hands, setHands] = useState<CardObj[][]>([[]]);
  const [dealer, setDealer] = useState<CardObj[]>([]);
  const [current, setCurrent] = useState(0);
  const [bets, setBets] = useState<number[]>([25000]);
  const [doubled, setDoubled] = useState<boolean[]>([false]);
  const [done, setDone] = useState<boolean[]>([false]);
  const [phase, setPhase] = useState<"betting" | "playing" | "dealer" | "result">(
    "betting"
  );
  const [selectedChip, setSelectedChip] = useState(25000);
  const [customBetInput, setCustomBetInput] = useState("");
  const isVip = title.toLowerCase().includes("vip");
  const [resultBanner, setResultBanner] = useState<{
    label: string;
    netWin: number;
    cls: string;
  } | null>(null);

  const drawCard = (curShoe: CardObj[]) => {
    let s = curShoe;
    if (s.length < 10) {
      s = buildShoe(6);
    }
    const card = s[s.length - 1];
    const newShoe = s.slice(0, -1);
    return { card, newShoe };
  };

  const handleChipClick = (val: number) => {
    setSelectedChip(val);
    if (phase === "betting") {
      const curBet = bets[0] || 0;
      if (balance < curBet + val) {
        notify("Saldo insuficiente.");
      } else {
        setBets([curBet + val]);
        soundManager.playSFX('chip');
      }
    }
  };

  const deal = () => {
    const bet = bets[0] || 0;
    if (bet <= 0) {
      notify("Ingresa una apuesta.");
      return;
    }
    if (balance < bet) {
      notify("Saldo insuficiente.");
      return;
    }

    change(-bet, bet);
    soundManager.playSFX('cardDraw');

    let curShoe = shoe;
    const c1 = drawCard(curShoe);
    curShoe = c1.newShoe;
    const c2 = drawCard(curShoe);
    curShoe = c2.newShoe;
    const d1 = drawCard(curShoe);
    curShoe = d1.newShoe;
    const d2 = drawCard(curShoe);
    curShoe = d2.newShoe;

    const initialPlayerHand = [c1.card, c2.card];
    const initialDealerHand = [d1.card, d2.card];

    setShoe(curShoe);
    setHands([initialPlayerHand]);
    setDealer(initialDealerHand);
    setCurrent(0);
    setDoubled([false]);
    setDone([false]);
    setResultBanner(null);

    if (isBlackjackHand(initialPlayerHand)) {
      setPhase("dealer");
      setTimeout(() => {
        resolveGame([initialPlayerHand], initialDealerHand, [bet], curShoe);
      }, 600);
    } else {
      setPhase("playing");
    }
  };

  const hit = () => {
    const { card, newShoe } = drawCard(shoe);
    const newHands = hands.map((h, i) => (i === current ? [...h, card] : h));
    setShoe(newShoe);
    setHands(newHands);
    soundManager.playSFX('cardDraw');

    const hand = newHands[current];
    if (handTotal(hand) > 21) {
      const newDone = done.map((d, i) => (i === current ? true : d));
      setDone(newDone);
      notify(`Mano ${current + 1}: te pasaste con ${handTotal(hand)}.`);
      nextHandOrDealer(newHands, newDone, newShoe);
    }
  };

  const stand = () => {
    const newDone = done.map((d, i) => (i === current ? true : d));
    setDone(newDone);
    nextHandOrDealer(hands, newDone, shoe);
  };

  const doubleDown = () => {
    const bet = bets[current];
    if (balance < bet) {
      notify("Saldo insuficiente para doblar.");
      return;
    }
    change(-bet, bet);
    const newBets = bets.map((b, i) => (i === current ? b * 2 : b));
    setBets(newBets);

    const { card, newShoe } = drawCard(shoe);
    const newHands = hands.map((h, i) => (i === current ? [...h, card] : h));
    const newDone = done.map((d, i) => (i === current ? true : d));

    soundManager.playSFX('cardDraw');
    setShoe(newShoe);
    setHands(newHands);
    setDone(newDone);
    nextHandOrDealer(newHands, newDone, newShoe, newBets);
  };

  const splitHand = () => {
    const bet = bets[current];
    if (balance < bet) {
      notify("Saldo insuficiente para dividir.");
      return;
    }
    change(-bet, bet);
    soundManager.playSFX('cardDraw');

    const hand = hands[current];
    const card2 = hand[1];

    let curShoe = shoe;
    const d1 = drawCard(curShoe);
    curShoe = d1.newShoe;
    const d2 = drawCard(curShoe);
    curShoe = d2.newShoe;

    const hand1 = [hand[0], d1.card];
    const hand2 = [card2, d2.card];

    const newHands = [
      ...hands.slice(0, current),
      hand1,
      hand2,
      ...hands.slice(current + 1),
    ];
    const newBets = [
      ...bets.slice(0, current),
      bet,
      bet,
      ...bets.slice(current + 1),
    ];
    const newDone = [
      ...done.slice(0, current),
      false,
      false,
      ...done.slice(current + 1),
    ];

    setShoe(curShoe);
    setHands(newHands);
    setBets(newBets);
    setDone(newDone);
  };

  const nextHandOrDealer = (
    currentHands: CardObj[][],
    currentDone: boolean[],
    curShoe: CardObj[],
    curBets = bets
  ) => {
    if (
      current < currentHands.length - 1 &&
      currentDone.slice(0, current + 1).every(Boolean)
    ) {
      setCurrent(current + 1);
      return;
    }
    if (currentDone.every(Boolean)) {
      setPhase("dealer");
      dealerPlay(currentHands, curShoe, curBets);
    }
  };

  const dealerPlay = (
    finalHands: CardObj[][],
    curShoe: CardObj[],
    curBets: number[]
  ) => {
    const allBust = finalHands.every((h) => handTotal(h) > 21);
    let curDealer = dealer;
    let s = curShoe;

    const step = () => {
      if (!allBust && handTotal(curDealer) < 17) {
        const draw = drawCard(s);
        curDealer = [...curDealer, draw.card];
        s = draw.newShoe;
        setDealer(curDealer);
        setShoe(s);
        soundManager.playSFX('cardDraw');
        setTimeout(step, 550);
      } else {
        resolveGame(finalHands, curDealer, curBets, s);
      }
    };
    setTimeout(step, 400);
  };

  const resolveGame = (
    finalHands: CardObj[][],
    finalDealer: CardObj[],
    curBets: number[],
    s: CardObj[]
  ) => {
    setPhase("result");
    const dealerTot = handTotal(finalDealer);
    const dealerBJ = isBlackjackHand(finalDealer);
    let totalWin = 0;
    const resultLines: { outcome: string; payout: number; bet: number }[] = [];

    finalHands.forEach((hand, i) => {
      const bet = curBets[i];
      const pTot = handTotal(hand);
      const pBJ = isBlackjackHand(hand) && finalHands.length === 1;
      let outcome = "lose";
      let payout = 0;

      if (pTot > 21) {
        outcome = "lose";
        payout = 0;
      } else if (pBJ && dealerBJ) {
        outcome = "push";
        payout = bet;
      } else if (pBJ) {
        outcome = "blackjack";
        payout = bet * 2.5;
      } else if (dealerBJ) {
        outcome = "lose";
        payout = 0;
      } else if (dealerTot > 21 || pTot > dealerTot) {
        outcome = "win";
        payout = bet * 2;
      } else if (pTot < dealerTot) {
        outcome = "lose";
        payout = 0;
      } else {
        outcome = "push";
        payout = bet;
      }

      totalWin += payout;
      resultLines.push({ outcome, payout, bet });
    });

    if (totalWin > 0) {
      change(totalWin);
    }

    const totalInitialBet = curBets.reduce((a, b) => a + b, 0);
    const netWin = totalWin - totalInitialBet;
    const mainOutcome = resultLines[0].outcome;
    const label =
      mainOutcome === "win"
        ? "¡GANASTE!"
        : mainOutcome === "blackjack"
        ? "¡BLACKJACK!"
        : mainOutcome === "push"
        ? "EMPATE"
        : "PERDISTE";
    const cls =
      mainOutcome === "win" || mainOutcome === "blackjack"
        ? "win"
        : mainOutcome === "push"
        ? "push"
        : "lose";

    setResultBanner({ label, netWin, cls });

    // Play outcome sound effects
    if (mainOutcome === "win") {
      soundManager.playSFX("winChime");
    } else if (mainOutcome === "blackjack") {
      soundManager.playSFX("jackpot");
    } else if (mainOutcome === "lose") {
      soundManager.playSFX("bust");
    } else if (mainOutcome === "push") {
      soundManager.playSFX("chip");
    }
  };

  const newRound = () => {
    setHands([[]]);
    setDealer([]);
    setBets([25000]);
    setPhase("betting");
    setResultBanner(null);
    soundManager.playSFX("chip");
  };

  const totalBet = bets.reduce((a, b) => a + b, 0);
  const curBet = bets[current] || 0;
  const potential =
    curBet *
    (hands[current] && isBlackjackHand(hands[current]) ? 2.5 : 2);

  const curHand = hands[current] || [];
  const canDouble =
    phase === "playing" && curHand.length === 2 && balance >= bets[current];
  const canSplit =
    phase === "playing" &&
    curHand.length === 2 &&
    curHand[0].rank === curHand[1].rank &&
    hands.length < 4 &&
    balance >= bets[current];

  const handleBack = () => {
    if (phase === "playing" || phase === "dealer") {
      notify("🔒 Hay una mano en juego. Termina la partida antes de salir.");
      return;
    }
    back();
  };

  return (
    <GameShell title={title} name={name} balance={balance} back={handleBack} showChat>
      <div className="hand-row">
        <div className="hand-label">
          Dealer
          {phase !== "betting"
            ? ": " + (phase === "playing" ? "?" : handTotal(dealer))
            : ""}
        </div>
        <div className="cards-line">
          {dealer.map((c, i) =>
            i === 1 && phase === "playing" ? (
              <div key={i} className="pcard back"></div>
            ) : (
              <Card key={i} text={c.rank + c.suit} />
            )
          )}
        </div>
      </div>

      <div className="hand-row">
        <div className="hand-label">
          {hands.length > 1
            ? "Tus Manos"
            : "Tú" + (hands[0].length ? ": " + handTotal(hands[0]) : "")}
        </div>
        {hands.length === 1 ? (
          <div className="cards-line">
            {hands[0].map((c, i) => (
              <Card key={i} text={c.rank + c.suit} />
            ))}
          </div>
        ) : (
          <div className="split-hands">
            {hands.map((h, i) => (
              <div
                key={i}
                className={`hand-col ${
                  i === current && phase === "playing" ? "current" : ""
                }`}
              >
                <div className="cards-line">
                  {h.map((c, idx) => (
                    <Card key={idx} text={c.rank + c.suit} />
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,.7)",
                    fontWeight: 700,
                  }}
                >
                  Mano {i + 1}: {handTotal(h)}
                  {done[i] ? " ✓" : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resultBanner && (
        <div className={`result-banner ${resultBanner.cls}`}>
          {resultBanner.label} · {resultBanner.netWin >= 0 ? "+" : ""}
          {COP.format(resultBanner.netWin)}
        </div>
      )}

      <div className="controls-bar">
        <div className="bet-readout">
          <Box
            label="APUESTA ACTUAL"
            value={COP.format(phase === "betting" ? totalBet : curBet)}
          />
          <Box
            label="GANANCIA POTENCIAL"
            value={COP.format(phase === "betting" ? 0 : potential)}
          />
          <Box label="SALDO" value={COP.format(balance)} />
        </div>

        {phase === "betting" && isVip && (
          <div className="vip-custom-bet-bar">
            <div className="vip-badge-tag">👑 MESA VIP · APUESTA CUALQUIER CIFRA</div>
            <div className="vip-input-row">
              <input
                type="number"
                min={200000}
                step={50000}
                placeholder="Mínimo $200.000 COP..."
                value={customBetInput}
                onChange={(e) => setCustomBetInput(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-gold btn-sm"
                onClick={() => {
                  const val = parseInt(customBetInput, 10);
                  if (isNaN(val) || val < 200000) {
                    notify("La apuesta mínima en mesa VIP es de $200.000 COP.");
                    return;
                  }
                  if (val > balance) {
                    notify("El monto supera tu saldo disponible.");
                    return;
                  }
                  setBets([val]);
                  soundManager.playSFX("chip");
                  notify(`Apuesta fijada en ${COP.format(val)}`);
                }}
              >
                Fijar Cifra
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const val = parseInt(customBetInput, 10);
                  if (isNaN(val) || val < 200000) {
                    notify("La apuesta mínima en mesa VIP es de $200.000 COP.");
                    return;
                  }
                  const cur = bets[0] || 0;
                  if (cur + val > balance) {
                    notify("Saldo insuficiente para sumar ese monto.");
                    return;
                  }
                  setBets([cur + val]);
                  soundManager.playSFX("chip");
                }}
              >
                + Sumar
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (balance <= 0) {
                    notify("No tienes saldo disponible.");
                    return;
                  }
                  setBets([balance]);
                  soundManager.playSFX("chip");
                  notify(`¡All-in de ${COP.format(balance)}!`);
                }}
              >
                All-In ({COP.format(balance)})
              </button>
            </div>
            <div className="vip-quick-chips">
              {[200000, 500000, 1000000, 2500000, 5000000, 10000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="vip-chip-pill"
                  onClick={() => {
                    const cur = bets[0] || 0;
                    if (cur + amt > balance) {
                      notify("Saldo insuficiente.");
                      return;
                    }
                    setBets([cur + amt]);
                    soundManager.playSFX("chip");
                  }}
                >
                  +{amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}K`}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "betting" && !isVip && (
          <BetBar bet={selectedChip} setBet={handleChipClick} />
        )}

        <div className="action-row">
          {phase === "betting" && (
            <>
              <button onClick={() => setBets([0])}>Borrar Apuesta</button>
              <button
                className="primary"
                onClick={deal}
                disabled={totalBet <= 0}
              >
                Repartir
              </button>
            </>
          )}

          {phase === "playing" && (
            <>
              <button onClick={hit}>Pedir</button>
              <button onClick={stand}>Plantarse</button>
              <button onClick={doubleDown} disabled={!canDouble}>
                Doblar
              </button>
              <button onClick={splitHand} disabled={!canSplit}>
                Dividir
              </button>
            </>
          )}

          {phase === "result" && (
            <button className="primary" onClick={newRound}>
              Nueva Mano
            </button>
          )}
        </div>
      </div>
    </GameShell>
  );
}
