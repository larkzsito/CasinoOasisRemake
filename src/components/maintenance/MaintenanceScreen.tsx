import React, { useState, useEffect } from "react";
import { updateSiteSettings } from "../../services/siteSettingsService";

interface MaintenanceScreenProps {
  message?: string;
  maintenanceEndTime?: number | null;
  onGoToAdmin?: () => void;
  onTimerExpired?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export default function MaintenanceScreen({
  message,
  maintenanceEndTime,
  onGoToAdmin,
  onTimerExpired,
}: MaintenanceScreenProps) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    if (!maintenanceEndTime || maintenanceEndTime <= 0) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const diff = maintenanceEndTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: 0,
        });
        setIsReconnecting(true);

        // Turn off maintenance mode in Firestore automatically
        updateSiteSettings({
          maintenanceMode: false,
          maintenanceEndTime: null,
        }).catch((err) => {
          console.warn("Auto-deactivating maintenance failed:", err);
        });

        const timer = setTimeout(() => {
          if (onTimerExpired) onTimerExpired();
          else window.location.reload();
        }, 1500);
        return () => clearTimeout(timer);
      }

      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalMs: diff,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [maintenanceEndTime, onTimerExpired]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="maintenance-wrapper">
      <div className="maintenance-card">
        {/* Animated Glow Halo */}
        <div className="maintenance-halo" />

        {/* Brand & Status Badges */}
        <div className="maintenance-top-badges">
          <div className="maintenance-brand">
            <span className="maintenance-brand-icon">🎰</span>
            <span className="maintenance-brand-text">CASINO OASIS</span>
          </div>

          <div className="maintenance-status-badge">
            <span className="maintenance-status-dot" />
            <span>MANTENIMIENTO EN CURSO</span>
          </div>
        </div>

        {/* Icon with orbital pulse */}
        <div className="maintenance-icon-wrap">
          <div className="maintenance-pulse-ring" />
          <div className="maintenance-icon">🛠️</div>
        </div>

        {/* Heading */}
        <h1 className="maintenance-title">Estamos Mejorando tu Experiencia</h1>

        {/* Dynamic Message */}
        <p className="maintenance-description">
          {message ||
            "Estamos realizando labores de mantenimiento y optimización en nuestros servidores para brindarte una plataforma más rápida, segura y emocionante."}
        </p>

        {/* Real-Time Countdown Clock if scheduled */}
        {timeLeft && (
          <div className="maintenance-timer-container">
            {isReconnecting ? (
              <div className="maintenance-reconnecting-wrap">
                <div className="maintenance-spinner-mini" />
                <span className="maintenance-reconnecting-text">
                  🎉 ¡Mantenimiento finalizado! Reconectando con Casino Oasis...
                </span>
              </div>
            ) : (
              <>
                <div className="maintenance-timer-header">
                  <span className="pulse-mini" style={{ background: "#eab308" }} />
                  <span>REAPERTURA AUTOMÁTICA PROGRAMADA EN</span>
                </div>

                <div className="maintenance-timer-grid">
                  {timeLeft.days > 0 && (
                    <>
                      <div className="timer-box">
                        <div className="timer-num">{pad(timeLeft.days)}</div>
                        <div className="timer-label">DÍAS</div>
                      </div>
                      <div className="timer-colon">:</div>
                    </>
                  )}

                  <div className="timer-box">
                    <div className="timer-num">{pad(timeLeft.hours)}</div>
                    <div className="timer-label">HORAS</div>
                  </div>

                  <div className="timer-colon">:</div>

                  <div className="timer-box">
                    <div className="timer-num">{pad(timeLeft.minutes)}</div>
                    <div className="timer-label">MINUTOS</div>
                  </div>

                  <div className="timer-colon">:</div>

                  <div className="timer-box">
                    <div className="timer-num highlight-sec">{pad(timeLeft.seconds)}</div>
                    <div className="timer-label">SEGUNDOS</div>
                  </div>
                </div>

                <div className="maintenance-timer-footer">
                  <span>
                    El acceso a tus juegos favoritos se reactivará de forma automática al llegar a cero.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Live server indicator */}
        <div className="maintenance-info-box">
          <div className="maintenance-info-row">
            <span className="maintenance-info-label">Estado de servidores:</span>
            <span className="maintenance-info-value status-busy">
              <span className="pulse-mini" /> Actualizando plataforma
            </span>
          </div>
          <div className="maintenance-info-row">
            <span className="maintenance-info-label">Tus fondos y cuenta:</span>
            <span className="maintenance-info-value status-safe">🔒 100% Protegidos</span>
          </div>
        </div>

        <p className="maintenance-foot-note">
          Agradecemos tu paciencia. Estaremos de vuelta muy pronto con increíbles novedades.
        </p>

        {/* Discreet link for the admin to navigate to /admin */}
        {onGoToAdmin && (
          <div className="maintenance-admin-link-wrap">
            <button
              onClick={onGoToAdmin}
              className="maintenance-admin-link-btn"
              title="Panel de Administración"
            >
              🔒 Acceso Administrativo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
