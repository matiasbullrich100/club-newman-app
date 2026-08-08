import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS } from "@/lib/categorias";
import type { Incidente, JugadorPartido, Partido } from "@/types/firestore";
import PartidoLive from "@/components/PartidoLive";
import PartidoHistorico from "@/components/PartidoHistorico";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FooterChip from "@/components/FooterChip";
import PanelDesignado from "@/components/panel-designado/PanelDesignado";
import type { RosterJugador } from "@/components/panel-designado/types";
import { DORADO_SUAVE } from "@/lib/colors";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ partidoId: string }>;
}) {
  const { partidoId } = await params;
  const partidoRef = adminDb.collection("partidos").doc(partidoId);

  const [partidoSnap, session] = await Promise.all([partidoRef.get(), getSession()]);
  if (!partidoSnap.exists) notFound();
  const partido = partidoSnap.data() as Partido;
  const categoriaNombre = CATEGORIAS.find((c) => c.id === partido.categoriaId)?.nombre ?? partido.categoriaId;

  const cabecera = (
    <>
      <BackLink href={`/fecha/${partido.numeroFecha}`} />
      <Header rightLabel={`Fecha ${partido.numeroFecha}`} />
      <SessionBar session={session} />
      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>
        {categoriaNombre}
      </div>
    </>
  );

  // Partido ya jugado: vista estática, para siempre (nunca vuelve a estar operable).
  if (partido.estado === "terminado") {
    const [plantelSnap, incidentesSnap] = await Promise.all([
      partidoRef.collection("plantel").get(),
      partidoRef.collection("incidentes").orderBy("createdAt").get(),
    ]);
    const plantel = plantelSnap.docs.map((d) => {
      const data = d.data() as JugadorPartido;
      return {
        jugadorId: d.id,
        nombre: data.nombre,
        dorsal: data.dorsal,
        titular: data.titular,
        capitan: data.capitan,
        debut: data.debut,
      };
    });
    const incidentes = incidentesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Incidente) }));

    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
        {cabecera}
        <PartidoHistorico partido={partido} plantel={plantel} incidentes={incidentes} />
        <FooterChip />
      </main>
    );
  }

  // Partido todavia no arranco: vista estatica (resultado/formaciones aun no hay) + si quien
  // mira puede operar esta categoria, el boton "Iniciar partido" para arrancarlo cuando toque.
  if (partido.estado === "programado") {
    const plantelSnap = await partidoRef.collection("plantel").get();
    const plantel = plantelSnap.docs.map((d) => {
      const data = d.data() as JugadorPartido;
      return {
        jugadorId: d.id,
        nombre: data.nombre,
        dorsal: data.dorsal,
        titular: data.titular,
        capitan: data.capitan,
        debut: data.debut,
      };
    });
    const puedeOperar =
      !!session && (session.rol === "manager" || (session.rol === "designado" && session.categoriaId === partido.categoriaId));
    // createdAt/updatedAt son Timestamps de Firestore -- no se pueden pasar a un Client Component.
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

    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
        {cabecera}
        <PartidoHistorico partido={partido} plantel={plantel} incidentes={[]} />
        {puedeOperar && (
          <PanelDesignado
            partidoId={partidoId}
            partido={partidoParaCliente}
            plantel={plantel.map((j) => ({ jugadorId: j.jugadorId, nombre: j.nombre, dorsal: j.dorsal, titular: j.titular }))}
            periodo={null}
          />
        )}
        <FooterChip />
      </main>
    );
  }

  // en_juego | entretiempo | suspendido: motor en vivo (Fase 1, sin cambios).
  const plantelSnap = await partidoRef.collection("plantel").get();
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
  const plantel: RosterJugador[] = plantelSnap.docs.map((d) => {
    const data = d.data() as JugadorPartido;
    return { jugadorId: d.id, nombre: data.nombre, dorsal: data.dorsal, titular: data.titular };
  });

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      {cabecera}
      <PartidoLive partidoId={partidoId} inicial={partidoParaCliente} session={session} plantel={plantel} />
      <FooterChip />
    </main>
  );
}
