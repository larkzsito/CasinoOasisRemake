import React, { useState, useEffect } from "react";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import { GAMES, Game, COP, VIP_RANKS } from "../../data/games";
import { subscribeRecentWins, RecentWin, formatTimeAgo } from "../../services/recentWinsService";

export default function Lobby({
  name,
  balance,
  wagered,
  add,
  open,
  home,
  logout,
  onOpenVip,
  onOpenPromotions,
  isAdmin = false,
  onAdminPanel,
}: {
  name: string;
  balance: number;
  wagered: number;
  add: (n: number) => void;
  open: (g: Game) => void;
  home: () => void;
  logout: () => void;
  onOpenVip?: () => void;
  onOpenPromotions?: () => void;
  isAdmin?: boolean;
  onAdminPanel?: () => void;
}) {
  const [cat, setCat] = useState("Todos");
  const [search, setSearch] = useState("");
  const [jackpot, setJackpot] = useState(2845910420);
  const [recentWins, setRecentWins] = useState<RecentWin[]>([]);

  // Listener real de Firestore y refresco cada 2 minutos
  useEffect(() => {
    let latestWins: RecentWin[] = [];

    const updateWinsDisplay = (wins: RecentWin[]) => {
      latestWins = wins;
      const refreshed = wins.map((w) => ({
        ...w,
        timeAgo: formatTimeAgo(w.createdAt),
      }));
      setRecentWins(refreshed);
    };

    const unsub = subscribeRecentWins((wins) => {
      updateWinsDisplay(wins);
    });

    // Refrescar lista y calcular tiempos relativos cada 2 minutos (120,000 ms)
    const refreshInterval = setInterval(() => {
      updateWinsDisplay(latestWins);
    }, 120000);

    return () => {
      unsub();
      clearInterval(refreshInterval);
    };
  }, []);

  // Jackpot ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setJackpot((j) => j + Math.floor(Math.random() * 2500) + 500);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Filter games
  const filteredGames = GAMES.filter((g) => {
    const matchCat = cat === "Todos" || g.cats.includes(cat);
    const matchSearch =
      search === "" || g.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Calculate VIP rank
  let vipIdx = 0;
  for (let i = 0; i < VIP_RANKS.length; i++) {
    if (wagered >= VIP_RANKS[i].min) vipIdx = i;
  }
  const curVip = VIP_RANKS[vipIdx];
  const nextVip = VIP_RANKS[vipIdx + 1];
  let vipPct = 100;
  let vipDesc = "¡Rango máximo alcanzado! Disfruta de tus beneficios Diamante.";
  if (nextVip) {
    vipPct = Math.min(
      100,
      Math.max(
        0,
        Math.round(((wagered - curVip.min) / (nextVip.min - curVip.min)) * 100)
      )
    );
    const missing = Math.max(0, nextVip.min - wagered);
    vipDesc = `Faltan ${COP.format(
      missing
    )} en apuestas para el rango ${nextVip.name}.`;
  }

  const handleNav = (v: string) => {
    if (v === "landing") {
      home();
    } else if (v === "lobby") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (v === "game") {
      const bj = GAMES.find((g) => g.game === "blackjack");
      if (bj) open(bj);
    } else if (v === "promotions") {
      if (onOpenPromotions) {
        onOpenPromotions();
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (v === "vip") {
      if (onOpenVip) onOpenVip();
      else alert("Tu progreso VIP está en la barra lateral derecha.");
    } else if (v === "logout") {
      logout();
    }
  };

  const formattedJackpot = (jackpot / 100).toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div>
      <Header
        active="lobby"
        logged={true}
        name={name}
        balance={balance}
        onNav={handleNav}
        onAddDemo={add}
        logout={logout}
        isAdmin={isAdmin}
        onAdminPanel={onAdminPanel}
      />

      <div className="lobby-wrap">
        <div>
          <div className="jackpot-card">
            <div className="jackpot-info">
              <div className="jackpot-title">
                <span className="lightning-icon">⚡</span> MEGA JACKPOT ACUMULADO
              </div>
              <div className="jackpot-amount-val">
                ${formattedJackpot} COP
              </div>
            </div>
            <div className="jackpot-status-pill">
              <span className="dot"></span> INCREMENTANDO EN TIEMPO REAL
            </div>
          </div>

          <div className="lobby-controls-bar">
            <div className="cat-pills">
              {[
                "Todos",
                "Slots",
                "Mesa",
                "En Vivo",
                "Arcade",
                "Nuevos",
                "Populares",
              ].map((c) => (
                <button
                  key={c}
                  className={cat === c ? "active" : ""}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="lobby-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar juego..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="clear-search-btn"
                  onClick={() => setSearch("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="games-grid">
            {filteredGames.map((g) => {
              const isVip =
                g.id === "bj2" ||
                g.id === "rl2" ||
                g.name.toLowerCase().includes("vip");
              const isLocked = isVip && wagered < 50000000;

              return (
                <div
                  key={g.id}
                  className={`game-card ${isLocked ? "game-card-vip-locked" : ""}`}
                  onClick={() => open(g)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="game-thumb">
                    {isLocked && (
                      <span className="vip-locked-tag">🔒 Requiere $50M</span>
                    )}
                    {isVip && !isLocked && (
                      <span
                        className="vip-locked-tag"
                        style={{ borderColor: "#22c55e", color: "#86efac" }}
                      >
                        👑 VIP
                      </span>
                    )}
                    {g.img ? (
                      <img src={g.img} alt={g.name} />
                    ) : (
                      <span>{g.icon}</span>
                    )}
                  </div>
                  <div className="game-info">
                    <b>{g.name}</b>
                    <span>{g.cats.join(" · ")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div
            className="sidebar-card vip-sidebar-card"
            onClick={onOpenVip}
            style={{ cursor: "pointer" }}
            title="Clic para ver requisitos de gasto y beneficios VIP"
          >
            <h3>
              Rango VIP: <span>{curVip.name}</span>{" "}
              <span className="rank-pct">{vipPct}%</span>
            </h3>
            <div className="vip-bar">
              <i style={{ width: `${vipPct}%` }}></i>
            </div>
            <p>{vipDesc}</p>
            <button
              className="vip-sidebar-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenVip?.();
              }}
            >
              👑 Ver Beneficios de Cada Rango ➔
            </button>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0 }}>Ganadores Recientes</h3>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "2px" }}>
                  Refresco auto (cada 2 min)
                </span>
              </div>
              <span className="live-pill" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#4ade80", fontWeight: 700 }}>
                <span className="pulse-mini" style={{ background: "#22c55e", width: "7px", height: "7px", borderRadius: "50%" }} />
                EN VIVO
              </span>
            </div>
            <div className="winners-list">
              {recentWins.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 12px", color: "#94a3b8", fontSize: "13px" }}>
                  <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>🏆</span>
                  <b>Sin ganancias registradas aún</b>
                  <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                    Las ganancias reales de los jugadores se refrescarán aquí cada 2 minutos.
                  </p>
                </div>
              ) : (
                recentWins.map((w, idx) => (
                  <div key={w.id || idx} className="winner-row real-win">
                    <div>
                      <b>{w.name}</b>
                      <span className="winner-game-tag" style={{ display: "block", fontSize: "12px", color: "#94a3b8" }}>
                        {w.game}{w.winCount && w.winCount > 1 ? ` (${w.winCount} victorias en 1 min)` : ""} · <small style={{ color: "#cbd5e1" }}>{w.timeAgo || "Reciente"}</small>
                      </span>
                    </div>
                    <div className="amt">+{COP.format(w.amt)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
