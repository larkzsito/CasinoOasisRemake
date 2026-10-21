import { useState, useEffect, useRef } from "react";
import Landing from "./components/lobby/Landing";
import Lobby from "./components/lobby/Lobby";
import Auth from "./components/auth/Auth";
import Blackjack from "./components/games/Blackjack";
import Roulette from "./components/games/Roulette";
import Slots from "./components/games/Slots";
import Mines from "./components/games/Mines";
import Poker from "./components/games/Poker";
import Chests from "./components/games/Chests";
import Crash from "./components/games/Crash";
import PlinkoGame from "./components/games/PlinkoGame";
import ChickenRoadCasino from "./components/games/ChickenRoad";
import VipModal from "./components/vip/VipModal";
import PromotionsModal from "./components/promotions/PromotionsModal";
import AdminPanel from "./components/admin/AdminPanel";
import MaintenanceScreen from "./components/maintenance/MaintenanceScreen";
import { Game, COP } from "./data/games";
import { soundManager } from "./utils/soundManager";
import {
  onAuthStateChanged,
  logout as authLogout,
  getCurrentUser
} from "./services/authService";
import {
  syncUserProfile,
  subscribeUserProfile,
  updateUserBalanceAndWager
} from "./services/userService";
import {
  subscribeSiteSettings,
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  ADMIN_EMAIL
} from "./services/siteSettingsService";
import { recordWin } from "./services/recentWinsService";
import { subscribeDbStatus, DbStatus, checkDbHealth } from "./services/database";
import "./styles.css";


type View = "landing" | "auth" | "lobby" | "game";

// Detect if the user navigated directly to /admin (handles trailing slashes)
const getIsAdminRoute = () => {
  const p = window.location.pathname.toLowerCase().replace(/\/$/, "");
  return p === "/admin";
};

