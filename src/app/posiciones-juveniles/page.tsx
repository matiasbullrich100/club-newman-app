import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { posicionesFinalesJuveniles } from "@/lib/posicionesFinalesJuveniles";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { FuenteUrba } from "@/components/PieNota";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Mas nueva a mas vieja, igual que la grilla de equipos de /juveniles (M19 primero).
const ORDEN_EDAD = ["m19", "m17", "m16", "m15"];

// Posicion de cada equipo juvenil de Newman al cierre de la 2da fase (la tabla de URBA de cada zona). El 1° con el
// titulo asegurado lleva CAMPEON a la derecha. Cada fila lleva a la tabla de posiciones completa de la division.
export default async function PosicionesJuvenilesPage() {
  const session = await getSession();
  const filas = await posicionesFinalesJuveniles();
  const provisoria = filas.some((f) => f.provisoria);
  const porEdad = ORDEN_EDAD.map((id) => ({ id, equipos: filas.filter((f) => f.edadId === id) })).filter((g) => g.equipos.length > 0);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/juveniles" />
      <SessionBar session={session} />
      <Header rightLabel="Juveniles" logo="urba" rightLabelShift={14} />

      <div style={{ marginTop: 14, textAlign: "center", fontWeight: 800, color: DORADO, fontSize: "1.25rem", lineHeight: 1.2 }}>Posiciones · 2ª fase</div>
      <div style={{ textAlign: "center", marginTop: 4, fontSize: "0.68rem", letterSpacing: 1, textTransform: "uppercase", color: DORADO_SUAVE }}>
        URBA · Juveniles 2026
      </div>

      {filas.length === 0 ? (
        <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center", marginTop: 14 }}>Todavía no hay tablas cargadas.</p>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {porEdad.map((g) => (
            <div key={g.id} style={{ display: "grid", gap: 6 }}>
              {g.equipos.map((f) => (
                <Link
                  key={f.categoriaId}
                  href={`/posiciones/${f.categoriaId}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 1fr auto",
                    alignItems: "center",
                    gap: 8,
                    background: f.campeon ? "rgba(245,168,0,.9)" : "rgba(255,255,255,.05)",
                    color: f.campeon ? "#2a1b02" : "inherit",
                    border: f.campeon ? "1px solid #f5c428" : "1px solid rgba(226,197,120,.25)",
                    borderRadius: 8,
                    padding: "9px 10px",
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: "0.98rem" }}>{f.categoria}</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: f.posicion <= 3 ? 800 : 500 }}>
                    {f.posicion}° <span style={{ fontWeight: 400, opacity: 0.75, fontSize: "0.72rem" }}>de {f.equipos} · {f.puntos} pts</span>
                  </span>
                  {f.campeon ? (
                    <span style={{ fontWeight: 900, letterSpacing: 1, fontSize: "0.82rem", textTransform: "uppercase" }}>🏆 Campeón</span>
                  ) : f.posicion === 1 ? (
                    <span style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: 0.4, color: DORADO_SUAVE }}>A confirmar</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {provisoria && (
        <p style={{ textAlign: "center", opacity: 0.65, fontSize: "0.72rem", marginTop: 12 }}>
          Quedan partidos por jugar en alguna zona: las posiciones pueden cambiar.
        </p>
      )}
      <FuenteUrba />
    </main>
  );
}
