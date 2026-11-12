import { fechaCorta } from "@/lib/playoff";
import type { CampeonPrimera } from "@/lib/campeonPrimera";
import { BORDO, BORDO_OSC, CREMA, DORADO, DORADO_CLARO } from "@/lib/colors";

const CONFETI = [DORADO, CREMA, DORADO_CLARO, "#b9425f"];

// Cartel de festejo con el que abre el inicio cuando Primera gana la final: dos estrellas (los dos titulos), el
// NEWMAN BICAMPEON con brillo dorado, el resultado de la final y papelitos cayendo. Todo es CSS (sin JS); con
// "reducir movimiento" quedan solo el cartel y el texto, quietos.
export default function BicampeonHero({ campeon }: { campeon: CampeonPrimera }) {
  const { newman, rival, rivalNombre, fecha, sede } = campeon;
  return (
    <section
      aria-label="Newman bicampeón"
      className="bc-hero"
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        margin: "6px 0 8px",
        padding: "14px 12px 12px",
        borderRadius: 18,
        border: `1px solid ${DORADO}`,
        background: `radial-gradient(ellipse 80% 70% at 50% 0%, rgba(245,168,0,.5), transparent 70%), linear-gradient(170deg, ${BORDO} 0%, ${BORDO_OSC} 100%)`,
        boxShadow: "0 0 28px rgba(245,168,0,.28), inset 0 0 0 1px rgba(255,236,170,.14)",
      }}
    >
      <style>{`
        .bc-conf { position:absolute; top:-14px; width:7px; height:12px; border-radius:2px; opacity:0; pointer-events:none; animation: bc-caida linear infinite; }
        @keyframes bc-caida { 0% { transform: translateY(0) rotate(0deg); opacity:0; } 10% { opacity:.95; } 100% { transform: translateY(210px) rotate(720deg); opacity:0; } }
        .bc-brillo { background: linear-gradient(100deg, ${DORADO} 0%, #fff3c4 22%, ${DORADO} 44%, ${DORADO_CLARO} 100%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: bc-brillo 3.2s ease-in-out infinite; }
        @keyframes bc-brillo { 0% { background-position: 100% 0; } 50% { background-position: 0 0; } 100% { background-position: 100% 0; } }
        .bc-estrella { display:inline-block; animation: bc-pulso 2.2s ease-in-out infinite; }
        .bc-estrella:nth-child(2) { animation-delay: .5s; }
        @keyframes bc-pulso { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 3px rgba(245,168,0,.6)); } 50% { transform: scale(1.18); filter: drop-shadow(0 0 10px rgba(255,214,90,.95)); } }
        @media (prefers-reduced-motion: reduce) { .bc-conf { display:none; } .bc-brillo, .bc-estrella { animation:none; } }
      `}</style>

      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="bc-conf"
          style={{
            left: `${(i * 47 + 6) % 100}%`,
            background: CONFETI[i % CONFETI.length],
            animationDuration: `${3.4 + (i % 5) * 0.55}s`,
            animationDelay: `${((i * 0.43) % 3.6).toFixed(2)}s`,
            width: i % 3 === 0 ? 5 : 7,
            height: i % 4 === 0 ? 16 : 11,
          }}
        />
      ))}

      <div aria-hidden style={{ fontSize: "1.45rem", lineHeight: 1, color: DORADO, letterSpacing: 10 }}>
        <span className="bc-estrella">★</span>
        <span className="bc-estrella">★</span>
      </div>
      <div style={{ marginTop: 5, fontSize: "0.62rem", letterSpacing: 2.5, textTransform: "uppercase", color: CREMA, opacity: 0.9 }}>Campeón del Top 14 · 2026</div>
      <h1 className="bc-brillo" style={{ margin: "4px 0 0", fontSize: "2.25rem", lineHeight: 1, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.45))" }}>
        Newman
        <br />
        Bicampeón
      </h1>
      <div style={{ marginTop: 9, display: "inline-flex", alignItems: "baseline", gap: 9, padding: "4px 14px", borderRadius: 999, background: "rgba(0,0,0,.28)", border: "1px solid rgba(245,168,0,.45)" }}>
        <span style={{ fontSize: "0.7rem", letterSpacing: 1.5, textTransform: "uppercase", color: CREMA, opacity: 0.85 }}>Final</span>
        <span style={{ fontSize: "1.25rem", fontWeight: 900, color: DORADO_CLARO, fontVariantNumeric: "tabular-nums" }}>
          {newman} - {rival}
        </span>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: CREMA }}>{rivalNombre}</span>
      </div>
      <div style={{ marginTop: 5, fontSize: "0.64rem", letterSpacing: 1, textTransform: "uppercase", color: CREMA, opacity: 0.75 }}>
        {fechaCorta(fecha)}
        {sede ? ` · ${sede}` : ""}
      </div>
      <div style={{ marginTop: 6, fontSize: "0.85rem", fontWeight: 800, letterSpacing: 2, color: DORADO, textTransform: "uppercase" }}>¡Dale Bordó!</div>
    </section>
  );
}
