import Link from "next/link";
import type { Equipo, Resultado } from "@/types/firestore";
import { DORADO, DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";

function nombreEquipo(nombre: string) {
  const chico = nombre.length > 12;
  return <span style={{ fontSize: chico ? "0.78em" : "1em", letterSpacing: chico ? 0 : undefined }}>{nombre}</span>;
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

/**
 * "Newman 31 (B) - 3 BACRC" (jugado) o "Newman vs BACRC" (sin jugar) — reusado en filas y títulos.
 * nombreNewman: "Newman" salvo en Juveniles, donde se aclara el equipo (ej. "Newman A").
 */
export function MatchupText({
  esLocal,
  rival,
  jugado,
  resultado,
  nombreNewman = "Newman",
}: {
  esLocal: boolean;
  rival: string;
  jugado: boolean;
  resultado: Resultado;
  nombreNewman?: string;
}) {
  const local = esLocal ? nombreNewman : rival;
  const visitante = esLocal ? rival : nombreNewman;
  const equipoLocal: Equipo = esLocal ? "newman" : "rival";
  const equipoVisitante: Equipo = esLocal ? "rival" : "newman";

  if (jugado) {
    return (
      <>
        {nombreEquipo(local)} <b style={{ margin: "0 6px" }}>{golesDe(equipoLocal, resultado)}</b> -{" "}
        <b style={{ margin: "0 6px" }}>{golesDe(equipoVisitante, resultado)}</b>{" "}
        {nombreEquipo(visitante)}
      </>
    );
  }
  return (
    <>
      {nombreEquipo(local)} <em style={{ fontSize: "0.65em", textTransform: "lowercase", fontWeight: 400, opacity: 0.75 }}>vs</em>{" "}
      {nombreEquipo(visitante)}
    </>
  );
}

export default function FixtureRow({
  href,
  tituloPrincipal,
  notaSecundaria,
  jugada,
}: {
  href: string;
  tituloPrincipal: React.ReactNode;
  notaSecundaria: React.ReactNode;
  jugada: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 4,
        background: jugada ? NEGRO_JUGADA : "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
        border: `1px solid ${jugada ? "rgba(255,255,255,.06)" : "rgba(226,197,120,.25)"}`,
        borderRadius: 10,
        padding: "14px 12px",
        minHeight: 64,
        minWidth: 0,
        width: "100%",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          letterSpacing: 0.3,
          fontSize: "0.94rem",
          textTransform: "uppercase",
          color: DORADO_SUAVE,
          lineHeight: 1.3,
          width: "100%",
        }}
      >
        {tituloPrincipal}
      </div>
      <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{notaSecundaria}</div>
    </Link>
  );
}
