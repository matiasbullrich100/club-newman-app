import { getSession } from "@/lib/auth/session";
import { clasificadosNewman } from "@/lib/clasificadosNewman";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { FuenteUrba } from "@/components/PieNota";
import TablaClasificadosTop14 from "@/components/TablaClasificadosTop14";

// Playoff en UNA sola pantalla: los clasificados de cada division con sus cruces de semifinal, dia, hora y sede,
// en orden cronologico (ver TablaClasificadosTop14).
export default async function PlayoffPage() {
  const session = await getSession();
  const filas = await clasificadosNewman();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Playoff" />

      <div style={{ marginTop: 14 }}>
        {filas.length === 0 ? (
          <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center" }}>Todavía no hay tablas cargadas.</p>
        ) : (
          <TablaClasificadosTop14 filas={filas} />
        )}
      </div>

      <FuenteUrba />
    </main>
  );
}
