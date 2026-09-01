"use client";

import { useState } from "react";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Escala el tamano de fuente de TODA la app -- casi todo el texto ya usa "rem" (relativo al
// font-size del <html>), asi que un solo cambio ahi alcanza sin tocar cada componente.
// 100 es el tamano por defecto; 85 es para quien lo quiere MAS chico, el resto agranda.
const NIVELES = [85, 100, 115, 130, 145];
const NIVEL_DEFAULT = NIVELES.indexOf(100);
const CLAVE_STORAGE = "tamanoFuente";

const botonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
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
  if (typeof window === "undefined") return NIVEL_DEFAULT;
  const guardado = Number(localStorage.getItem(CLAVE_STORAGE));
  const idx = NIVELES.indexOf(guardado);
  return idx >= 0 ? idx : NIVEL_DEFAULT;
}

export default function FontSizeControl() {
  const [nivel, setNivel] = useState(leerNivelGuardado);

  function aplicar(nuevo: number) {
    if (nuevo === nivel) return;
    setNivel(nuevo);
    document.documentElement.style.fontSize = `${NIVELES[nuevo]}%`;
    localStorage.setItem(CLAVE_STORAGE, String(NIVELES[nuevo]));
  }

  function cambiar(delta: number) {
    aplicar(Math.min(NIVELES.length - 1, Math.max(0, nivel + delta)));
  }

  const esDefault = nivel === NIVEL_DEFAULT;

  return (
    <div style={{ position: "fixed", bottom: 16, right: 14, zIndex: 100, display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        aria-label="Achicar letra"
        onClick={() => cambiar(-1)}
        disabled={nivel === 0}
        style={{ ...botonStyle, opacity: nivel === 0 ? 0.4 : 1, fontSize: "0.75rem" }}
      >
        A-
      </button>
      {/* Muestra el tamano actual y, si no esta en el normal, sirve para volver a 100 de un toque
          (asi nadie queda "trabado" arriba sin darse cuenta de por que A+ esta gris). */}
      <button
        type="button"
        aria-label={esDefault ? "Tamaño de letra normal" : "Volver al tamaño de letra normal"}
        onClick={() => aplicar(NIVEL_DEFAULT)}
        disabled={esDefault}
        style={{
          height: 38,
          minWidth: 44,
          padding: "0 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 19,
          background: "rgba(53,9,22,.92)",
          border: `1px solid ${DORADO}`,
          color: DORADO_SUAVE,
          fontWeight: 700,
          fontSize: "0.72rem",
          cursor: esDefault ? "default" : "pointer",
          opacity: esDefault ? 0.6 : 1,
        }}
      >
        {NIVELES[nivel]}%
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
