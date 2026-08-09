import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS, NUMERO_FECHAS_JUVENILES, NUMERO_FECHAS_SUPERIOR } from "@/lib/categorias";
import type { Incidente, JugadorPartido, Partido } from "@/types/firestore";
import PartidoLive from "@/components/PartidoLive";
import PartidoHistorico from "@/components/PartidoHistorico";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FooterChip from "@/components/FooterChip";
import PanelDesignado from "@/components/panel-designado/PanelDesignado";
import ResetDemoButton from "@/components/ResetDemoButton";
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
  const categoria = CATEGORIAS.find((c) => c.id === partido.categoriaId);
  const categoriaNombre = categoria?.nombre ?? partido.categoriaId;
  const PARTIDOS_DEMO_IDS = ["demo-partido-1", "demo-partido-2", "demo-partido-3"];
  const mostrarReset = PARTIDOS_DEMO_IDS.includes(partidoId) && session?.rol === "manager";
  // numeroFecha "demo" (partidos de prueba, fuera de cualquier esquema real) no tiene vista de
  // fecha propia -- /fecha o /juveniles/.../fecha devuelven 404 para un numero fuera de rango.
  const numero = Number(partido.numeroFecha);
  const maxFechas = categoria?.grupo === "juveniles" ? NUMERO_FECHAS_JUVENILES : NUMERO_FECHAS_SUPERIOR;
  const numeroFechaValido = Number.isInteger(numero) && numero >= 1 && numero <= maxFechas;
  const backHref = !numeroFechaValido
    ? "/"
    : categoria?.grupo === "juveniles"
      ? `/juveniles/${categoria.edadId}/fecha/${numero}`
      : `/fecha/${numero}`;

  const cabecera = (
    <>
      <BackLink href={backHref} />
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
        {mostrarReset && <ResetDemoButton partidoId={partidoId} />}
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
        {mostrarReset && <ResetDemoButton partidoId={partidoId} />}
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
      {mostrarReset && <ResetDemoButton partidoId={partidoId} />}
      <FooterChip />
    </main>
  );
}
