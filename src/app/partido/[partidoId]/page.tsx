import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import type { JugadorPartido, Partido } from "@/types/firestore";
import PartidoLive from "@/components/PartidoLive";
import IncidentesFeed from "@/components/IncidentesFeed";
import type { RosterJugador } from "@/components/panel-designado/types";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ partidoId: string }>;
}) {
  const { partidoId } = await params;
  const partidoRef = adminDb.collection("partidos").doc(partidoId);

  const [partidoSnap, plantelSnap, session] = await Promise.all([
    partidoRef.get(),
    partidoRef.collection("plantel").get(),
    getSession(),
  ]);

  if (!partidoSnap.exists) notFound();

  const partido = partidoSnap.data() as Partido;
  // Solo los campos que usa el cliente — createdAt/updatedAt son Timestamps de Firestore
  // (no serializables) y no se pueden pasar de un Server Component a un Client Component.
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
      <p>
        <Link href="/">← Volver</Link>
      </p>
      <h1 style={{ fontSize: "1.1rem" }}>
        {partido.esLocal ? "Newman" : partido.rival} vs {partido.esLocal ? partido.rival : "Newman"} — Fecha{" "}
        {partido.numeroFecha}
      </h1>

      <PartidoLive partidoId={partidoId} inicial={partidoParaCliente} session={session} plantel={plantel} />

      <IncidentesFeed partidoId={partidoId} />
    </main>
  );
}
