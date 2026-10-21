import React, { useState, useEffect } from "react";
import {
  sendPasswordReset,
  confirmNewPassword,
  mapAuthError as mapResetError,
  verifyResetToken,
} from "../../services/authService";

interface PasswordResetCardProps {
  initialEmail?: string;
  initialToken?: string;
  onBackToLogin: () => void;
  onSuccess?: () => void;
}

export default function PasswordResetCard({
  initialEmail = "",
  initialToken = "",
  onBackToLogin,
  onSuccess,
}: PasswordResetCardProps) {
  // Step 1: "email" (formulario de correo)
  // Step 2: "check_email" (pantalla de confirmación "Revisa tu correo para continuar", 0 inputs de código)
  // Step 3: "new_password" (SOLO cuando el usuario abre el enlace con token)
  const [step, setStep] = useState<"email" | "check_email" | "new_password">(
    initialToken ? "new_password" : "email"
  );

  // Form fields
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Status & UI
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // If initialToken was received, validate it
  useEffect(() => {
    if (initialToken && step === "new_password") {
      setLoading(true);
      verifyResetToken(initialToken)
        .then((verifiedEmail) => {
          setEmail(verifiedEmail);
          setSuccessMsg(`Token validado con éxito. Define tu nueva contraseña para ${verifiedEmail}.`);
        })
        .catch((err) => {
          setErrorMsg(mapResetError(err));
          // If token expired or invalid, go back to email request after 4s
          setTimeout(() => {
            setStep("email");
            setErrorMsg("");
            setSuccessMsg("");
          }, 4000);
        })
        .finally(() => setLoading(false));
    }
  }, [initialToken, step]);

  // Step 1: Send reset email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg("Por favor ingresa tu correo electrónico.");
      setLoading(false);
      return;
    }

    try {
      await sendPasswordReset(cleanEmail);
      setStep("check_email");
      setCooldown(45);
    } catch (err: any) {
      setErrorMsg(mapResetError(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend email
  const handleResendEmail = async () => {
    if (cooldown > 0 || loading) return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      await sendPasswordReset(email.trim());
      setCooldown(45);
      setSuccessMsg("¡Enlace reenviado! Revisa tu bandeja de entrada o spam.");
    } catch (err: any) {
      setErrorMsg(mapResetError(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save new password (from link)
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      if (!initialToken) {
        throw new Error("No se encontró el token de restablecimiento. Vuelve a solicitar el enlace.");
      }

      await confirmNewPassword(initialToken, newPassword);

      setSuccessMsg("¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBackToLogin();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(mapResetError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-card-container">
      {/* HEADER */}
      <div className="reset-header">
        <span className="reset-header-icon">
          {step === "email" && "🔑"}
          {step === "check_email" && "📬"}
          {step === "new_password" && "🔒"}
        </span>
        <h2 className="reset-title">
          {step === "email" && "Restablecer Contraseña"}
          {step === "check_email" && "Revisa tu Correo"}
          {step === "new_password" && "Nueva Contraseña"}
        </h2>
        <p className="reset-subtitle">
          {step === "email" && "Ingresa tu correo y te enviaremos un enlace seguro para restablecer tu contraseña (válido por 30 minutos)."}
          {step === "check_email" && "Hemos enviado un enlace de recuperación para continuar."}
          {step === "new_password" && "Define una nueva contraseña segura para tu cuenta."}
        </p>
      </div>

      {/* ALERTS */}
      {errorMsg && (
        <div className="reset-alert reset-alert-error">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="reset-alert reset-alert-success">
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* PANTALLA 1: Solicitar Enlace por Correo */}
      {/* ============================================================ */}
      {step === "email" && (
        <form onSubmit={handleSendEmail} className="reset-form">
          <div className="field">
            <label>Correo Electrónico</label>
            <input
              type="email"
              placeholder="ejemplo@oasis.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="reset-expiry-notice">
            <span className="reset-expiry-notice-icon">⏱️</span>
            <span>El enlace de restablecimiento tendrá una validez de <strong>30 minutos</strong> desde su emisión.</span>
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-block"
            disabled={loading || !email.trim()}
          >
            {loading ? "ENVIANDO ENLACE..." : "ENVIAR ENLACE DE RECUPERACIÓN"}
          </button>

          <div className="reset-footer">
            <button
              type="button"
              className="reset-back-btn"
              onClick={onBackToLogin}
            >
              ← Volver a Iniciar Sesión
            </button>
          </div>
        </form>
      )}

      {/* ============================================================ */}
      {/* PANTALLA 2: "Revisa tu correo para continuar" (0 inputs)     */}
      {/* ============================================================ */}
      {step === "check_email" && (
        <div className="reset-check-email-view">
          <div className="reset-email-badge">
            <span className="reset-email-badge-icon">✉️</span>
            <span className="reset-email-badge-text">{email}</span>
          </div>

          <p className="reset-instruction-text">
            Abre el enlace que enviamos a tu correo electrónico para restablecer tu contraseña y volver a ingresar al Casino Oasis.
          </p>

          <div className="reset-expiry-notice">
            <span className="reset-expiry-notice-icon">⏱️</span>
            <div>
              <strong>Validez de 30 minutos:</strong> El enlace caducará automáticamente en media hora por motivos de seguridad.
            </div>
          </div>

          <div className="reset-info-tip">
            <span className="reset-tip-icon">💡</span>
            <div className="reset-tip-content">
              <strong>¿No lo ves en tu bandeja?</strong>
              <p>Revisa tu carpeta de <strong>Spam</strong>, <strong>Correo no deseado</strong> o la pestaña de <strong>Promociones</strong>.</p>
            </div>
          </div>

          {/* Reenviar enlace */}
          <div className="reset-resend-row">
            <span className="reset-resend-text">¿No recibiste nada?</span>
            <button
              type="button"
              className={`reset-resend-btn ${cooldown > 0 || loading ? "disabled" : ""}`}
              onClick={handleResendEmail}
              disabled={cooldown > 0 || loading}
            >
              {loading ? "Reenviando..." : cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar correo"}
            </button>
          </div>

          <div className="reset-actions-row">
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                setStep("email");
                setErrorMsg("");
                setSuccessMsg("");
              }}
            >
              Cambiar de Correo
            </button>
            <button
              type="button"
              className="reset-back-btn"
              onClick={onBackToLogin}
              style={{ marginTop: "8px" }}
            >
              ← Volver a Iniciar Sesión
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PANTALLA 3: Nueva Contraseña (abierta únicamente desde el link) */}
      {/* ============================================================ */}
      {step === "new_password" && (
        <form onSubmit={handleSaveNewPassword} className="reset-form">
          <div className="field">
            <label>Nueva Contraseña</label>
            <div className="input-wrap">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className="eye"
                onClick={() => setShowPass(!showPass)}
                disabled={loading}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Confirmar Nueva Contraseña</label>
            <div className="input-wrap">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Repite tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-block"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? "GUARDANDO..." : "GUARDAR NUEVA CONTRASEÑA"}
          </button>

          <div className="reset-footer">
            <button
              type="button"
              className="reset-back-btn"
              onClick={onBackToLogin}
            >
              ← Cancelar y Volver
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
