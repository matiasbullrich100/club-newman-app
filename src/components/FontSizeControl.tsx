"use client";

import { useState } from "react";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Escala el tamano de fuente de TODA la app -- casi todo el texto ya usa "rem" (relativo al
// font-size del <html>), asi que un solo cambio ahi alcanza sin tocar cada componente.
const NIVELES = [100, 115, 130, 145];
const CLAVE_STORAGE = "tamanoFuente";

const botonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "rgba(53,9,22,.92)",
  border: `1px solid ${DORADO}`,
  color: DORADO_SUAVE,
  fontWeight: 700,
  cursor: "pointer",
};

// El script inline en layout.tsx ya aplico el tamano guardado antes de la hidratacion (evita el
// flash de tamano por defecto) -- este lazy initializer solo sincroniza el estado de React con lo
// que ya esta puesto en <html>. En el server siempre da 0 (sin localStorage); si el usuario tiene
// un tamano guardado distinto, los botones "A-"/"A+" pueden arrancar con el estado disabled
// incorrecto por un instante hasta que React hidrate con el valor real -- por eso llevan
// suppressHydrationMismatch.
function leerNivelGuardado(): number {
  if (typeof window === "undefined") return 0;
  const guardado = Number(localStorage.getItem(CLAVE_STORAGE));
  const idx = NIVELES.indexOf(guardado);
  return idx >= 0 ? idx : 0;
}

export default function FontSizeControl() {
  const [nivel, setNivel] = useState(leerNivelGuardado);

  function cambiar(delta: number) {
    const nuevo = Math.min(NIVELES.length - 1, Math.max(0, nivel + delta));
    if (nuevo === nivel) return;
    setNivel(nuevo);
    document.documentElement.style.fontSize = `${NIVELES[nuevo]}%`;
    localStorage.setItem(CLAVE_STORAGE, String(NIVELES[nuevo]));
  }

  return (
    <div style={{ position: "fixed", bottom: 14, right: 14, zIndex: 100, display: "flex", gap: 6 }}>
      <button
        type="button"
        aria-label="Achicar letra"
        onClick={() => cambiar(-1)}
        disabled={nivel === 0}
        style={{ ...botonStyle, opacity: nivel === 0 ? 0.4 : 1, fontSize: "0.75rem" }}
      >
        A-
      </button>
      <button
        type="button"
        aria-label="Agrandar letra"
        onClick={() => cambiar(1)}
        disabled={nivel === NIVELES.length - 1}
        style={{ ...botonStyle, opacity: nivel === NIVELES.length - 1 ? 0.4 : 1, fontSize: "0.95rem" }}
      >
        A+
      </button>
    </div>
  );
}
