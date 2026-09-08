"use client";

import { useEffect, useState } from "react";

// Pastilla "← Portal" fija arriba a la izquierda, ENCIMA de Inicio/Atrás. Aparece SOLO si se llegó
// a Newman desde el portal de torneos (link con `?from=portal`), y solo durante esa pestaña
// (sessionStorage). Un socio que entra directo no la ve -- importante mientras el portal no sea
// público. BackLink lee el mismo flag y se corre hacia abajo para no pisarse con esta.
const PORTAL_URL = "https://enjuego-portal.vercel.app";

export function vieneDelPortal(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("from") === "portal") {
      sessionStorage.setItem("desdePortal", "1");
    }
    return sessionStorage.getItem("desdePortal") === "1";
  } catch {
    return false;
  }
}

export default function PastillaPortal() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    // set-state-in-effect a propósito: el flag depende de window/sessionStorage, que no existen en
    // el server -- se resuelve recién en el cliente, después del primer render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMostrar(vieneDelPortal());
  }, []);

  if (!mostrar) return null;

  return (
    <a
      href={PORTAL_URL}
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        zIndex: 101,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 700,
        fontSize: "0.78rem",
        letterSpacing: 1,
        textTransform: "uppercase",
        // Colores del PORTAL (verde cancha + lima), no los de Newman -> se distingue de Inicio/Atrás.
        color: "#8ce99a",
        background: "#16241c",
        border: "2px solid #8ce99a",
        padding: "5px 10px",
        borderRadius: 20,
        textDecoration: "none",
      }}
    >
      ← Portal
    </a>
  );
}
