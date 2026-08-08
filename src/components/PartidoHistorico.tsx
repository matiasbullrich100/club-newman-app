import type { Incidente, Partido } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { MatchupText } from "./FixtureRow";
import Formaciones from "./Formaciones";
import IncidentesList from "./IncidentesList";

interface RosterJugadorHistorico {
  jugadorId: string;
  nombre: string;
  dorsal: string;
  titular: boolean;
  capitan?: boolean;
  debut?: boolean;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.045)",
  border: "1px solid rgba(226,197,120,.2)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 14,
};

const cardTituloStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: "0.85rem",
  color: DORADO,
  marginBottom: 10,
};

export default function PartidoHistorico({
  partido,
  plantel,
  incidentes,
}: {
  partido: Partido;
  plantel: RosterJugadorHistorico[];
  incidentes: (Incidente & { id: string })[];
}) {
  const jugado = partido.estado === "terminado";

  return (
    <div>
      <div style={cardStyle}>
        {partido.notaEspecial ? (
          <p style={{ fontStyle: "italic", color: DORADO_SUAVE, textAlign: "center", fontSize: "1rem" }}>
            {partido.notaEspecial}
          </p>
        ) : jugado ? (
          <p style={{ fontSize: "1.1rem", textAlign: "center" }}>
            <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado resultado={partido.resultado} />
          </p>
        ) : (
          <p style={{ opacity: 0.6, fontStyle: "italic", textAlign: "center" }}>Partido sin cargar</p>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>Formaciones</h3>
        {plantel.length > 0 ? (
          <Formaciones plantel={plantel} />
        ) : (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Aún sin formación cargada.</p>
        )}
      </div>

      {jugado && (
        <div style={cardStyle}>
          <h3 style={cardTituloStyle}>Incidencias</h3>
          <IncidentesList incidentes={incidentes} rivalNombre={partido.rival} />
        </div>
      )}
    </div>
  );
}
