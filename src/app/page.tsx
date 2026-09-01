import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import Header from "@/components/Header";
import SessionBar from "@/components/SessionBar";
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

export default async function Home() {
  const session = await getSession();
  // El boton "Formaciones" (pantalla /formaciones para cargar/publicar) lo ven el Administrador
  // (sin alcance) y cualquier Manager de division.
  const puedeSuperior = session?.rol === "manager" && (!session.alcance || session.alcance === "superior");
  const puedeJuveniles = session?.rol === "manager" && (!session.alcance || session.alcance !== "superior");
  const mostrarPruebas = pruebasVisiblesPara(session);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <Header tituloHome />
      <SessionBar session={session} />

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <Link href="/superior" style={botonStyle}>
          Plantel Superior
        </Link>
        <Link href="/juveniles" style={botonStyle}>
          Juveniles
        </Link>
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
