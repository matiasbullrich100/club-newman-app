import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, partidoId } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { proximasFechasDe } from "@/lib/match/resumenSeccion";
import { datosPartidoProgramado } from "@/lib/match/datosPartidoProgramado";
import type { Partido } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import PartidoProgramadoPanel from "@/components/PartidoProgramadoPanel";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

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

// Landing de un equipo de Plantel Superior: los 3 botones (Tabla / Fixt. New. / Fixt Divis.) y,
// en la MISMA pantalla, la formacion del PROXIMO partido directo (mismo panel que /partido/[id],
// via PartidoProgramadoPanel -- sin un link aparte a "ver partido completo"): un socio sin
// loguearse ve formacion + incidencias, y si puede operar esta categoria ve ademas el panel para
// publicar formacion/iniciar el partido/cargar cambios. El fixture completo (jugado y por jugar)
// vive en /categoria/[id]/fixture, detras de "Fixt. New.". Si no hay proxima fecha cargada
// (temporada terminada), no hay nada que mostrar ahi abajo.
export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId && c.grupo === "superior");
  if (!categoria) notFound();

  const [session, [proxima]] = await Promise.all([getSession(), proximasFechasDe(categoriaId, 1)]);

  let proximoPartido: Partido | null = null;
  let proximoPartidoId: string | null = null;
  let datos: Awaited<ReturnType<typeof datosPartidoProgramado>> | null = null;

  if (proxima) {
    proximoPartidoId = partidoId(categoriaId, proxima.numeroFecha);
    const partidoSnap = await adminDb.collection("partidos").doc(proximoPartidoId).get();
    if (partidoSnap.exists) {
      proximoPartido = partidoSnap.data() as Partido;
      datos = await datosPartidoProgramado(proximoPartidoId, proximoPartido, session);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/categorias" />
      <SessionBar session={session} />
      <Header />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>{categoria.nombre}</div>

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {TORNEOS_URBA[categoriaId] !== undefined && (
          <Link href={`/posiciones/${categoriaId}`} style={botonEstilo}>
            Tabla
          </Link>
        )}
        <Link href={`/categoria/${categoriaId}/fixture`} style={botonEstilo}>
          Fixt. New.
        </Link>
        {tieneFixtureDivision(categoriaId) && (
          <Link href={`/fixture/${categoriaId}/division`} style={botonEstilo}>
            Fixt Divis.
          </Link>
        )}
      </div>

      <div style={{ textAlign: "center", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: "0.78rem", color: DORADO, margin: "16px 0 6px" }}>
        Próximo Partido
      </div>

      {proximoPartido && proximoPartidoId && datos ? (
        <PartidoProgramadoPanel partidoId={proximoPartidoId} partido={proximoPartido} datos={datos} />
      ) : (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, fontStyle: "italic", opacity: 0.75 }}>No hay próximo partido programado.</p>
      )}
    </main>
  );
}
