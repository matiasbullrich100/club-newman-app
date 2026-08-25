"use client";

import { Fragment, useState } from "react";
import { BORDO_OSC, DORADO, DORADO_SUAVE, CREMA } from "@/lib/colors";
import { etiquetaFecha, type FechaTarjeta } from "@/lib/tarjetasFormato";

export interface JugadorTarjetasRow {
  id: string;
  nombre: string;
  amarillas: number;
  dobleAmarilla: number;
  rojas: number;
  rojas20: number;
  azules: number;
  fechaSuspension: number;
  saldo: number;
  fechasAmarillas: FechaTarjeta[];
  fechasDobleAmarilla: FechaTarjeta[];
  fechasRojas: FechaTarjeta[];
  fechasRojas20: FechaTarjeta[];
  fechasAzules: FechaTarjeta[];
  fechasDisparadoras: FechaTarjeta[];
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.65rem",
  color: DORADO,
  padding: "4px 6px",
  borderBottom: "1px solid rgba(226,197,120,.3)",
  // Fijo arriba al scrollear -- con la lista larga, al llegar a los ultimos jugadores se pierde
  // de vista que columna es cada una. Necesita un fondo opaco (no el semitransparente de la
  // tarjeta) para que las filas no se transparenten atras.
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

// Cada tipo de tarjeta con al menos una fecha se muestra como una seccion propia dentro del
// panel de detalle -- la misma info que antes vivia en el atributo `title` de cada celda.
const SECCIONES: { key: keyof JugadorTarjetasRow; icono: string; label: string }[] = [
  { key: "fechasAmarillas", icono: "🟨", label: "Amarilla" },
  { key: "fechasDobleAmarilla", icono: "🟨🟨", label: "Doble amarilla" },
  { key: "fechasRojas", icono: "🟥", label: "Roja" },
  { key: "fechasRojas20", icono: "🟥20", label: "Roja de 20" },
  { key: "fechasAzules", icono: "🟦", label: "Azul" },
];

function PanelDetalle({ jugador }: { jugador: JugadorTarjetasRow }) {
  const secciones = SECCIONES.map((s) => ({ ...s, fechas: jugador[s.key] as FechaTarjeta[] })).filter(
    (s) => s.fechas.length > 0
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.8rem", padding: "4px 6px 10px 26px" }}>
      {secciones.map((s) => (
        <div key={s.label}>
          <div style={{ color: DORADO, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
            {s.icono} {s.label}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: CREMA }}>
            {s.fechas.map((f, i) => (
              <li key={i}>{etiquetaFecha(f)}</li>
            ))}
          </ul>
        </div>
      ))}
      {jugador.fechaSuspension > 0 && (
        <div>
          <div style={{ color: DORADO, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
            Fecha(s) de suspensión disparada en
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: CREMA }}>
            {jugador.fechasDisparadoras.map((f, i) => (
              <li key={i}>{etiquetaFecha(f)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TablaTarjetas({ jugadores }: { jugadores: JugadorTarjetasRow[] }) {
  // Un solo mecanismo tap/click -- no hover -- para que funcione igual en mouse y en tactil.
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  return (
    // maxHeight + overflowY propios (no solo overflowX) -- position:sticky necesita que ESTE div
    // sea el que scrollea de verdad. Con overflowX:auto solo (sin alto acotado), el navegador ya
    // lo trata como contenedor de scroll para el eje Y tambien (mismo comportamiento raro que con
    // overflow-x a secas), pero como el div nunca scrollea internamente (crece con el contenido),
    // "top: 0" nunca engancha con nada -- el header se va con el resto de la pagina.
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Jugador</th>
            <th style={thStyle}>🟨</th>
            <th style={thStyle}>🟨🟨</th>
            <th style={thStyle}>🟥</th>
            <th style={thStyle}>🟥20</th>
            <th style={thStyle}>🟦</th>
            <th style={thStyle}>Fecha Susp.</th>
            <th style={thStyle}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {jugadores.map((j) => {
            const expandido = expandidoId === j.id;
            return (
              <Fragment key={j.id}>
                <tr>
                  <td style={{ ...tdStyle, padding: 0 }}>
                    <button
                      type="button"
                      onClick={() => setExpandidoId(expandido ? null : j.id)}
                      aria-expanded={expandido}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        padding: "6px 6px",
                        font: "inherit",
                        fontSize: "0.82rem",
                        color: DORADO_SUAVE,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: DORADO,
                          display: "inline-block",
                          transform: expandido ? "rotate(90deg)" : "none",
                          transition: "transform .15s",
                        }}
                      >
                        ▸
                      </span>
                      {j.nombre}
                    </button>
                  </td>
                  <td style={tdStyle}>{j.amarillas}</td>
                  <td style={tdStyle}>{j.dobleAmarilla}</td>
                  <td style={tdStyle}>{j.rojas}</td>
                  <td style={tdStyle}>{j.rojas20}</td>
                  <td style={tdStyle}>{j.azules}</td>
                  <td style={tdStyle}>{j.fechaSuspension}</td>
                  <td style={tdStyle}>{j.saldo}</td>
                </tr>
                {expandido && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)" }}>
                      <PanelDetalle jugador={j} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
