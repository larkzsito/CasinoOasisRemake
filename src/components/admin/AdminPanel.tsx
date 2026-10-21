import React, { useState, useEffect } from "react";
import {
  logout as authLogout,
  onAuthStateChanged,
  getCurrentUser,
  User
} from "../../services/authService";
import {
  ADMIN_EMAIL,
  SiteSettings,
  updateSiteSettings,
  DEFAULT_SITE_SETTINGS
} from "../../services/siteSettingsService";

interface AdminPanelProps {
  settings: SiteSettings;
  onNavigateHome: () => void;
}

export default function AdminPanel({ settings, onNavigateHome }: AdminPanelProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [authLoading, setAuthLoading] = useState<boolean>(!getCurrentUser());

  // Admin action state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Countdown / Schedule options for modal
  const [scheduleMode, setScheduleMode] = useState<"indefinite" | "preset" | "custom">("preset");
  const [presetMinutes, setPresetMinutes] = useState<number>(30);
  const [customDateTime, setCustomDateTime] = useState<string>("");

  // Live remaining time ticker
  const [now, setNow] = useState<number>(Date.now());

  // Editable maintenance message
  const [customMessage, setCustomMessage] = useState(settings.maintenanceMessage || DEFAULT_SITE_SETTINGS.maintenanceMessage);
  const [savingMessage, setSavingMessage] = useState(false);

  // Keep custom message in sync if settings update remotely
  useEffect(() => {
    if (settings.maintenanceMessage) {
      setCustomMessage(settings.maintenanceMessage);
    }
  }, [settings.maintenanceMessage]);

  // Auth observer with safety timeout so screen never hangs
  useEffect(() => {
    const active = getCurrentUser();
    if (active) {
      setCurrentUser(active);
      setAuthLoading(false);
    }
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 800);

    const unsub = onAuthStateChanged((user) => {
      clearTimeout(timer);
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  // Update clock every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const notifyFeedback = (type: "success" | "error", text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4500);
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      notifyFeedback("success", "Sesión cerrada correctamente.");
    } catch (err: any) {
      console.error("Error signing out:", err);
    }
  };

  // Calculate target end time based on selection
  const computeTargetEndTime = (): number | null => {
    if (scheduleMode === "indefinite") return null;
    if (scheduleMode === "preset") {
      return Date.now() + presetMinutes * 60 * 1000;
    }
    if (scheduleMode === "custom" && customDateTime) {
      const parsed = new Date(customDateTime).getTime();
      return isNaN(parsed) || parsed <= Date.now() ? null : parsed;
    }
    return null;
  };

  // Toggle maintenance ON (requires confirmation)
  const confirmActivateMaintenance = async () => {
    setShowConfirmModal(false);
    setSavingAction(true);
    try {
      const endTime = computeTargetEndTime();
      await updateSiteSettings({
        maintenanceMode: true,
        maintenanceMessage: customMessage.trim(),
        maintenanceEndTime: endTime,
      });
      notifyFeedback(
        "success",
        endTime
          ? `🔴 Modo mantenimiento ACTIVADO con cuenta regresiva hasta las ${new Date(endTime).toLocaleTimeString("es-CO")}.`
          : "🔴 Modo mantenimiento ACTIVADO indefinidamente."
      );
    } catch (err: any) {
      console.error("Error activating maintenance mode:", err);
      notifyFeedback("error", `Error de permisos o conexión: ${err?.message || "No se pudo actualizar."}`);
    } finally {
      setSavingAction(false);
    }
  };

  // Toggle maintenance OFF (direct)
  const deactivateMaintenance = async () => {
    setSavingAction(true);
    try {
      await updateSiteSettings({
        maintenanceMode: false,
        maintenanceEndTime: null,
      });
      notifyFeedback("success", "🟢 Modo mantenimiento DESACTIVADO. El sitio está en línea para todos.");
    } catch (err: any) {
      console.error("Error deactivating maintenance mode:", err);
      notifyFeedback("error", `Error de permisos o conexión: ${err?.message || "No se pudo actualizar."}`);
    } finally {
      setSavingAction(false);
    }
  };

  // Quick adjust / extend maintenance time while active
  const handleAdjustEndTime = async (extraMinutes: number) => {
    setSavingAction(true);
    try {
      const baseTime = (settings.maintenanceEndTime && settings.maintenanceEndTime > Date.now())
        ? settings.maintenanceEndTime
        : Date.now();
      const newEndTime = baseTime + extraMinutes * 60 * 1000;
      await updateSiteSettings({
        maintenanceEndTime: newEndTime,
      });
      notifyFeedback(
        "success",
        `⏱️ Se añadieron ${extraMinutes} min. Nueva reapertura: ${new Date(newEndTime).toLocaleTimeString("es-CO")}`
      );
    } catch (err: any) {
      console.error("Error adjusting maintenance time:", err);
      notifyFeedback("error", "No se pudo ajustar el tiempo.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleClearCountdown = async () => {
    setSavingAction(true);
    try {
      await updateSiteSettings({
        maintenanceEndTime: null,
      });
      notifyFeedback("success", "ℹ️ Cuenta regresiva cancelada. Ahora el mantenimiento es indefinido.");
    } catch (err: any) {
      console.error("Error clearing countdown:", err);
      notifyFeedback("error", "No se pudo quitar la cuenta regresiva.");
    } finally {
      setSavingAction(false);
    }
  };

  // Save custom message only
  const handleSaveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim()) return;
    setSavingMessage(true);
    try {
      await updateSiteSettings({
        maintenanceMessage: customMessage.trim(),
      });
      notifyFeedback("success", "Mensaje de mantenimiento actualizado.");
    } catch (err: any) {
      console.error("Error saving message:", err);
      notifyFeedback("error", `Error al guardar mensaje: ${err?.message}`);
    } finally {
      setSavingMessage(false);
    }
  };

  // Format date helper
  const formatTimestamp = (ts: any) => {
    if (!ts) return "Desconocida / Inicial";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(date);
    } catch {
      return "Reciente";
    }
  };

  // 1. Loading state while checking Auth
  if (authLoading) {
    return (
      <div className="admin-loading-wrapper">
        <div className="admin-spinner" />
        <p>Verificando credenciales de administrador...</p>
      </div>
    );
  }

  // Not logged in or unauthorized user -> Access Restricted
  const isAuthorized = currentUser && currentUser.email === ADMIN_EMAIL;
  if (!isAuthorized) {
    return (
      <div className="admin-denied-wrapper">
        <div className="admin-denied-card">
          <div className="admin-denied-icon">🚫</div>
          <h2>Acceso Restringido</h2>
          <p>
            El panel de control está reservado exclusivamente para la administración de Casino Oasis.
          </p>
          <div className="admin-denied-warning">
            Para acceder, inicia sesión con tu cuenta de administrador en la página principal del casino y pulsa el botón <strong>Panel de Administración</strong> desde el menú de tu perfil.
          </div>
          <div className="admin-denied-actions" style={{ marginTop: "20px" }}>
            {currentUser && (
              <button onClick={handleLogout} className="admin-btn-logout">
                Cerrar Sesión
              </button>
            )}
            <button onClick={onNavigateHome} className="admin-btn-back" style={{ flex: 1 }}>
              ← Volver al Casino Oasis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin Dashboard
  const isMaintenanceActive = settings.maintenanceMode;
  const hasCountdown = Boolean(settings.maintenanceEndTime && settings.maintenanceEndTime > 0);
  const remainingMs = hasCountdown ? (settings.maintenanceEndTime! - now) : 0;
  const isExpired = hasCountdown && remainingMs <= 0;

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return "00:00 (Expira ahora)";
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="admin-dashboard-wrapper">
      {/* Feedback Toast */}
      {actionFeedback && (
        <div className={`admin-toast ${actionFeedback.type}`}>
          {actionFeedback.text}
        </div>
      )}

      {/* Confirmation Modal for Activating Maintenance */}
      {showConfirmModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: "520px" }}>
            <div className="admin-modal-icon">⚠️</div>
            <h3>¿Activar Modo Mantenimiento?</h3>
            <p>
              Los usuarios verán la pantalla de mantenimiento. Puedes configurar una cuenta regresiva para reactivar el sitio automáticamente:
            </p>

            {/* Scheduling Mode Selection */}
            <div className="admin-sched-selector">
              <label className="admin-sched-title">Opciones de reactivación:</label>
              
              <div className="admin-sched-options">
                <button
                  type="button"
                  className={`admin-sched-choice ${scheduleMode === "preset" ? "active" : ""}`}
                  onClick={() => setScheduleMode("preset")}
                >
                  ⏱️ Por tiempo
                </button>
                <button
                  type="button"
                  className={`admin-sched-choice ${scheduleMode === "custom" ? "active" : ""}`}
                  onClick={() => setScheduleMode("custom")}
                >
                  📅 Fecha exacta
                </button>
                <button
                  type="button"
                  className={`admin-sched-choice ${scheduleMode === "indefinite" ? "active" : ""}`}
                  onClick={() => setScheduleMode("indefinite")}
                >
                  🔒 Indefinido
                </button>
              </div>

              {scheduleMode === "preset" && (
                <div className="admin-preset-grid">
                  {[
                    { label: "15 min", mins: 15 },
                    { label: "30 min", mins: 30 },
                    { label: "1 hora", mins: 60 },
                    { label: "2 horas", mins: 120 },
                    { label: "4 horas", mins: 240 },
                  ].map((p) => (
                    <button
                      key={p.mins}
                      type="button"
                      className={`admin-preset-chip ${presetMinutes === p.mins ? "active" : ""}`}
                      onClick={() => setPresetMinutes(p.mins)}
                    >
                      {p.label}
                    </button>
                  ))}
                  <p className="admin-sched-hint">
                    El sitio volverá a estar disponible automáticamente a las{" "}
                    <strong>
                      {new Date(Date.now() + presetMinutes * 60 * 1000).toLocaleTimeString("es-CO")}
                    </strong>
                  </p>
                </div>
              )}

              {scheduleMode === "custom" && (
                <div className="admin-custom-date-wrap">
                  <input
                    type="datetime-local"
                    className="admin-datetime-input"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                  />
                  <p className="admin-sched-hint">
                    Selecciona el día y hora exactos en que finalizará el mantenimiento.
                  </p>
                </div>
              )}

              {scheduleMode === "indefinite" && (
                <p className="admin-sched-hint alert-hint">
                  El sitio permanecerá bloqueado hasta que pulses "Desactivar Mantenimiento" manualmente.
                </p>
              )}
            </div>

            <div className="admin-modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="admin-modal-btn-cancel"
                disabled={savingAction}
              >
                Cancelar
              </button>
              <button
                onClick={confirmActivateMaintenance}
                className="admin-modal-btn-confirm"
                disabled={savingAction}
              >
                {savingAction ? "Activando..." : "Sí, Activar Mantenimiento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <span className="admin-brand-icon">🎰</span>
          <div>
            <h1 className="admin-brand-title">Casino Oasis — Panel de Control</h1>
            <span className="admin-role-badge">ADMINISTRADOR</span>
          </div>
        </div>
        <div className="admin-topbar-right">
          <div className="admin-user-info">
            <span className="admin-user-dot" />
            <span>{currentUser.email}</span>
          </div>
          <button onClick={onNavigateHome} className="admin-nav-btn" title="Ir a la web principal">
            🌐 Ver Sitio Web
          </button>
          <button onClick={handleLogout} className="admin-logout-btn" title="Cerrar sesión">
            Salir
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="admin-main">
        {/* Status Hero Card */}
        <div className={`admin-status-card ${isMaintenanceActive ? "status-maintenance" : "status-online"}`}>
          <div className="admin-status-card-header">
            <div>
              <span className="admin-card-subtitle">ESTADO ACTUAL DEL SITIO EN TIEMPO REAL</span>
              <h2 className="admin-status-card-title">
                {isMaintenanceActive ? "🔴 MODO MANTENIMIENTO ACTIVO" : "🟢 SITIO FUNCIONANDO"}
              </h2>
            </div>
            <div className={`admin-live-pill ${isMaintenanceActive ? "pill-maint" : "pill-online"}`}>
              <span className="pill-dot" />
              <span>{isMaintenanceActive ? "Sitio Bloqueado" : "Sitio En Línea"}</span>
            </div>
          </div>

          <p className="admin-status-description">
            {isMaintenanceActive
              ? "Los usuarios que visiten la web pública verán la pantalla de mantenimiento con la información en tiempo real. Solo tú como administrador puedes navegar por la plataforma."
              : "La plataforma pública está completamente operativa para todos los usuarios y jugadores."}
          </p>

          {/* If maintenance is active, show Countdown Status Bar */}
          {isMaintenanceActive && (
            <div className="admin-countdown-panel">
              <div className="admin-countdown-header">
                <div className="admin-countdown-icon">⏱️</div>
                <div>
                  <h4 className="admin-countdown-title">
                    {hasCountdown
                      ? isExpired
                        ? "¡Tiempo Programado Cumplido!"
                        : "Cuenta Regresiva Activa para Reapertura Automática"
                      : "Mantenimiento Indefinido (Sin cuenta regresiva)"}
                  </h4>
                  <p className="admin-countdown-subtitle">
                    {hasCountdown
                      ? isExpired
                        ? "El tiempo límite ha expirado. Los usuarios podrán acceder o puedes desactivarlo formalmente."
                        : `Finalización programada: ${formatTimestamp(settings.maintenanceEndTime)}`
                      : "Puedes asignar una cuenta regresiva para que los usuarios vean el tiempo restante."}
                  </p>
                </div>
                {hasCountdown && !isExpired && (
                  <div className="admin-countdown-live-badge">
                    {formatRemaining(remainingMs)}
                  </div>
                )}
              </div>

              {/* Countdown modification buttons */}
              <div className="admin-countdown-controls">
                <span className="admin-ctrl-label">Ajustar tiempo:</span>
                <button
                  onClick={() => handleAdjustEndTime(15)}
                  disabled={savingAction}
                  className="admin-time-btn"
                >
                  +15 min
                </button>
                <button
                  onClick={() => handleAdjustEndTime(30)}
                  disabled={savingAction}
                  className="admin-time-btn"
                >
                  +30 min
                </button>
                <button
                  onClick={() => handleAdjustEndTime(60)}
                  disabled={savingAction}
                  className="admin-time-btn"
                >
                  +1 hora
                </button>
                {hasCountdown && (
                  <button
                    onClick={handleClearCountdown}
                    disabled={savingAction}
                    className="admin-time-btn-danger"
                    title="Remover la cuenta regresiva y dejarlo indefinido"
                  >
                    ✕ Quitar temporizador
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Action Toggle Buttons */}
          <div className="admin-actions-bar">
            {isMaintenanceActive ? (
              <button
                onClick={deactivateMaintenance}
                disabled={savingAction}
                className="admin-btn-action btn-deactivate"
              >
                {savingAction ? "Procesando..." : "✅ Desactivar Mantenimiento (Poner En Línea Ahora)"}
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={savingAction}
                className="admin-btn-action btn-activate"
              >
                {savingAction ? "Procesando..." : "🛑 Activar Modo Mantenimiento"}
              </button>
            )}
          </div>
        </div>

        <div className="admin-grid-two">
          {/* Card: Custom Maintenance Message */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>📝 Mensaje de Mantenimiento</h3>
            </div>
            <p className="admin-card-text">
              Personaliza el mensaje que verán los usuarios en la pantalla de mantenimiento:
            </p>
            <form onSubmit={handleSaveMessage} className="admin-msg-form">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                placeholder="Escribe el mensaje para los jugadores..."
                className="admin-textarea"
                required
              />
              <button
                type="submit"
                disabled={savingMessage}
                className="admin-btn-save-msg"
              >
                {savingMessage ? "Guardando..." : "💾 Guardar Mensaje en Base de Datos"}
              </button>
            </form>
          </div>

          {/* Card: Audit & Technical Information */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>🔍 Información de Auditoría</h3>
            </div>
            <div className="admin-audit-list">
              <div className="admin-audit-item">
                <span className="audit-label">Documento Firestore:</span>
                <span className="audit-value font-mono">settings/site</span>
              </div>
              <div className="admin-audit-item">
                <span className="audit-label">Estado de Mantenimiento:</span>
                <span className={`audit-value font-bold ${isMaintenanceActive ? "text-red" : "text-green"}`}>
                  {isMaintenanceActive ? "TRUE (Activo)" : "FALSE (Inactivo)"}
                </span>
              </div>
              <div className="admin-audit-item">
                <span className="audit-label">Reactivación Programada:</span>
                <span className="audit-value text-gold font-bold">
                  {hasCountdown ? formatTimestamp(settings.maintenanceEndTime) : "Indefinida"}
                </span>
              </div>
              <div className="admin-audit-item">
                <span className="audit-label">Última Modificación:</span>
                <span className="audit-value">{formatTimestamp(settings.updatedAt)}</span>
              </div>
              <div className="admin-audit-item">
                <span className="audit-label">Modificado por:</span>
                <span className="audit-value font-mono">{settings.updatedBy || ADMIN_EMAIL}</span>
              </div>
              <div className="admin-audit-item">
                <span className="audit-label">Protección Firestore:</span>
                <span className="audit-value text-gold">Security Rules Activas</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
