import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import Header from "@/components/Header";
import SessionBar from "@/components/SessionBar";
import PublicarDivisionButton from "@/components/PublicarDivisionButton";
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
  // Solo Administrador (sin alcance) y el Manager de la division correspondiente ven el boton de
  // publicar en bloque -- un manager de Juveniles acotado a una sola edad igual ve "Subir
  // Juveniles", pero publicarFormacionesGrupo se salta las edades que no puede operar.
  const puedeSuperior = session?.rol === "manager" && (!session.alcance || session.alcance === "superior");
  const puedeJuveniles = session?.rol === "manager" && (!session.alcance || session.alcance !== "superior");

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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {puedeSuperior && <PublicarDivisionButton grupo="superior" label="Plantel" />}
            {puedeJuveniles && <PublicarDivisionButton grupo="juveniles" label="Juveniles" />}
          </div>
        )}
        <Link href="/pruebas" style={botonStyle}>
          Partidos de Prueba
        </Link>
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
