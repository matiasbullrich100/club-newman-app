"use client";

// "EnJuego tips": pantalla completa que aparece al entrar a /superior o /juveniles, con un tip
// de uso de la app (numerado).
// - Cada tip se muestra UNA sola vez y no vuelve a aparecer por al menos 1 semana.
// - Cada visita muestra el siguiente tip sin ver (entrar 7 veces => tips 1..7, de a uno).
// - "+ Tips" muestra el siguiente ahi mismo (y tambien lo marca como visto).
// - "Entendido" cierra: los que falten aparecen en las proximas visitas.
// - El telefono se acuerda: el estado vive en localStorage del navegador del socio.
// Sumar un tip = agregar un objeto a TIPS (numero visible + id interno estable + texto + visual).

import { useEffect, useRef, useState } from "react";
import { DORADO, DORADO_SUAVE, CREMA, TINTA, BORDO_OSC } from "@/lib/colors";

const LS_KEY = "enjuegoTips";
const COOLDOWN_TIP_MS = 7 * 24 * 60 * 60 * 1000; // 1 semana: un tip ya visto no reaparece antes

interface EstadoTips {
  vistos: Record<string, number>; // id del tip -> timestamp de la ultima vez que se mostro
}

const PILL: React.CSSProperties = {
  width: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "rgba(53,9,22,.92)",
  border: `1px solid ${DORADO}`,
  color: DORADO_SUAVE,
  fontWeight: 700,
  flexShrink: 0,
};

function BotonesLetraMini() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }} aria-hidden="true">
      <span style={{ ...PILL, fontSize: "0.78rem" }}>A-</span>
      <span style={{ ...PILL, width: "auto", minWidth: 42, borderRadius: 17, padding: "0 7px", fontSize: "0.68rem" }}>100%</span>
      <span style={{ ...PILL, fontSize: "0.95rem" }}>A+</span>
    </div>
  );
}

function FlechasFecha() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }} aria-hidden="true">
      <span style={{ ...PILL, fontSize: "1.1rem" }}>&lsaquo;</span>
      <span style={{ fontSize: "0.72rem", color: DORADO_SUAVE, letterSpacing: 0.5 }}>Fecha</span>
      <span style={{ ...PILL, fontSize: "1.1rem" }}>&rsaquo;</span>
    </div>
  );
}

