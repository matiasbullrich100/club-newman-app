import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { fechaCorta } from "@/lib/playoff";
import type { Finalista, FilaFinalistas } from "@/lib/playoffFinalistas";

// Instancia "Finalistas" del Playoff: una tarjeta por division con los dos equipos que juegan la final (los
// ganadores de las semifinales), en el mismo formato que los clasificados. Lo que todavia no se definio dice
// "Por definir" y se completa solo cuando URBA carga el resultado (ver src/lib/playoffFinalistas.ts). El equipo
// de Newman va en amarillo, igual que en la tabla de clasificados.
export default function FinalistasPlayoff({ filas }: { filas: FilaFinalistas[] }) {
  const chip = (f: Finalista | null, campeon = false) => (
    <span
      style={{
        flex: 1,
        minWidth: 0,
        background: f ? (f.propio ? "#f5a800" : "rgba(0,0,0,.2)") : "transparent",
        ...(campeon ? { boxShadow: "0 0 0 2px #fff3c4" } : {}),
        border: f ? "none" : "1px dashed rgba(255,255,255,.4)",
        color: f?.propio ? "#2a1b02" : "inherit",
        fontWeight: f?.propio ? 800 : 500,
        fontStyle: f ? "normal" : "italic",
        opacity: f ? 1 : 0.75,
        borderRadius: 5,
        padding: "4px 5px",
        fontSize: "0.74rem",
        textAlign: "center",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {f ? f.club : "Por definir"}
    </span>
  );

  return (
    <div style={{ textAlign: "left", marginBottom: 22 }}>
      <div style={{ textAlign: "center", fontWeight: 800, color: DORADO, fontSize: "1.25rem", lineHeight: 1.2 }}>Finalistas · Top 14</div>
      <div style={{ textAlign: "center", marginTop: 4, fontSize: "0.68rem", letterSpacing: 1, textTransform: "uppercase", color: DORADO_SUAVE }}>
        URBA · Torneo 2026 · Final
      </div>
      <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
        {filas.map((f) => {
          // Si el campeon de la final es Newman, el cartel CAMPEON va a la derecha, afuera del recuadro verde.
          const campeonNewman = f.resultado ? f.finalistas[f.resultado.campeon]?.propio === true : false;
          return (
          <div key={f.categoriaId} style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "grid",
              gridTemplateColumns: "74px 1fr",
              gap: 8,
              background: "rgba(70,196,106,.62)",
              boxShadow: "inset 4px 0 0 #46e07a",
              borderRadius: 8,
              padding: "7px 8px 7px 12px",
            }}
          >
            <div style={{ display: "grid", alignContent: "center", gap: 1 }}>
              <span style={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.1 }}>{f.categoria}</span>
              {f.fechaFinal && (
                <span style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.95, lineHeight: 1.2 }}>
                  {fechaCorta(f.fechaFinal)}
                </span>
              )}
              {f.fechaFinal && f.horaFinal && (
                <span style={{ fontSize: "0.64rem", letterSpacing: 0.3, opacity: 0.95 }}>{f.horaFinal} hs</span>
              )}
              {f.fechaFinal && f.sede && (
                <span style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.8 }}>{f.cancha ? `${f.sede} ${f.cancha}` : f.sede}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {chip(f.finalistas[0], f.resultado?.campeon === 0)}
              {f.resultado ? (
                <span style={{ fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap" }}>
                  {f.resultado.goles[0]} - {f.resultado.goles[1]}
                </span>
              ) : (
                <span style={{ fontSize: "0.6rem", opacity: 0.75, textTransform: "uppercase" }}>vs</span>
              )}
              {chip(f.finalistas[1], f.resultado?.campeon === 1)}
            </div>
          </div>
          {campeonNewman && (
            <div
              style={{
                flex: "0 0 auto",
                display: "grid",
                alignContent: "center",
                justifyItems: "center",
                gap: 1,
                padding: "0 7px",
                borderRadius: 8,
                background: "#f5a800",
                color: "#2a1b02",
                boxShadow: "0 0 10px rgba(245,168,0,.55)",
                fontWeight: 900,
                fontSize: "0.62rem",
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              <span aria-hidden style={{ fontSize: "1.05rem", lineHeight: 1 }}>🏆</span>
              Campeón
            </div>
          )}
          </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 10, fontSize: "0.68rem", opacity: 0.75 }}>
        Se completa solo con los resultados de las semifinales de URBA.
      </div>
    </div>
  );
}
