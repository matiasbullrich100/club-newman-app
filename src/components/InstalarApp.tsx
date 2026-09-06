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

export default function InstalarApp() {
  const [vista, setVista] = useState<"oculto" | "cartel" | "pasos">("oculto");
  const [plataforma, setPlataforma] = useState<Plataforma>("otro");
  const [promptNativo, setPromptNativo] = useState<PromptInstalacion | null>(null);

  useEffect(() => {
    if (yaInstalada()) return;
    setPlataforma(detectarPlataforma());

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
    setVista("cartel");
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
    const pasos =
      plataforma === "ios"
        ? [
            "Tocá el botón Compartir (un cuadrado con una flecha hacia arriba) en la barra de abajo de Safari.",
            'Deslizá hacia abajo y elegí "Agregar a inicio".',
            "Listo: te queda el ícono de EnJuego en la pantalla del celular.",
          ]
        : plataforma === "android"
          ? [
              "Tocá el menú (tres puntitos) arriba a la derecha en Chrome.",
              'Elegí "Instalar aplicación" (o "Agregar a pantalla principal").',
              "Listo: te queda el ícono de EnJuego en la pantalla del celular.",
            ]
          : [
              'Abrí el menú de tu navegador y buscá "Instalar" o "Agregar a pantalla de inicio".',
              "Confirmá y listo: te queda el ícono de EnJuego.",
            ];
    return (
      <div style={marco}>
        <div style={{ fontWeight: 700, color: DORADO, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.85rem", marginBottom: 12 }}>
          Instalar app EnJuego
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <FlechaDescarga />
        <span style={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.25 }}>
          Instalar app EnJuego en mi dispositivo
        </span>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: "0.82rem", opacity: 0.9 }}>
        Queda el ícono en la pantalla del celular y abre en pantalla completa, como una app.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={instalar} style={botonPrimario}>
          Instalar
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
