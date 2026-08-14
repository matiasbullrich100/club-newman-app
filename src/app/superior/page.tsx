import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS_SUPERIOR } from "@/lib/categorias";
import { partidosEnVivoOTerminadosHoy } from "@/lib/match/resumenSeccion";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import LiveBanner from "@/components/LiveBanner";
import { DORADO_SUAVE } from "@/lib/colors";

// Primera pantalla de la division: solo lo que se esta jugando/se jugo hoy + el selector de
// categoria -- el fixture completo (jugado y por jugar) vive en /categoria/[categoriaId], no aca.
export default async function PlantelSuperiorPage() {
  const [session, resumen] = await Promise.all([
    getSession(),
    partidosEnVivoOTerminadosHoy(CATEGORIAS_SUPERIOR.map((c) => c.id)),
  ]);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Plantel Superior" />

      {resumen.map((p) => (
        <LiveBanner
          key={p.id}
          partidoId={p.id}
          categoriaNombre={CATEGORIAS_SUPERIOR.find((c) => c.id === p.categoriaId)?.nombre ?? p.categoriaId}
          inicial={{ esLocal: p.esLocal, rival: p.rival, estado: p.estado, resultado: p.resultado }}
        />
      ))}

      <p style={{ textAlign: "center", marginTop: 16 }}>
        <Link
          href="/categorias"
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
          Ver por categoría
        </Link>
      </p>
    </main>
  );
}
