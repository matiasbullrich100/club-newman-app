import Link from "next/link";
import type { Equipo, EstadoPartido, Resultado } from "@/types/firestore";

const BORDO = "#651d32";
const NEGRO_JUGADA = "#1c1315";
const DORADO = "#f2a900";
const DORADO_SUAVE = "#f0cb86";
const CREMA = "#f7f1e4";

function nombreEquipo(nombre: string) {
  const chico = nombre.length > 12;
  return <span style={{ fontSize: chico ? "0.78em" : "1em" }}>{nombre}</span>;
}

function golesDe(equipo: Equipo, resultado: Resultado) {
  const goles = equipo === "newman" ? resultado.newman : resultado.rival;
  const bonus = equipo === "newman" ? resultado.bonusNewman : resultado.bonusRival;
  return (
    <>
      {goles}
      {bonus && <span style={{ color: DORADO, fontSize: "0.75em" }}> (B)</span>}
    </>
  );
}

export default function FixtureRow({
  href,
  label,
  esLocal,
  rival,
  estado,
  resultado,
  notaEspecial,
}: {
  href: string;
  label: string;
  esLocal: boolean;
  rival: string;
  estado: EstadoPartido;
  resultado: Resultado;
  notaEspecial?: string;
}) {
  const jugado = estado === "terminado";
  const local = esLocal ? "Newman" : rival;
  const visitante = esLocal ? rival : "Newman";
  const equipoLocal: Equipo = esLocal ? "newman" : "rival";
  const equipoVisitante: Equipo = esLocal ? "rival" : "newman";

  return (
    <Link
      href={href}
      style={{
        display: "block",
        textDecoration: "none",
        background: jugado ? NEGRO_JUGADA : BORDO,
        color: CREMA,
        borderRadius: 8,
        padding: "0.6rem 0.9rem",
        marginBottom: "0.4rem",
      }}
    >
      <div style={{ fontSize: "0.75rem", color: DORADO_SUAVE, textTransform: "uppercase", marginBottom: 2 }}>
        {label}
      </div>
      {notaEspecial ? (
        <div style={{ fontStyle: "italic", color: DORADO_SUAVE, fontSize: "0.9rem" }}>{notaEspecial}</div>
      ) : jugado ? (
        <div style={{ fontSize: "0.95rem" }}>
          {nombreEquipo(local)} <strong>{golesDe(equipoLocal, resultado)}</strong> -{" "}
          <strong>{golesDe(equipoVisitante, resultado)}</strong> {nombreEquipo(visitante)}
        </div>
      ) : (
        <div style={{ fontSize: "0.95rem" }}>
          {nombreEquipo(local)} <em style={{ fontSize: "0.8em", color: DORADO_SUAVE }}>vs</em>{" "}
          {nombreEquipo(visitante)}
        </div>
      )}
    </Link>
  );
}
