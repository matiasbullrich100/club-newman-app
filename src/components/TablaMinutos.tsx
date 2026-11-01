"use client";

import { useState } from "react";
import { BORDO_OSC, DORADO, DORADO_SUAVE, CREMA } from "@/lib/colors";

export interface JugadorMinutosRow {
  id: string;
  nombre: string;
  minutos: number;
  apellido: string; // para ordenar (splitNombre en el servidor)
  nombrePila: string;
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.65rem",
  color: DORADO,
  padding: "4px 6px",
  borderBottom: "1px solid rgba(226,197,120,.3)",
  // Fijo arriba al scrollear (ver TablaTarjetas.tsx): con fondo opaco para que las filas no se transparenten.
  position: "sticky",
  top: 0,
  background: BORDO_OSC,
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 6px",
  fontSize: "0.82rem",
  borderBottom: "1px solid rgba(255,255,255,.06)",
};

type Orden = "minutos" | "apellido";

const porApellido = (a: JugadorMinutosRow, b: JugadorMinutosRow) =>
  a.apellido.localeCompare(b.apellido) || a.nombrePila.localeCompare(b.nombrePila);

// "Minutos jugados" con el orden a eleccion de quien mira: de mas a menos minutos (el que se abre primero) o por
// apellido. Cada manager / coach lo mira como quiere; el orden no se guarda, vuelve a "Minutos" al recargar.
export default function TablaMinutos({ jugadores }: { jugadores: JugadorMinutosRow[] }) {
  const [orden, setOrden] = useState<Orden>("minutos");
  const filas = [...jugadores].sort(orden === "minutos" ? (a, b) => b.minutos - a.minutos || porApellido(a, b) : porApellido);

  const pastilla = (valor: Orden, texto: string) => (
    <button
      type="button"
      onClick={() => setOrden(valor)}
      aria-pressed={orden === valor}
      style={{
        flex: 1,
        fontSize: "0.75rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        padding: "8px 6px",
        borderRadius: 8,
        border: `1px solid ${orden === valor ? DORADO : "rgba(226,197,120,.3)"}`,
        background: orden === valor ? DORADO : "transparent",
        color: orden === valor ? BORDO_OSC : DORADO_SUAVE,
      }}
    >
      {texto}
    </button>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {pastilla("minutos", "Más minutos")}
        {pastilla("apellido", "Por apellido")}
      </div>
      {/* maxHeight + overflowY propios -- ver el comentario en TablaTarjetas.tsx sobre por que position:sticky
          necesita que este div sea el que scrollea de verdad. */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Jugador</th>
              <th style={thStyle}>Minutos</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((j) => (
              <tr key={j.id}>
                <td style={{ ...tdStyle, color: DORADO_SUAVE }}>{j.nombre}</td>
                <td style={{ ...tdStyle, color: CREMA }}>{j.minutos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
