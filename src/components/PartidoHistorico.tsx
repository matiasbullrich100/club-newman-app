import Link from "next/link";
import type { Incidente, Partido } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";
import { formatFechaCorta } from "@/lib/fecha";
import { nombreNewmanDe } from "@/lib/categorias";
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
  partidoId,
  puedeEditar,
  posicionesHref,
  posicionesActualizado,
  formacionPendientePublicar,
}: {
  partido: Partido;
  plantel: RosterJugadorHistorico[];
  incidentes: (Incidente & { id: string })[];
  partidoId?: string;
  puedeEditar?: boolean;
  // Boton "Tabla de posiciones al [fecha]" -- la fecha es de la ULTIMA ACTUALIZACION de la tabla
  // cacheada (ver /posiciones/[categoriaId]), no la fecha de este partido puntual, para dejar
  // claro que no es "la tabla como estaba ese dia".
  posicionesHref?: string;
  posicionesActualizado?: Date | null;
  // true cuando `plantel` viene vacio A PROPOSITO porque hay una formacion cargada pero todavia
  // sin publicar (ver formacionPublicada en types/firestore.ts) y quien mira esta pagina no
  // puede operar esta categoria -- distingue ese caso de "todavia no se cargo nada".
  formacionPendientePublicar?: boolean;
}) {
  const jugado = partido.estado === "terminado";
  const nombreNewman = nombreNewmanDe(partido.categoriaId);

  return (
    <div>
      {posicionesHref && (
        <p style={{ textAlign: "center", margin: "0 0 10px" }}>
          <Link
            href={posicionesHref}
            style={{
              display: "inline-block",
              textTransform: "uppercase",
              letterSpacing: 1,
              fontSize: "0.78rem",
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid rgba(226,197,120,.4)",
              color: DORADO_SUAVE,
            }}
          >
            Tabla de posiciones
            {posicionesActualizado &&
              ` al ${posicionesActualizado.toLocaleDateString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
                day: "2-digit",
                month: "2-digit",
              })}`}
          </Link>
        </p>
      )}
      <div style={cardStyle}>
        {partido.fecha && (
          <p style={{ textAlign: "center", margin: "0 0 4px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 0.5, color: DORADO_SUAVE }}>
            Fecha #{partido.numeroFecha} · {formatFechaCorta(partido.fecha)}
          </p>
        )}
        {partido.amistoso && (
          <p style={{ textAlign: "center", margin: "0 0 6px", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 1, color: DORADO }}>
            Amistoso
          </p>
        )}
        {partido.notaEspecial ? (
          <p style={{ fontStyle: "italic", color: DORADO_SUAVE, textAlign: "center", fontSize: "1rem" }}>
            {partido.notaEspecial}
          </p>
        ) : jugado ? (
          <p style={{ fontSize: "1.1rem", textAlign: "center" }}>
            <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado resultado={partido.resultado} nombreNewman={nombreNewman} />
          </p>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.05rem", margin: 0 }}>
              <MatchupText esLocal={partido.esLocal} rival={partido.rival} jugado={false} resultado={partido.resultado} nombreNewman={nombreNewman} />
            </p>
            {(partido.hora || partido.cancha) && (
              <p style={{ opacity: 0.7, fontSize: "0.82rem", marginTop: 6 }}>
                {partido.hora && `${partido.hora} hs`}
                {partido.cancha && ` en ${partido.cancha}`}
                {partido.numeroCancha && ` · Cancha ${partido.numeroCancha}`}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTituloStyle}>Formaciones</h3>
        {plantel.length > 0 ? (
          <Formaciones plantel={plantel} />
        ) : formacionPendientePublicar ? (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>
            La formación todavía no fue publicada por el club.
          </p>
        ) : (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem" }}>Aún sin formación cargada.</p>
        )}
      </div>

      {jugado && (
        <div style={cardStyle}>
          <h3 style={cardTituloStyle}>Incidencias</h3>
          <IncidentesList
            incidentes={incidentes}
            rivalNombre={partido.rival}
            partidoId={partidoId}
            puedeEditar={puedeEditar}
            nombreNewman={nombreNewman}
            plantel={plantel}
          />
        </div>
      )}
    </div>
  );
}
