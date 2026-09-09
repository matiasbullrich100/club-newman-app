"use client";

// Cartel "Instalar app EnJuego en mi dispositivo" que aparece en la home. NO es una instalacion
// de tienda: en Android puede disparar el prompt nativo del navegador; en iPhone (Apple no
// permite instalar de un toque) muestra el paso a paso de Compartir -> Agregar a inicio.
//
// La eleccion del usuario se guarda en el navegador del telefono (localStorage, sin vencimiento):
//   - "nunca"  -> no se muestra mas.
//   - <timestamp> -> "recordar mas tarde": vuelve a aparecer pasadas 24 h.
// Si la app ya corre agregada a la pantalla de inicio (standalone), no se muestra nunca.

import { useEffect, useState } from "react";
import { BORDO_CLARO, CREMA, DORADO, DORADO_SUAVE, TINTA } from "@/lib/colors";

const LS_KEY = "instalarApp";
const RECORDAR_MS = 24 * 60 * 60 * 1000; // 24 h

type Plataforma = "ios" | "android" | "otro";

interface PromptInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectarPlataforma(): Plataforma {
  if (typeof navigator === "undefined") return "otro";
  const ua = navigator.userAgent || "";
  const esIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPad con iPadOS 13+
  if (esIOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "otro";
}

function yaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Compu (mouse) vs celular/tablet (táctil). En la compu no se "instala una app": lo que la gente
// quiere es un acceso directo en el escritorio -> cambia el texto del cartel.
function esEscritorio(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const esMovil =
    /android|iphone|ipad|ipod|mobile/i.test(ua) || window.matchMedia?.("(pointer: coarse)").matches === true;
  return !esMovil;
}

export default function InstalarApp() {
  const [vista, setVista] = useState<"oculto" | "cartel" | "pasos">("oculto");
  const [escritorio, setEscritorio] = useState(false);
  const [promptNativo, setPromptNativo] = useState<PromptInstalacion | null>(null);

  useEffect(() => {
    if (yaInstalada()) return;

    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem(LS_KEY);
    } catch {
      /* modo incognito / storage bloqueado: se muestra igual */
    }
    if (guardado === "nunca") return;
    if (guardado && Date.now() - Number(guardado) < RECORDAR_MS) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // evita el mini-infobar de Chrome; lo disparamos nosotros
      setPromptNativo(e as PromptInstalacion);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // El cartel depende de datos que solo existen en el cliente (standalone / localStorage), asi
    // que se muestra despues del montaje a proposito -- en SSR y en la primera pasada de hidratacion
    // no se renderiza nada, evitando un mismatch de hidratacion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVista("cartel");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEscritorio(esEscritorio());
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const guardar = (valor: string) => {
    try {
      localStorage.setItem(LS_KEY, valor);
    } catch {
      /* no-op */
    }
  };
  const recordarMasTarde = () => {
    guardar(String(Date.now()));
    setVista("oculto");
  };
  const noPreguntarMas = () => {
    guardar("nunca");
    setVista("oculto");
  };
  const instalar = async () => {
    if (promptNativo) {
      await promptNativo.prompt();
      const eleccion = await promptNativo.userChoice.catch(() => null);
      setPromptNativo(null);
      if (eleccion?.outcome === "accepted") {
        setVista("oculto");
        return;
      }
    }
    setVista("pasos");
  };

  if (vista === "oculto") return null;

  const marco: React.CSSProperties = {
    background: BORDO_CLARO,
    border: `1px solid ${DORADO}`,
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
    color: CREMA,
  };
  const botonPrimario: React.CSSProperties = {
    flex: 1,
    background: DORADO,
    color: TINTA,
    border: "none",
    borderRadius: 8,
    padding: "11px 12px",
    fontSize: "0.9rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    cursor: "pointer",
  };
  const botonSecundario: React.CSSProperties = {
    background: "transparent",
    color: DORADO_SUAVE,
    border: `1px solid ${DORADO_SUAVE}`,
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  };

  if (vista === "pasos") {
    const plataforma = detectarPlataforma();
    const pasos: React.ReactNode[] =
      plataforma === "ios"
        ? [
            <span key="compartir">
              Tocá el botón Compartir <IconoCompartir /> en la barra de abajo de Safari.
            </span>,
            'Deslizá hacia abajo y elegí "Agregar a inicio".',
            "Listo: te queda el ícono de EnJuego en la pantalla del celular.",
          ]
        : plataforma === "android"
          ? [
              "Tocá el menú (tres puntitos) arriba a la derecha en Chrome.",
              'Elegí "Instalar aplicación" (o "Agregar a pantalla principal").',
              "Listo: te queda el ícono de EnJuego en la pantalla del celular.",
            ]
          : escritorio
            ? [
                'Abrí el menú del navegador (⋮ arriba a la derecha) y elegí "Instalar EnJuego…" o "Crear acceso directo".',
                'Si te lo ofrece, marcá "Abrir como ventana" y confirmá.',
                "Listo: te queda el ícono de EnJuego en el escritorio.",
              ]
            : [
                'Abrí el menú de tu navegador y buscá "Instalar" o "Agregar a pantalla de inicio".',
                "Confirmá y listo: te queda el ícono de EnJuego.",
              ];
    return (
      <div style={marco}>
        <div style={{ fontWeight: 700, color: DORADO, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.85rem", marginBottom: 12 }}>
          {escritorio ? "Guardar ícono de EnJuego" : "Instalar app EnJuego"}
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: "0.85rem", lineHeight: 1.35 }}>
          {pasos.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
        <button type="button" onClick={recordarMasTarde} style={{ ...botonPrimario, width: "100%", marginTop: 14 }}>
          Entendido
        </button>
      </div>
    );
  }

  return (
    <div style={marco}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <FlechaDescarga />
        <span style={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.25 }}>
          {escritorio ? "Guardar el ícono de EnJuego en el escritorio" : "Instalar app EnJuego en mi dispositivo"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={instalar} style={botonPrimario}>
          {escritorio ? "Guardar ícono" : "Instalar"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={recordarMasTarde} style={{ ...botonSecundario, flex: 1 }}>
          Recordármelo más tarde
        </button>
        <button type="button" onClick={noPreguntarMas} style={{ ...botonSecundario, flex: 1 }}>
          No volver a preguntar
        </button>
      </div>
    </div>
  );
}

function FlechaDescarga() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={DORADO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

// Icono "Compartir" de iOS (caja abierta arriba + flecha hacia arriba) -- va incrustado en el
// texto del paso 1, en lugar de describirlo con palabras.
function IconoCompartir() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Compartir"
      style={{ verticalAlign: "-2px", margin: "0 1px" }}
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
