import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { clasificadosNewman } from "@/lib/clasificadosNewman";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import { FuenteUrba } from "@/components/PieNota";
import TablaClasificadosTop14 from "@/components/TablaClasificadosTop14";
import { DORADO, DORADO_SUAVE, TINTA } from "@/lib/colors";

const botonEstilo: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.7rem",
  fontWeight: 700,
  padding: "9px 4px",
  borderRadius: 8,
  border: "1px solid rgba(226,197,120,.4)",
  color: DORADO_SUAVE,
};
const botonActivo: React.CSSProperties = { ...botonEstilo, background: DORADO, color: TINTA, border: `1px solid ${DORADO}` };

// 1ra pantalla de Playoff: los 4 clasificados de cada division (el de Newman en amarillo), con las posiciones de
// la ultima tabla de URBA. La 2da (/playoff/cruces) es el programa y los cruces de semifinales.
export default async function PlayoffPage() {
  const session = await getSession();
  const filas = await clasificadosNewman();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Playoff" />

      <div style={{ display: "flex", gap: 6, margin: "12px 0 14px" }}>
        <span style={botonActivo}>Clasificados</span>
        <Link href="/playoff/cruces" replace style={botonEstilo}>
          Cruces
        </Link>
      </div>

      {filas.length === 0 ? (
        <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center" }}>Todavía no hay tablas cargadas.</p>
      ) : (
        <TablaClasificadosTop14 filas={filas} />
      )}

      <FuenteUrba />
    </main>
  );
}
