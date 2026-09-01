import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, partidoId, grupoDeCategoria } from "@/lib/categorias";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { partidosEnVivoOUltimoTerminado, proximasFechasDe } from "@/lib/match/resumenSeccion";
import { datosPartidoProgramado } from "@/lib/match/datosPartidoProgramado";
import { datosPartidoTerminado } from "@/lib/match/datosPartidoTerminado";
import { diasDesdeEnArgentina } from "@/lib/fecha";
import type { JugadorAgregado, JugadorPartido, Partido } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import PartidoProgramadoPanel from "@/components/PartidoProgramadoPanel";
import PartidoTerminadoPanel from "@/components/PartidoTerminadoPanel";
import PartidoLive from "@/components/PartidoLive";
import type { RosterJugador } from "@/components/panel-designado/types";
import { ordenarPorDorsal } from "@/lib/players";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const ESTADOS_EN_VIVO = new Set(["en_juego", "entretiempo", "suspendido"]);

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

// Landing de un equipo de Plantel Superior: los 3 botones (Tabla / Fixt. Newm. / Fixt Divis.) y, en
// la MISMA pantalla, el partido mas relevante ahora mismo -- si esta en vivo o se acaba de
// resolver (terminado o walkover, "fresco" = dentro de los ultimos 3 dias, mismo criterio que
// /superior), ese; si no, el proximo programado. Sin un link aparte a "ver partido completo": un
// socio sin loguearse ve formacion + incidencias, y si puede operar esta categoria ve ademas el
// panel para publicar formacion/iniciar el partido/cargar cambios. El fixture completo (jugado y
// por jugar) vive en /categoria/[id]/fixture, detras de "Fixt. Newm.".
export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId && c.grupo === "superior");
  if (!categoria) notFound();

  const [session, [resumenPropio]] = await Promise.all([getSession(), partidosEnVivoOUltimoTerminado([categoriaId])]);

  const esVivo = !!resumenPropio && ESTADOS_EN_VIVO.has(resumenPropio.estado);
  const esFresco =
    !!resumenPropio &&
    (esVivo || ((resumenPropio.estado === "terminado" || resumenPropio.notaEspecial) && !!resumenPropio.fecha && diasDesdeEnArgentina(resumenPropio.fecha) <= 3));

  let panel: React.ReactNode = null;
  let titulo = "Próximo Partido";

  if (esFresco && resumenPropio) {
    const partidoRef = adminDb.collection("partidos").doc(resumenPropio.id);
    const partidoSnap = await partidoRef.get();
    if (partidoSnap.exists) {
      const partido = partidoSnap.data() as Partido;
      if (esVivo) {
        titulo = "Partido en Vivo";
        const grupo = grupoDeCategoria(categoriaId);
        const jugadoresQuery =
          grupo.grupo === "superior"
            ? adminDb.collection("jugadores").where("grupo", "==", "superior")
            : adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", grupo.edadId);
        const [plantelSnap, jugadoresSnap] = await Promise.all([partidoRef.collection("plantel").get(), jugadoresQuery.get()]);
        const plantelCompleto = jugadoresSnap.docs.map((d) => ({ jugadorId: d.id, nombre: (d.data() as JugadorAgregado).nombre }));
        const plantel: RosterJugador[] = ordenarPorDorsal(
          plantelSnap.docs.map((d) => {
            const data = d.data() as JugadorPartido;
            return { jugadorId: d.id, nombre: data.nombre, dorsal: data.dorsal, titular: data.titular };
          })
        );
        // createdAt/updatedAt son Timestamps de Firestore -- no se pueden pasar a un Client
        // Component (rompe la serializacion del RSC payload en produccion).
        const partidoParaCliente: Partido = {
          categoriaId: partido.categoriaId,
          numeroFecha: partido.numeroFecha,
          rival: partido.rival,
          esLocal: partido.esLocal,
          cancha: partido.cancha,
          estado: partido.estado,
          resultado: partido.resultado,
          enCanchaIds: partido.enCanchaIds,
        };
        panel = (
          <PartidoLive partidoId={resumenPropio.id} inicial={partidoParaCliente} session={session} plantel={plantel} plantelCompleto={plantelCompleto} />
        );
      } else {
        titulo = "Última Fecha Jugada";
        const datos = await datosPartidoTerminado(resumenPropio.id, partido, session);
        panel = <PartidoTerminadoPanel partidoId={resumenPropio.id} partido={partido} datos={datos} />;
      }
    }
  }

  if (!panel) {
    const [proxima] = await proximasFechasDe(categoriaId, 1);
    if (proxima) {
      const proximoPartidoId = partidoId(categoriaId, proxima.numeroFecha);
      const partidoSnap = await adminDb.collection("partidos").doc(proximoPartidoId).get();
      if (partidoSnap.exists) {
        const proximoPartido = partidoSnap.data() as Partido;
        const datos = await datosPartidoProgramado(proximoPartidoId, proximoPartido, session);
        panel = <PartidoProgramadoPanel partidoId={proximoPartidoId} partido={proximoPartido} datos={datos} />;
      }
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/superior" />
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
          Fixt. Newm.
        </Link>
        {tieneFixtureDivision(categoriaId) && (
          <Link href={`/fixture/${categoriaId}/division`} style={botonEstilo}>
            Fixt Divis.
          </Link>
        )}
      </div>

      <div style={{ textAlign: "center", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: "0.78rem", color: DORADO, margin: "16px 0 6px" }}>
        {titulo}
      </div>

      {panel ?? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, fontStyle: "italic", opacity: 0.75 }}>No hay próximo partido programado.</p>
      )}
    </main>
  );
}
