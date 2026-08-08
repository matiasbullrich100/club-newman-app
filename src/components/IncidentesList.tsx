import type { Incidente } from "@/types/firestore";
import { describirIncidente, ordenarIncidentes } from "@/lib/incidentes";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const ICONOS: Partial<Record<Incidente["tipo"], string>> = {
  tarjeta_amarilla: "🟨",
  tarjeta_doble_amarilla: "🟨🟨",
  tarjeta_roja: "🟥",
  tarjeta_azul: "🟦",
  try: "🏉",
  try_scrum: "🏉",
  try_penal: "🏉",
};

const SIN_EQUIPO: Incidente["tipo"][] = ["fin_1t", "fin_2t"];

export default function IncidentesList({
  incidentes,
  rivalNombre,
}: {
  incidentes: (Incidente & { id: string })[];
  rivalNombre?: string;
}) {
  if (incidentes.length === 0) {
    return <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Sin incidencias todavía.</p>;
  }

  // Lo mas reciente arriba del todo.
  const ordenadas = ordenarIncidentes(incidentes).reverse();

  return (
    <div>
      {ordenadas.map((inc, i) => {
        const cambioDePeriodo = i > 0 && ordenadas[i - 1].periodo !== inc.periodo;
        const esFinDeTiempo = SIN_EQUIPO.includes(inc.tipo);
        return (
          <div key={inc.id}>
            {cambioDePeriodo && (
              <div
                style={{
                  borderTop: "3px dashed rgba(242,169,0,.5)",
                  margin: "6px 0",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "8px 4px",
                fontSize: "0.85rem",
                borderBottom: "1px dashed rgba(255,255,255,.08)",
              }}
            >
              <div style={{ color: DORADO, minWidth: 34, fontSize: "0.8rem" }}>
                {inc.periodo} {inc.minuto}&apos;
              </div>
              <div style={{ minWidth: 20, textAlign: "center" }}>{ICONOS[inc.tipo] ?? ""}</div>
              <div style={{ color: DORADO_SUAVE, textTransform: esFinDeTiempo ? "uppercase" : "none", fontWeight: esFinDeTiempo ? 700 : 400 }}>
                {describirIncidente(inc, rivalNombre)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
