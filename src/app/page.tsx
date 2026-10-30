import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import Header from "@/components/Header";
import SessionBar from "@/components/SessionBar";
import Buscador from "@/components/Buscador";
import InstalarApp from "@/components/InstalarApp";
import ProgramaSemifinales from "@/components/ProgramaSemifinales";
import { semifinalesProgramadasEstaSemana } from "@/lib/match/semifinales";
import { pruebasVisiblesPara } from "@/lib/partidosPrueba";
import { DORADO_SUAVE } from "@/lib/colors";

const botonStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: "1rem",
  fontWeight: 700,
  padding: "18px 16px",
  borderRadius: 10,
  border: "1px solid rgba(226,197,120,.4)",
  color: DORADO_SUAVE,
  background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
};

// Pastilla chica: tres en una fila (Plantel Superior / Juveniles / Playoff).
const botonChico: React.CSSProperties = { ...botonStyle, fontSize: "0.74rem", letterSpacing: 0.5, padding: "14px 4px", lineHeight: 1.2 };

export default async function Home() {
  const session = await getSession();
  // Semifinales de la semana (por dia y sede); el partido de HOY con formacion publicada muestra la formacion directo.
  const semis = await semifinalesProgramadasEstaSemana();
  // El boton "Formaciones" (pantalla /formaciones para cargar/publicar) lo ven el Administrador
  // (sin alcance) y cualquier Manager de division.
  const puedeSuperior = session?.rol === "manager" && (!session.alcance || session.alcance === "superior");
  const puedeJuveniles = session?.rol === "manager" && (!session.alcance || session.alcance !== "superior");
  const mostrarPruebas = pruebasVisiblesPara(session);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <Buscador flotante />
      <Header tituloHome />
      <SessionBar session={session} />

      {/* Tres pastillas arriba (Plantel Superior / Juveniles / Playoff), y enseguida el programa de semifinales: el
          partido de HOY con formacion publicada muestra la formacion directo. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 18 }}>
        <Link href="/superior" style={botonChico}>
          Plantel Superior
        </Link>
        <Link href="/juveniles" style={botonChico}>
          Juveniles
        </Link>
        <Link href="/playoff" style={{ ...botonChico, background: "rgba(245,196,40,.95)", borderColor: "rgba(245,196,40,1)", color: "#2a1b02" }}>
          Playoff
        </Link>
      </div>

      <div style={{ marginTop: 16 }}>
        <ProgramaSemifinales semis={semis} />
      </div>

      <InstalarApp />

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {(puedeSuperior || puedeJuveniles) && (
          <Link href="/formaciones" style={botonStyle}>
            Formaciones
          </Link>
        )}
        {session?.rol === "manager" && (
          <Link href="/programar" style={botonStyle}>
            Programar fecha
          </Link>
        )}
        {mostrarPruebas && (
          <Link href="/pruebas" style={botonStyle}>
            Partidos de Prueba
          </Link>
        )}
      </div>

      {(session?.rol === "manager" || session?.rol === "entrenador") && (
        <p style={{ textAlign: "center", marginTop: 20 }}>
          <Link
            href="/estadisticas"
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
            Tarjetas y minutos
          </Link>
        </p>
      )}
    </main>
  );
}
