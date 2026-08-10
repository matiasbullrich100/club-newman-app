import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { EDADES } from "@/lib/categorias";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { DORADO_SUAVE } from "@/lib/colors";

const botonStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: "0.95rem",
  fontWeight: 700,
  padding: "16px",
  borderRadius: 10,
  border: "1px solid rgba(226,197,120,.4)",
  color: DORADO_SUAVE,
  background: "linear-gradient(155deg, rgba(255,255,255,.05), rgba(0,0,0,.15))",
};

export default async function EstadisticasPage() {
  const session = await getSession();
  const autorizado = session?.rol === "manager" || session?.rol === "entrenador";

  // Manager de una division puntual: entra directo a la suya, no ve el selector.
  if (session?.rol === "manager" && session.alcance) {
    redirect(`/estadisticas/${session.alcance}`);
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header />

      {!autorizado ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          Esta sección es solo para Entrenador y Manager.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          <Link href="/estadisticas/superior" style={botonStyle}>
            Plantel Superior
          </Link>
          {EDADES.map((edad) => (
            <Link key={edad.id} href={`/estadisticas/${edad.id}`} style={botonStyle}>
              {edad.nombre}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
