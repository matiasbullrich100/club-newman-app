import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import type { ClasificadoNewman } from "@/lib/clasificadosNewman";

// "Clasificados a playoff · Top 14": una tarjeta por division con los 4 que clasifican (el de Newman en amarillo).
// Segunda pantalla de la seccion Playoff (/playoff/clasificados). Mismos colores verdes que /playoff.
export default function TablaClasificadosTop14({ filas }: { filas: ClasificadoNewman[] }) {
  return (
    <span style={{ display: "block", textAlign: "left" }}>
      <span style={{ display: "block", textAlign: "center", fontWeight: 800, color: DORADO, fontSize: "1.25rem", lineHeight: 1.2 }}>
        Clasificados a playoff · Top 14
      </span>
      <span style={{ display: "block", textAlign: "center", marginTop: 4, fontSize: "0.68rem", letterSpacing: 1, textTransform: "uppercase", color: DORADO_SUAVE }}>
        URBA · Torneo 2026 · Fase regular
      </span>
      <span style={{ display: "grid", gap: 6, marginTop: 12 }}>
        {filas.map((f) => (
          <span
            key={f.categoriaId}
            style={{ display: "block", background: "rgba(70,196,106,.62)", boxShadow: "inset 4px 0 0 #46e07a", borderRadius: 8, padding: "6px 8px 7px 12px" }}
          >
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>{f.categoria}</span>
              <span style={{ fontSize: "0.56rem", letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>Clasificados</span>
            </span>
            <span style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 4 }}>
              {f.top4.map((e) => (
                <span
                  key={e.posicion}
                  style={{
                    background: e.propio ? "#f5a800" : "rgba(0,0,0,.2)",
                    color: e.propio ? "#2a1b02" : undefined,
                    fontWeight: e.propio ? 800 : 500,
                    borderRadius: 5,
                    padding: "4px 5px",
                    fontSize: "0.72rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {e.posicion}° {e.equipo}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
      <span style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: "0.68rem", opacity: 0.75 }}>Posición según la última tabla de URBA.</span>
    </span>
  );
}
