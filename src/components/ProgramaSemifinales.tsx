import ProximaFechaRow from "./ProximaFechaRow";
import Formaciones from "./Formaciones";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import type { SemifinalProgramada } from "@/lib/match/semifinales";

const SEDES: Record<string, string> = { Hindu: "Hindú" };

// "Viernes 23/10" a partir de un ISO yyyy-mm-dd (sin depender de la zona horaria del servidor).
function diaLargo(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", { weekday: "long", timeZone: "UTC" });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d}/${m}`;
}

// Programa de semifinales en orden cronologico: un bloque por DIA Y SEDE ("Viernes 23/10 · en Hindú", "Viernes
// 23/10 · en CUBA", "Sábado 24/10 · en CUBA") y adentro cada partido por hora, con los mismos botones de siempre
// (Tabla / Cruces / Fixt. Newm.) para ver como nos fue contra esos equipos. Lo muestran /superior y /playoff.
export default function ProgramaSemifinales({ semis }: { semis: SemifinalProgramada[] }) {
  if (semis.length === 0) return null;

  const grupos = new Map<string, SemifinalProgramada[]>();
  for (const s of semis) {
    const clave = `${s.proxima.fecha}|${s.proxima.cancha ?? ""}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), s]);
  }
  const porHora = (a: SemifinalProgramada, b: SemifinalProgramada) => (a.proxima.hora ?? "99:99").localeCompare(b.proxima.hora ?? "99:99");
  const ordenados = [...grupos.values()]
    .map((g) => g.sort(porHora))
    // Dia, despues hora del primer partido; a igual hora el bloque con menos partidos va primero.
    .sort((a, b) => (a[0].proxima.fecha ?? "").localeCompare(b[0].proxima.fecha ?? "") || porHora(a[0], b[0]) || a.length - b.length);

  return (
    <section style={{ margin: "0 0 14px" }}>
      <h2 style={{ fontSize: "1rem", color: DORADO, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>Semifinales</h2>
      {ordenados.map((g) => {
        const sede = g[0].proxima.cancha ?? "";
        return (
          <div key={`${g[0].proxima.fecha}|${sede}`} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 5px" }}>
              {diaLargo(g[0].proxima.fecha!)}
              {sede && ` · en ${SEDES[sede] ?? sede}`}
            </div>
            {g.map((s) => (
              <div key={s.partidoId}>
              <ProximaFechaRow
                partidoId={s.partidoId}
                categoriaNombre={s.categoriaNombre}
                proxima={s.proxima}
                sinSede
                crucesHref={tieneFixtureDivision(s.categoriaId) ? `/fixture/${s.categoriaId}/cruces` : undefined}
                posicionesHref={TORNEOS_URBA[s.categoriaId] !== undefined ? `/posiciones/${s.categoriaId}` : undefined}
                fixtureHref={`/categoria/${s.categoriaId}/fixture`}
              />
              {s.formacion && (
                <div style={{ margin: "-2px 0 10px", padding: "8px 12px 10px", border: "1px solid rgba(226,197,120,.35)", borderRadius: 10, background: "rgba(0,0,0,.18)" }}>
                  <div style={{ textAlign: "center", fontSize: "0.78rem", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: DORADO }}>
                    Cancha {SEDES[s.proxima.cancha ?? ""] ?? s.proxima.cancha}
                    {s.proxima.numeroCancha && ` · ${s.proxima.numeroCancha}`}
                    {s.proxima.hora && ` · ${s.proxima.hora} hs`}
                  </div>
                  <Formaciones plantel={s.formacion} />
                </div>
              )}
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