function TelefonoGirar() {
  // Telefono vertical + flecha de giro horario que lo "acuesta" hacia la derecha.
  return (
    <svg width="110" height="74" viewBox="0 0 110 74" fill="none" aria-hidden="true">
      {/* cuerpo del telefono (vertical) */}
      <rect x="26" y="6" width="34" height="58" rx="7" stroke={DORADO} strokeWidth="2.5" />
      {/* pantalla */}
      <rect x="31" y="14" width="24" height="42" rx="2" stroke={DORADO} strokeOpacity="0.3" strokeWidth="1.5" />
      {/* auricular arriba, boton de inicio abajo */}
      <line x1="38" y1="10" x2="48" y2="10" stroke={DORADO} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="43" cy="60" r="2" fill={DORADO} />
      {/* flecha de giro hacia la derecha (lo acuesta) */}
      <path d="M66 11 A 36 36 0 0 1 90 41" stroke={DORADO_SUAVE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M90 42 L83 34 L95 32 Z" fill={DORADO_SUAVE} />
    </svg>
  );
}

const TIPS: { numero: number; id: string; texto: React.ReactNode; visual?: React.ReactNode }[] = [
  {
    numero: 1,
    id: "tamano-letra",
    texto: "Agrandá y achicá la letra con los botones de abajo a la derecha.",
    visual: <BotonesLetraMini />,
  },
  {
    numero: 2,
    id: "telefono-horizontal",
    texto: "Con el teléfono horizontal, la info se ve MUCHO mejor !!!",
    visual: <TelefonoGirar />,
  },
  {
    numero: 3,
    id: "barra-equipos",
    texto:
      "En cada equipo podés usar la barra para navegar por los equipos: Primera a Pre A y a Pre E y a Inter. M19 B a M19 D y a M19 A.",
  },
  {
    numero: 4,
    id: "resumen-ultima-fecha",
    texto: 'En el resumen de la fecha, el botón "U. Fecha" tira TODOS los resultados de la fecha.',
  },
  {
    numero: 5,
    id: "fixt-newman",
    texto: "Fixture Newman tiene TODOS los resultados pasados del torneo.",
  },
  {
    numero: 6,
    id: "fixt-division",
    texto: "Fixture División tiene los resultados de todas las fechas !!!!",
  },
  {
    numero: 7,
    id: "fixt-flechas",
    texto: "En Fixture podés adelantar o atrasar de una fecha a la otra con las flechas.",
    visual: <FlechasFecha />,
  },
];

export default function EnJuegoTips() {
  const [cola, setCola] = useState<typeof TIPS>([]); // tips elegibles, en orden
  const [idx, setIdx] = useState(0);
  const yaCorrio = useRef(false); // React StrictMode invoca el effect 2 veces en dev: no consumir 2 tips

  const marcar = (id: string) => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const estado: EstadoTips = raw ? { vistos: (JSON.parse(raw) as Partial<EstadoTips>).vistos ?? {} } : { vistos: {} };
      estado.vistos[id] = Date.now();
      localStorage.setItem(LS_KEY, JSON.stringify(estado));
    } catch {
      /* no-op */
    }
  };

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;

    let vistos: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) vistos = (JSON.parse(raw) as Partial<EstadoTips>).vistos ?? {};
    } catch {
      /* storage bloqueado / json roto: arranca de cero */
    }

    const ahora = Date.now();
    const elegibles = TIPS.filter((t) => {
      const visto = vistos[t.id];
      return !visto || ahora - visto > COOLDOWN_TIP_MS;
    });
    if (elegibles.length === 0) return;

    marcar(elegibles[0].id); // el que se muestra ahora ya cuenta como visto
    // Depende de localStorage (solo cliente): aparece despues del montaje a proposito, en SSR no
    // se renderiza nada y no hay mismatch de hidratacion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCola(elegibles);
  }, []);

  useEffect(() => {
    if (cola.length === 0) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [cola.length]);

  const actual = cola[idx];
  if (!actual) return null;

  const cerrar = () => setCola([]);
  const masTips = () => {
    // Si no quedan mas tips por ver ahora, "+ Tips" simplemente cierra (los que falten apareceran
    // en las proximas visitas, de a uno).
    const siguiente = idx + 1;
    if (siguiente >= cola.length) {
      cerrar();
      return;
    }
    marcar(cola[siguiente].id);
    setIdx(siguiente);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: BORDO_OSC,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        textAlign: "center",
        color: CREMA,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: DORADO, letterSpacing: 0.5, fontSize: "0.95rem" }}>
        <FocoIcono />
        EnJuego tips
      </span>
      <span style={{ marginTop: 8, fontSize: "0.8rem", fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1 }}>
        #{actual.numero}
      </span>
      <p style={{ margin: "14px 0 0", fontSize: "1.05rem", lineHeight: 1.5, maxWidth: 340 }}>{actual.texto}</p>
      {actual.visual && <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>{actual.visual}</div>}
      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
        <button
          type="button"
          onClick={cerrar}
          style={{
            background: DORADO,
            color: TINTA,
            border: "none",
            borderRadius: 10,
            padding: "13px 20px",
            fontSize: "0.95rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            cursor: "pointer",
          }}
        >
          Entendido
        </button>
        <button
          type="button"
          onClick={masTips}
          style={{
            background: "transparent",
            color: DORADO_SUAVE,
            border: `1px solid ${DORADO_SUAVE}`,
            borderRadius: 10,
            padding: "11px 20px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + EnJuego Tips
        </button>
      </div>
    </div>
  );
}

function FocoIcono() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DORADO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z" />
    </svg>
  );
}
