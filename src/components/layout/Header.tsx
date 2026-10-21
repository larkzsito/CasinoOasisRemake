import React, { useState, useEffect, useRef } from "react";
import { COP } from "../../data/games";
import MusicControl from "./MusicControl";

function money(n: number) {
  return COP.format(Math.max(0, Math.round(n)));
}

export default function Header({
  active = "landing",
  logged = false,
  name = "",
  balance = 0,
  onNav,
  onAddDemo,
  logout,
  isAdmin = false,
  onAdminPanel,
}: {
  active?: string;
  logged?: boolean;
  name?: string;
  balance?: number;
  onNav: (v: string) => void;
  onAddDemo?: (n: number) => void;
  logout?: () => void;
  isAdmin?: boolean;
  onAdminPanel?: () => void;
}) {
  const MAX_DEPOSIT = 1000000000; // 1.000.000.000 (Mil Millones)
  const [profileOpen, setProfileOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const depositRef = useRef<HTMLDivElement>(null);

  const numericAmount = parseInt(customAmount.replace(/[^0-9]/g, ""), 10) || 0;
  const isOverLimit = numericAmount > MAX_DEPOSIT;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddDemo) return;
    const clean = customAmount.replace(/[^0-9]/g, "");
    const val = parseInt(clean, 10);
    if (val && val > 0) {
      if (val > MAX_DEPOSIT) return;
      onAddDemo(val);
      setCustomAmount("");
      setDepositOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (depositRef.current && !depositRef.current.contains(e.target as Node)) {
        setDepositOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    if (logout) {
      logout();
    } else {
      onNav("logout");
    }
  };

  return (
    <>
      <div className="promo-bar">
        <div className="promo-bar-track">
          <div className="promo-bar-content">
            <span>◆ BONO DE BIENVENIDA DEL 200% HASTA {money(1000000)} + 100 GIROS GRATIS</span>
            <span>◆ SOPORTE EN VIVO 24/7</span>
            <span>◆ RETIROS INSTANTÁNEOS EN MINUTOS</span>
            <span>◆ MESAS VIP CON CRUPIER EN DIRECTO</span>
            <span>◆ RETIROS DESDE {money(20000)}</span>
          </div>
          <div className="promo-bar-content" aria-hidden="true">
            <span>◆ BONO DE BIENVENIDA DEL 200% HASTA {money(1000000)} + 100 GIROS GRATIS</span>
            <span>◆ SOPORTE EN VIVO 24/7</span>
            <span>◆ RETIROS INSTANTÁNEOS EN MINUTOS</span>
            <span>◆ MESAS VIP CON CRUPIER EN DIRECTO</span>
            <span>◆ RETIROS DESDE {money(20000)}</span>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => onNav("landing")}>
            <img
              src="/src/assets/casino-oasis-brand.png"
              alt="Casino Oasis"
              className="brand-logo-img"
            />
          </button>
          <nav className="main-nav">
            {[
              ["landing", "Inicio"],
              ["lobby", "Lobby"],
              ["game", "Mesas en Vivo"],
              ["promotions", "Promociones"],
              ["vip", "VIP"],
            ].map(([v, t], i) => (
              <button
                key={i}
                className={active === v ? "active" : ""}
                onClick={() => onNav(v)}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="header-right">
            {logged ? (
              <>
                <div
                  className="balance-chip"
                  ref={depositRef}
                  onClick={() => onAddDemo && setDepositOpen((prev) => !prev)}
                  style={{ cursor: onAddDemo ? "pointer" : "default" }}
                  title={onAddDemo ? "Clic para recargar saldo demo" : ""}
                >
                  💰 <span>{money(balance)}</span>
                  {depositOpen && onAddDemo && (
                    <div
                      className="deposit-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="lbl">Agregar fondos demo</div>
                      <button
                        className="quick-deposit-btn"
                        onClick={() => {
                          onAddDemo(1000000);
                          setDepositOpen(false);
                        }}
                      >
                        <span>+ 1M</span>
                        <span className="quick-amt">{money(1000000)}</span>
                      </button>

                      <div className="deposit-divider">
                        <span>O escribe la cantidad</span>
                      </div>

                      <form
                        className="custom-deposit-form"
                        onSubmit={handleCustomSubmit}
                      >
                        <div
                          className={`custom-deposit-input-box ${
                            isOverLimit ? "input-overlimit" : ""
                          }`}
                        >
                          <span className="custom-curr">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 50.000.000"
                            value={customAmount}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/[^0-9]/g, "");
                              setCustomAmount(
                                digits ? Number(digits).toLocaleString("es-CO") : ""
                              );
                            }}
                            autoFocus
                          />
                        </div>

                        {isOverLimit && (
                          <div className="deposit-limit-warning">
                            ⚠️ Excede el límite de {money(MAX_DEPOSIT)} (Mil Millones)
                          </div>
                        )}

                        <div className="deposit-limit-row">
                          <span className="limit-tag">
                            Límite: {money(MAX_DEPOSIT)}
                          </span>
                          <button
                            type="button"
                            className="max-fill-btn"
                            onClick={() =>
                              setCustomAmount(
                                Number(MAX_DEPOSIT).toLocaleString("es-CO")
                              )
                            }
                          >
                            Máx (1.000M)
                          </button>
                        </div>

                        <button
                          type="submit"
                          className="custom-deposit-btn"
                          disabled={!customAmount.trim() || isOverLimit || numericAmount <= 0}
                        >
                          + Obtener Fondos
                        </button>
                      </form>
                    </div>
                  )}
                </div>
                <MusicControl />
                <div className="profile-menu-wrap" ref={menuRef}>
                  <div
                    className={`user-pill${profileOpen ? " active" : ""}`}
                    onClick={() => setProfileOpen((v) => !v)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setProfileOpen((v) => !v)
                    }
                  >
                    <div className="avatar">
                      {name
                        .split(" ")
                        .map((x) => x[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "J"}
                    </div>
                    <span>{name}</span>
                    <svg
                      className="profile-chevron"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  {profileOpen && (
                    <div className="profile-dropdown">
                      <div className="profile-dropdown-header">
                        <div className="profile-dropdown-avatar">
                          {name
                            .split(" ")
                            .map((x) => x[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "J"}
                        </div>
                        <div>
                          <div className="profile-dropdown-name">{name}</div>
                          <div className="profile-dropdown-tag">
                            {isAdmin ? "👑 Administrador" : "Jugador Demo"}
                          </div>
                        </div>
                      </div>
                      <div className="profile-dropdown-divider" />
                      {isAdmin && onAdminPanel && (
                        <button
                          className="profile-dropdown-item profile-admin-btn"
                          onClick={() => { setProfileOpen(false); onAdminPanel(); }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <rect x="3" y="14" width="7" height="7" rx="1" />
                          </svg>
                          Panel de Administración
                        </button>
                      )}
                      <button
                        className="profile-dropdown-item profile-dropdown-logout"
                        onClick={handleLogout}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onNav("login")}
                >
                  Iniciar Sesión
                </button>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => onNav("register")}
                >
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}