import { splitNombre } from "@/lib/players";

const DORADO = "#f2a900";

interface RosterJugadorHistorico {
  jugadorId: string;
  nombre: string;
  dorsal: string;
  titular: boolean;
  capitan?: boolean;
  debut?: boolean;
}

function capitalizar(s: string): string {
  return (s || "").toLowerCase().replace(/(^|\s|\.)([a-zà-ÿ])/g, (_m, pre, ch) => pre + ch.toUpperCase());
}

function FilaFormacion({ jugador, dorsalAdelante }: { jugador: RosterJugadorHistorico; dorsalAdelante: boolean }) {
  const { apellido, nombre } = splitNombre(jugador.nombre);
  const capitanTxt = jugador.capitan && <span style={{ color: DORADO, fontWeight: 700 }}>(C) </span>;
  const debutTxt = jugador.debut && <span style={{ color: DORADO, fontStyle: "italic", fontWeight: 600 }}> (Debut)</span>;
  const nombreTxt = (
    <>
      {capitalizar(nombre)} <b style={{ textTransform: "uppercase" }}>{apellido}</b>
    </>
  );
  const dorsalTxt = <span style={{ color: DORADO, fontWeight: 600 }}>{jugador.dorsal || "-"}</span>;

  return (
    <div
      style={{
        padding: "3px 2px",
        fontSize: "0.8rem",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        textAlign: dorsalAdelante ? "left" : "right",
      }}
    >
      {dorsalAdelante ? (
        <>
          {dorsalTxt} - {capitanTxt}
          {nombreTxt}
          {debutTxt}
        </>
      ) : (
        <>
          {capitanTxt}
          {nombreTxt} - {dorsalTxt}
          {debutTxt}
        </>
      )}
    </div>
  );
}

function DosColumnas({ izquierda, derecha }: { izquierda: RosterJugadorHistorico[]; derecha: RosterJugadorHistorico[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <div style={{ borderRight: `1px solid ${DORADO}`, paddingRight: 8 }}>
        {izquierda.map((j) => (
          <FilaFormacion key={j.jugadorId} jugador={j} dorsalAdelante={false} />
        ))}
      </div>
      <div style={{ paddingLeft: 8 }}>
        {derecha.map((j) => (
          <FilaFormacion key={j.jugadorId} jugador={j} dorsalAdelante={true} />
        ))}
      </div>
    </div>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: "center",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
        fontSize: "0.78rem",
        color: DORADO,
        margin: "12px 0 6px",
      }}
    >
      {children}
    </div>
  );
}

export default function Formaciones({ plantel }: { plantel: RosterJugadorHistorico[] }) {
  const titulares = plantel.filter((j) => j.titular);
  const suplentes = plantel.filter((j) => !j.titular);
  const mitadSuplentes = Math.ceil(suplentes.length / 2);

  return (
    <div>
      <Etiqueta>Titulares</Etiqueta>
      <DosColumnas izquierda={titulares.slice(0, 8)} derecha={titulares.slice(8, 15)} />

      {suplentes.length > 0 && (
        <>
          <Etiqueta>Suplentes</Etiqueta>
          <DosColumnas izquierda={suplentes.slice(0, mitadSuplentes)} derecha={suplentes.slice(mitadSuplentes)} />
        </>
      )}
    </div>
  );
}