export default function App() {
  const [logged, setLogged] = useState<boolean>(false);
  const [view, setView] = useState<View>("landing");
  const [game, setGame] = useState<Game | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const [initialResetToken, setInitialResetToken] = useState<string>("");
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [promotionsModalOpen, setPromotionsModalOpen] = useState(false);

  const [name, setName] = useState<string>("Jugador Oasis");
  const [balance, setBalance] = useState<number>(10000);
  const [wagered, setWagered] = useState<number>(0);
  const [toast, setToast] = useState("");

  // --- Admin / Maintenance State ---
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(getIsAdminRoute());
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  // settingsLoaded: prevents showing any content before we know the maintenance state
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>("connecting");

  const unsubSnapshotRef = useRef<(() => void) | null>(null);
  const unsubSettingsRef = useRef<(() => void) | null>(null);

  // Monitor database connection health
  useEffect(() => {
    checkDbHealth();
    const unsub = subscribeDbStatus((status) => {
      setDbStatus(status);
    });
    return () => unsub();
  }, []);

  // Listen to site settings in real-time (maintenance mode)
  useEffect(() => {
    let settled = false;

    // Safety timeout: if Firestore doesn't respond within 6 seconds, unblock the app
    const safetyTimer = window.setTimeout(() => {
      if (!settled) {
        console.warn("[CasinoOasis] Firestore settings timeout — unblocking app with defaults");
        settled = true;
        setSiteSettings(DEFAULT_SITE_SETTINGS);
        setSettingsLoaded(true);
      }
    }, 6000);

    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeSiteSettings(
        (settings) => {
          if (!settled) settled = true;
          window.clearTimeout(safetyTimer);
          setSiteSettings(settings);
          setSettingsLoaded(true);
        },
        (_err) => {
          // On error, unblock the app with safe defaults (maintenance OFF)
          if (!settled) settled = true;
          window.clearTimeout(safetyTimer);
          setSiteSettings(DEFAULT_SITE_SETTINGS);
          setSettingsLoaded(true);
        }
      );
    } catch (e) {
      console.error("[CasinoOasis] Failed to subscribe to site settings:", e);
      window.clearTimeout(safetyTimer);
      setSiteSettings(DEFAULT_SITE_SETTINGS);
      setSettingsLoaded(true);
    }

    unsubSettingsRef.current = unsub || (() => {});
    return () => {
      window.clearTimeout(safetyTimer);
      if (unsub) unsub();
    };
  }, []);

  // Handle browser back/forward and manual URL changes to /admin
  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(getIsAdminRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Detect if user opened the page from a password reset email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const oobCode = params.get("oobCode");
    if (modeParam === "resetPassword" && oobCode) {
      setInitialResetToken(oobCode);
      setAuthMode("reset");
      setView("auth");
    }
  }, []);

  // Listen to Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(async (user) => {
      if (user) {
        setLogged(true);
        setCurrentUserEmail(user.email);
        try {
          const profile = await syncUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
          });
          setName(profile.displayName);
          setBalance(profile.balance);
          setWagered(profile.wagered);

          // Subscribe to live Firestore updates for user profile
          if (unsubSnapshotRef.current) unsubSnapshotRef.current();
          unsubSnapshotRef.current = subscribeUserProfile(user.uid, (p) => {
            if (p) {
              setName(p.displayName);
              setBalance(p.balance);
              setWagered(p.wagered);
            }
          });
        } catch (e) {
          console.error("Error loading user profile:", e);
        }
      } else {
        if (unsubSnapshotRef.current) {
          unsubSnapshotRef.current();
          unsubSnapshotRef.current = null;
        }
        setLogged(false);
        setCurrentUserEmail(null);
        setName("Jugador Oasis");
        setBalance(10000);
        setWagered(0);
        soundManager.stopAll();
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshotRef.current) unsubSnapshotRef.current();
    };
  }, []);

  useEffect(() => {
    if (view !== "game") {
      soundManager.stopAllSFX();
    }
  }, [view]);

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 3200);
  };

  const requireAuth = (next: () => void) => {
    if (logged) {
      next();
    } else {
      setAuthMode("login");
      setView("auth");
      notify("Inicia sesión o crea una cuenta para jugar.");
    }
  };

  const VIP_MIN_WAGERED = 50000000;
  const isVipGame = (g: Game) =>
    g.id === "bj2" || g.id === "rl2" || g.name.toLowerCase().includes("vip");

  const open = (g: Game) =>
    requireAuth(() => {
      if (isVipGame(g) && wagered < VIP_MIN_WAGERED) {
        const missing = VIP_MIN_WAGERED - wagered;
        notify(
          `🔒 Mesa VIP Bloqueada: Debes haber acumulado al menos ${COP.format(
            VIP_MIN_WAGERED
          )} en apuestas (Rango Platino VIP) para entrar. Llevas ${COP.format(
            wagered
          )} (Faltan ${COP.format(missing)}).`
        );
        return;
      }
      setGame(g);
      setView("game");
    });

  const MAX_DEPOSIT = 1000000000;
  const add = (n: number) => {
    if (n > MAX_DEPOSIT) {
      notify(
        `⚠️ El límite máximo por recarga es de ${COP.format(
          MAX_DEPOSIT
        )} (Mil Millones).`
      );
      return;
    }
    setBalance((b) => {
      const next = b + n;
      const user = getCurrentUser();
      if (user) {
        updateUserBalanceAndWager(user.uid, next, 0);
      }
      return next;
    });
    notify(`Se agregaron ${COP.format(n)} a tu saldo.`);
  };

  const change = (d: number, w = 0) => {
    setBalance((b) => {
      const next = b + d;
      const user = getCurrentUser();
      if (user) {
        updateUserBalanceAndWager(user.uid, next, w);
      }
      return next;
    });
    if (w) setWagered((x) => x + w);
    if (d > 0) {
      recordWin(name, game?.name || "Casino Oasis", d);
    }
  };

  const logout = async () => {
    try {
      await authLogout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    setLogged(false);
    setName("Jugador Oasis");
    setBalance(10000);
    setWagered(0);
    setView("landing");
    soundManager.stopAll();
    notify("Sesión cerrada. ¡Hasta pronto!");
  };

  const navigateToAdmin = () => {
    window.history.pushState({}, "", "/admin");
    setIsAdminRoute(true);
  };

  const navigateHome = () => {
    window.history.pushState({}, "", "/");
    setIsAdminRoute(false);
  };

  const gp = {
    title: game?.name || "",
    name,
    balance,
    change,
    notify,
    back: () => setView("lobby"),
  };

  // ------------------------------------------------------------------
  // 1. Admin route — always immediately accessible without waiting for settings
  // ------------------------------------------------------------------
  if (isAdminRoute) {
    return (
      <AdminPanel
        settings={siteSettings}
        onNavigateHome={navigateHome}
      />
    );
  }

  // ------------------------------------------------------------------
  // 2. Block rendering until site settings are loaded from Firestore
  //    (prevents flash of content before we know if maintenance is ON)
  // ------------------------------------------------------------------
  if (!settingsLoaded) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-spinner" />
        <p className="app-loading-text">Conectando con Casino Oasis...</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 3. Maintenance mode — block ALL users except the admin
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // 3. Maintenance mode — block ALL users except the admin
  //    If a countdown was scheduled and already finished, let users in
  // ------------------------------------------------------------------
  const isAdmin = currentUserEmail === ADMIN_EMAIL;
  const isMaintenanceExpired =
    siteSettings.maintenanceMode &&
    typeof siteSettings.maintenanceEndTime === "number" &&
    siteSettings.maintenanceEndTime > 0 &&
    Date.now() >= siteSettings.maintenanceEndTime;

  const isMaintenanceActiveForUsers = siteSettings.maintenanceMode && !isMaintenanceExpired;

  if (isMaintenanceActiveForUsers && !isAdmin) {
    return (
      <MaintenanceScreen
        message={siteSettings.maintenanceMessage}
        maintenanceEndTime={siteSettings.maintenanceEndTime}
        onGoToAdmin={navigateToAdmin}
        onTimerExpired={() => {
          window.location.reload();
        }}
      />
    );
  }

  // ------------------------------------------------------------------
  // 4. Normal app flow — existing functionality preserved
  //    Admin sees a floating banner when maintenance is ON
  // ------------------------------------------------------------------
  return (
    <div>
      {/* Database status banner if disconnected */}
      {dbStatus === "disconnected" && (
        <div className="db-alert-banner">
          <div className="db-alert-content">
            <span className="db-alert-icon">⚠️</span>
            <div className="db-alert-text">
              <strong>Base de Datos Desconectada:</strong> Para autenticar usuarios, guardar saldos y sincronizar el chat, inicia el servidor con <code>npm run server</code> o configura <code>VITE_DATABASE_URL</code> en tu archivo <code>.env</code>.
            </div>
          </div>
        </div>
      )}

      {/* Admin floating banner — only visible to admin when maintenance is active */}
      {siteSettings.maintenanceMode && isAdmin && (
        <div className="admin-floating-banner">
          <div className="admin-banner-left">
            <span>🔴 MODO MANTENIMIENTO ACTIVO</span>
            <span className="admin-banner-pill">Solo tú como admin puedes ver el sitio</span>
          </div>
          <button onClick={navigateToAdmin} className="admin-banner-btn">
            Ir al Panel de Admin →
          </button>
        </div>
      )}

      {view === "landing" && (
        <Landing
          onPlay={() => requireAuth(() => setView("lobby"))}
          onAuth={(m: any) => {
            setAuthMode(m);
            setView("auth");
          }}
          onGame={open}
          onOpenVip={() => setVipModalOpen(true)}
          onOpenPromotions={() => setPromotionsModalOpen(true)}
          wagered={wagered}
          logged={logged}
          name={name}
          balance={balance}
          logout={logout}
          isAdmin={isAdmin}
          onAdminPanel={navigateToAdmin}
        />
      )}

      {view === "auth" && (
        <Auth
          mode={authMode}
          setMode={setAuthMode}
          initialToken={initialResetToken}
          back={() => setView("landing")}
          login={(n: string) => {
            setName(n);
            setLogged(true);
            setView("lobby");
            soundManager.playRandomBgm();
            notify(`¡Bienvenido al Oasis, ${n}!`);
          }}
        />
      )}

      {view === "lobby" && (
        <Lobby
          name={name}
          balance={balance}
          wagered={wagered}
          add={add}
          open={open}
          onOpenVip={() => setVipModalOpen(true)}
          onOpenPromotions={() => setPromotionsModalOpen(true)}
          home={() => setView("landing")}
          logout={logout}
          isAdmin={isAdmin}
          onAdminPanel={navigateToAdmin}
        />
      )}

      {view === "game" &&
        game &&
        (game.game === "blackjack" ? (
          <Blackjack {...gp} />
        ) : game.game === "roulette" ? (
          <Roulette {...gp} />
        ) : game.game === "slots" ? (
          <Slots {...gp} />
        ) : game.game === "mines" ? (
          <Mines {...gp} />
        ) : game.game === "poker" ? (
          <Poker {...gp} />
        ) : game.game === "crash" ? (
          <Crash {...gp} />
        ) : game.game === "plinko" ? (
          <PlinkoGame {...gp} />
        ) : game.game === "chicken" ? (
          <ChickenRoadCasino {...gp} />
        ) : (
          <Chests {...gp} />
        ))}

      {/* VIP Modal detailing ranks, spend requirements and benefits */}
      <VipModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        wagered={wagered}
      />

      {/* Promotions Modal detailing active bonuses, codes, and tournament details */}
      <PromotionsModal
        isOpen={promotionsModalOpen}
        onClose={() => setPromotionsModalOpen(false)}
        onOpenVip={() => {
          setPromotionsModalOpen(false);
          setVipModalOpen(true);
        }}
        onGoToDeposit={() => {
          setPromotionsModalOpen(false);
          if (!logged) {
            requireAuth(() => setView("lobby"));
          } else {
            setView("lobby");
          }
        }}
        onNotify={notify}
      />

      {toast && (
        <div id="toast-wrap">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  );
}