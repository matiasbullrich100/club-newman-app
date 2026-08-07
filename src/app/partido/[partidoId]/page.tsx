import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import type { Incidente, JugadorPartido, Partido } from "@/types/firestore";
import PartidoLive from "@/components/PartidoLive";
import PartidoHistorico from "@/components/PartidoHistorico";
import IncidentesFeed from "@/components/IncidentesFeed";
import type { RosterJugador } from "@/components/panel-designado/types";

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

  const header = (
    <>
      <p>
        <Link href="/">← Volver</Link>
      </p>
      <h1 style={{ fontSize: "1.1rem" }}>
        {partido.esLocal ? "Newman" : partido.rival} vs {partido.esLocal ? partido.rival : "Newman"} — Fecha{" "}
        {partido.numeroFecha}
      </h1>
    </>
  );

  // Partido ya jugado o todavía no arrancó: vista estática, sin reloj ni panel del Designado.
  if (partido.estado === "terminado" || partido.estado === "programado") {
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
      <main style={{ padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>
        {header}
        <PartidoHistorico partido={partido} plantel={plantel} incidentes={incidentes} />
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
    <main style={{ padding: "1.5rem 1rem", fontFamily: "sans-serif" }}>
      {header}
      <PartidoLive partidoId={partidoId} inicial={partidoParaCliente} session={session} plantel={plantel} />
      <IncidentesFeed partidoId={partidoId} />
    </main>
  );
}
