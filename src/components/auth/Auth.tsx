import React, { useState } from "react";
import {
  loginWithEmail,
  registerWithEmail,
  mapAuthError,
} from "../../services/authService";
import { syncUserProfile } from "../../services/userService";
import PasswordResetCard from "./PasswordResetCard";

export default function Auth({
  mode,
  setMode,
  back,
  login,
  initialToken = "",
}: {
  mode: "login" | "register" | "reset";
  setMode: (m: "login" | "register" | "reset") => void;
  back: () => void;
  login: (name: string, email?: string) => void;
  initialToken?: string;
}) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const user = await loginWithEmail(loginEmail.trim(), loginPass);
      const profile = await syncUserProfile(user.uid, {
        email: user.email,
        displayName: user.displayName,
      });
      login(profile.displayName, profile.email);
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const name = regName.trim() || "Jugador Oasis";
      const user = await registerWithEmail(regEmail.trim(), regPass, name);
      const profile = await syncUserProfile(user.uid, {
        email: user.email,
        displayName: name,
      });

      login(profile.displayName, profile.email);
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("El inicio de sesión con Google requiere configurar el proveedor OAuth en tu servidor de base de datos. Por favor regístrate con tu correo y contraseña.");
  };




  if (mode === "reset") {
    return (
      <div className="auth-screen">
        <button className="btn btn-ghost btn-sm auth-back" onClick={back}>
          ← Volver
        </button>
        <div className="auth-card">
          <div className="auth-logo">
            <img
              src="/src/assets/casino-oasis-brand.png"
              alt="Casino Oasis"
              className="brand-logo-img"
              style={{ height: 60 }}
            />
          </div>
          <PasswordResetCard
            initialEmail={loginEmail}
            initialToken={initialToken}
            onBackToLogin={() => {
              setMode("login");
              setErrorMsg("");
            }}
            onSuccess={() => {
              setMode("login");
              setErrorMsg("");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <button className="btn btn-ghost btn-sm auth-back" onClick={back}>
        ← Volver
      </button>
      <div className="auth-card">
        <div className="auth-logo">
          <img
            src="/src/assets/casino-oasis-brand.png"
            alt="Casino Oasis"
            className="brand-logo-img"
            style={{ height: 60 }}
          />
        </div>
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setErrorMsg("");
            }}
            type="button"
          >
            Iniciar Sesión
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setErrorMsg("");
            }}
            type="button"
          >
            Registrarse
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "0.85rem",
              marginBottom: "16px",
              lineHeight: "1.4",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Correo Electrónico</label>
              <input
                type="email"
                placeholder="ejemplo@oasis.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <div className="input-wrap">
                <input
                  type={showLoginPass ? "text" : "password"}
                  placeholder="••••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  disabled={loading}
                >
                  {showLoginPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div className="auth-forgot-row">
              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => {
                  setMode("reset");
                  setErrorMsg("");
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <button
              type="submit"
              className="btn btn-gold btn-block"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "VERIFICANDO..." : "ENTRAR AL OASIS"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Nombre</label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="field">
              <label>Correo Electrónico</label>
              <input
                type="email"
                placeholder="ejemplo@oasis.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <div className="input-wrap">
                <input
                  type={showRegPass ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="eye"
                  onClick={() => setShowRegPass(!showRegPass)}
                  disabled={loading}
                >
                  {showRegPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-gold btn-block"
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "CREANDO CUENTA..." : "CREAR CUENTA Y RECLAMAR BONO"}
            </button>
          </form>
        )}

        <div className="divider">o continúa con</div>

        <button
          className="social-btn social-btn--google"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continuar con Google
        </button>



        <div className="auth-foot">
          Al iniciar sesión, aceptas nuestros Términos de Servicio y Política de
          Privacidad de Oasis.
        </div>
      </div>
    </div>
  );
}
