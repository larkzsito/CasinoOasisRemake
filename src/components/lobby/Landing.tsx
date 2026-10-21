import React, { useRef } from "react";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import { GAMES, Game } from "../../data/games";

export default function Landing({
  onPlay,
  onAuth,
  onGame,
  wagered = 0,
  logged = false,
  name = "",
  balance = 0,
  logout,
  onOpenVip,
  onOpenPromotions,
  isAdmin = false,
  onAdminPanel,
}: {
  onPlay: () => void;
  onAuth: (m: "login" | "register" | "reset") => void;
  onGame: (g: Game) => void;
  wagered?: number;
  logged?: boolean;
  name?: string;
  balance?: number;
  logout?: () => void;
  onOpenVip?: () => void;
  onOpenPromotions?: () => void;
  isAdmin?: boolean;
  onAdminPanel?: () => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (dir: number) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
    }
  };

  const handleNav = (target: string) => {
    if (target === "landing") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === "login" || target === "register") {
      onAuth(target);
    } else if (target === "lobby") {
      onPlay();
    } else if (target === "game") {
      const bj = GAMES.find((g) => g.game === "blackjack");
      if (bj) onGame(bj);
      else onPlay();
    } else if (target === "vip") {
      if (onOpenVip) onOpenVip();
      else onPlay();
    } else if (target === "promotions") {
      if (onOpenPromotions) onOpenPromotions();
      else onPlay();
    } else if (target === "logout") {
      logout?.();
    }
  };

  const featuredGames = GAMES.filter((g) => g.cats.includes("Populares"));

  return (
    <div>
      <Header
        active="landing"
        logged={logged}
        name={name}
        balance={balance}
        onNav={handleNav}
        logout={logout}
        isAdmin={isAdmin}
        onAdminPanel={onAdminPanel}
      />

      <div className="hero">
        <div>
          <div className="eyebrow">
            <span className="dot" style={logged ? { background: "#22c55e" } : {}}></span>
            {logged
              ? `HOLA, ${name.toUpperCase()} · SESIÓN ACTIVA`
              : "NUEVO SISTEMA VIP ACTIVADO"}
          </div>
          <h1>
            Bienvenido a Casino <span>Oasis</span>
          </h1>
          <p>
            Tu destino de entretenimiento premium. Sumérgete en la acción con
            crupieres en vivo, giros emocionantes en las tragamonedas más
            populares, y retiros garantizados en minutos. El oasis de los
            grandes ganadores te espera.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gold" onClick={onPlay}>
              {logged ? "ENTRAR AL LOBBY" : "JUGAR AHORA"}
            </button>
            {logged ? (
              <button
                className="btn btn-outline"
                onClick={() => {
                  const bj = GAMES.find((g) => g.game === "blackjack");
                  if (bj) onGame(bj);
                  else onPlay();
                }}
              >
                MESAS EN VIVO
              </button>
            ) : (
              <button
                className="btn btn-outline"
                onClick={() => onAuth("register")}
              >
                REGISTRARSE
              </button>
            )}
          </div>
        </div>
        <div className="hero-art hero-art--image">
          <img
            src="/src/assets/casino-oasis-logo.jpg"
            alt="Casino Oasis - Logo"
            className="hero-art-img"
          />
        </div>
      </div>

      <div className="hero-stats">
        <div className="stat-card">
          <b>+50,000</b>
          <span>JUGADORES ACTIVOS</span>
        </div>
        <div className="stat-card">
          <b>+200</b>
          <span>JUEGOS PREMIUM</span>
        </div>
        <div className="stat-card">
          <b>24/7</b>
          <span>SOPORTE EN VIVO</span>
        </div>
        <div className="stat-card">
          <b>100%</b>
          <span>PAGOS SEGUROS</span>
        </div>
      </div>

      <div className="section-pad">
        <div className="eyebrow-sm">SELECCIÓN PREMIUM</div>
        <div className="section-title">
          <h2>Juegos Destacados</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="carousel-btn"
              onClick={() => scrollCarousel(-1)}
            >
              ‹
            </button>
            <button className="carousel-btn" onClick={() => scrollCarousel(1)}>
              ›
            </button>
          </div>
        </div>
        <div className="carousel-wrap">
          <div className="carousel" ref={carouselRef}>
            {featuredGames.map((g) => {
              const isVip =
                g.id === "bj2" ||
                g.id === "rl2" ||
                g.name.toLowerCase().includes("vip");
              const isLocked = isVip && wagered < 50000000;
              return (
                <div
                  key={g.id}
                  className={`game-tile ${
                    isLocked ? "vip-locked" : isVip ? "vip-unlocked" : ""
                  }`}
                  onClick={() => onGame(g)}
                >
                  <div className="game-thumb" style={{ background: g.bg }}>
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
      </div>

      <div className="section-pad">
        <div className="promo-cards">
          <div className="promo-card gold-bg">
            <span className="tag">WEEKLY TOURNAMENT</span>
            <h3>Torneo de Tragamonedas Semanal</h3>
            <p>
              $50,000,000 en premios acumulados. Súbete a la tabla y retira tus
              ganancias.
            </p>
            <button
              className="btn btn-gold btn-sm"
              style={{ width: "fit-content" }}
              onClick={onPlay}
            >
              Participar Gratis
            </button>
          </div>
          <div className="promo-card green-bg">
            <span className="tag">EXCLUSIVE MEMBER</span>
            <h3>Club de Lealtad Oasis VIP</h3>
            <p>
              Reembolsos diarios, gestor de cuenta personal y retiros
              ultrarrápidos.
            </p>
            <button
              className="btn btn-outline btn-sm"
              style={{ width: "fit-content" }}
              onClick={onPlay}
            >
              Conocer Beneficios
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
