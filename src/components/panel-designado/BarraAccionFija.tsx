"use client";

import { DORADO } from "@/lib/colors";

// Fija abajo del todo, mismo patron que PublicarFormacionButton.tsx (bottom con
// safe-area-inset-bottom porque la barra inferior de Safari en iOS puede tapar contenido fijo
// anclado abajo). Envuelve los botones de confirmar/publicar de una jugada/cambio -- sin esto, al
// elegir el ultimo paso (ej. el jugador de un try) la lista larga de opciones se achica de golpe a
// una sola linea de confirmacion, y el boton de Publicar quedaba scrolleado arriba, fuera de vista
// (bug real reportado en celular -- en la compu, con menos scroll, no se notaba).
export default function BarraAccionFija({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 95,
        bottom: "max(12px, env(safe-area-inset-bottom))",
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(53,9,22,.92)",
          border: `2px solid ${DORADO}`,
          borderRadius: 20,
          padding: "10px 16px",
          maxWidth: 480,
        }}
      >
        {children}
      </div>
    </div>
  );
}
