import coljuegosImg from "../../assets/coljuegos.png";
import oasisBrandImg from "../../assets/casino-oasis-brand.png";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <div className="brand footer-brand-logos" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src={oasisBrandImg}
              alt="Casino Oasis"
              className="brand-logo-img"
              style={{ height: 40, width: "auto", objectFit: "contain" }}
            />
            <img
              src={coljuegosImg}
              alt="Coljuegos"
              className="brand-logo-img footer-coljuegos-logo"
              style={{ height: 40, width: "auto", objectFit: "contain" }}
            />
          </div>
          <p>
            La plataforma líder de entretenimiento premium online. Juegos justos certificados, retiros instantáneos y la mejor experiencia VIP en español.
          </p>
          <div className="license-badges">
            <span>🔒 SSL</span>
            <span>RNG Certified</span>
          </div>
        </div>
        <div className="footer-col">
          <h4>JUEGOS</h4>
          <a>Tragamonedas</a>
          <a>Blackjack</a>
          <a>Ruleta</a>
          <a>Casino en Vivo</a>
          <a>Póker</a>
        </div>
        <div className="footer-col">
          <h4>SOPORTE</h4>
          <a>Preguntas Frecuentes</a>
          <a>Chat en Vivo</a>
          <a>Seguridad</a>
          <a>Políticas</a>
          <a>Juego Responsable</a>
        </div>
        <div className="footer-col">
          <h4>LICENCIAS Y SEGURIDAD</h4>
          <p>
            Operado bajo licencia reguladora internacional de eGaming y aval de juegos de suerte y azar. Todos los juegos están auditados y certificados por RNG externo.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © 2026 Casino Oasis. Todos los derechos reservados. — Sitio de demostración, sin dinero real.
        </span>
        <span>Términos de Servicio · Política de Privacidad</span>
      </div>
    </footer>
  );
}