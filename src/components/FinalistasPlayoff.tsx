import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { fechaCorta } from "@/lib/playoff";
import type { Finalista, FilaFinalistas } from "@/lib/playoffFinalistas";

// Instancia "Finalistas" del Playoff: una tarjeta por division con los dos equipos que juegan la final (los
// ganadores de las semifinales), en el mismo formato que los clasificados. Lo que todavia no se definio dice
// "Por definir" y se completa solo cuando URBA carga el resultado (ver src/lib/playoffFinalistas.ts). El equipo
// de Newman va en amarillo, igual que en la tabla de clasificados.
export default function FinalistasPlayoff({ filas }: { filas: FilaFinalistas[] }) {
  const chip = (f: Finalista | null) => (
    <span
      style={{
        flex: 1,
        minWidth: 0,
        background: f ? (f.propio ? "#f5a800" : "rgba(0,0,0,.2)") : "transparent",
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
        {filas.map((f) => (
          <div
            key={f.categoriaId}
            style={{
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
              {f.fechaFinal && f.sede && (
                <span style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.8 }}>{f.sede}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {chip(f.finalistas[0])}
              <span style={{ fontSize: "0.6rem", opacity: 0.75, textTransform: "uppercase" }}>vs</span>
              {chip(f.finalistas[1])}
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 10, fontSize: "0.68rem", opacity: 0.75 }}>
        Se completa solo con los resultados de las semifinales de URBA.
      </div>
    </div>
  );
}
