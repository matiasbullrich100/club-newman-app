import type { Incidente, Partido } from "@/types/firestore";
import { describirIncidente } from "@/lib/incidentes";
import Formaciones from "./Formaciones";

const DORADO = "#f2a900";
const DORADO_SUAVE = "#f0cb86";
const CREMA = "#f7f1e4";

interface RosterJugadorHistorico {
  jugadorId: string;
  nombre: string;
  dorsal: string;
  titular: boolean;
  capitan?: boolean;
  debut?: boolean;
}

function nombreEquipo(nombre: string) {
  const chico = nombre.length > 12;
  return <span style={{ fontSize: chico ? "0.78em" : "1em" }}>{nombre}</span>;
}

function ResultadoFinal({ partido }: { partido: Partido }) {
  const local = partido.esLocal ? "Newman" : partido.rival;
  const visitante = partido.esLocal ? partido.rival : "Newman";
  const golLocal = partido.esLocal ? partido.resultado.newman : partido.resultado.rival;
  const golVisitante = partido.esLocal ? partido.resultado.rival : partido.resultado.newman;
  const bonusLocal = partido.esLocal ? partido.resultado.bonusNewman : partido.resultado.bonusRival;
  const bonusVisitante = partido.esLocal ? partido.resultado.bonusRival : partido.resultado.bonusNewman;

  return (
    <p style={{ fontSize: "1.1rem", color: CREMA, textAlign: "center" }}>
      {nombreEquipo(local)}{" "}
      <strong>
        {golLocal}
        {bonusLocal && <span style={{ color: DORADO, fontSize: "0.75em" }}> (B)</span>}
      </strong>{" "}
      -{" "}
      <strong>
        {golVisitante}
        {bonusVisitante && <span style={{ color: DORADO, fontSize: "0.75em" }}> (B)</span>}
      </strong>{" "}
      {nombreEquipo(visitante)}
    </p>
  );
}

const ICONOS: Partial<Record<Incidente["tipo"], string>> = {
  tarjeta_amarilla: "🟨",
  tarjeta_roja: "🟥",
  tarjeta_azul: "🟦",
  try: "🏉",
  try_penal: "🏉",
};

function Incidencias({ incidentes }: { incidentes: (Incidente & { id: string })[] }) {
  if (incidentes.length === 0) {
    return <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Sin incidencias todavía.</p>;
  }
  return (
    <div>
      {incidentes.map((inc) => (
        <div
          key={inc.id}
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
          <div style={{ color: DORADO_SUAVE }}>{describirIncidente(inc)}</div>
        </div>
      ))}
    </div>
  );
}

export default function PartidoHistorico({
  partido,
  plantel,
  incidentes,
}: {
  partido: Partido;
  plantel: RosterJugadorHistorico[];
  incidentes: (Incidente & { id: string })[];
}) {
  return (
    <div>
      {partido.notaEspecial ? (
        <p style={{ fontStyle: "italic", color: DORADO_SUAVE, textAlign: "center", fontSize: "1rem" }}>
          {partido.notaEspecial}
        </p>
      ) : partido.estado === "terminado" ? (
        <ResultadoFinal partido={partido} />
      ) : (
        <p style={{ opacity: 0.6, fontStyle: "italic", textAlign: "center" }}>Partido sin cargar</p>
      )}

      {plantel.length > 0 ? (
        <Formaciones plantel={plantel} />
      ) : (
        <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", marginTop: "1rem" }}>
          Aún sin formación cargada.
        </p>
      )}

      {partido.estado === "terminado" && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "0.9rem" }}>Incidencias</h3>
          <Incidencias incidentes={incidentes} />
        </div>
      )}
    </div>
  );
}
