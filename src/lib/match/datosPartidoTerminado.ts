import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { puedeOperarCategoria, esManagerDeCategoria } from "@/lib/auth/scope";
import { grupoDeCategoria } from "@/lib/categorias";
import { PARTIDOS_DEMO_IDS } from "@/lib/partidosPrueba";
import { ordenarPorDorsal } from "@/lib/players";
import type { Incidente, JugadorAgregado, JugadorPartido, Partido } from "@/types/firestore";
import type { SessionPayload } from "@/lib/auth/session";

// Todo lo que necesita PartidoTerminadoPanel para un partido "terminado" (formacion, incidencias
// y, si quien mira puede operar esa categoria, el bloque para corregir) -- compartido entre
// /partido/[id] (pagina completa) y /categoria/[id] (que muestra el ultimo partido jugado directo
// cuando esta "fresco", sin ese paso intermedio -- ver diasDesdeEnArgentina en lib/fecha.ts).
export async function datosPartidoTerminado(partidoId: string, partido: Partido, session: SessionPayload | null) {
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  const grupo = grupoDeCategoria(partido.categoriaId);
  const jugadoresQuery =
    grupo.grupo === "superior"
      ? adminDb.collection("jugadores").where("grupo", "==", "superior")
      : adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", grupo.edadId);
  const [plantelSnap, incidentesSnap, jugadoresSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").orderBy("createdAt").get(),
    jugadoresQuery.get(),
  ]);

  const plantelCompleto = jugadoresSnap.docs.map((d) => ({
    jugadorId: d.id,
    nombre: (d.data() as JugadorAgregado).nombre,
  }));
  const plantel = ordenarPorDorsal(
    plantelSnap.docs.map((d) => {
      const data = d.data() as JugadorPartido;
      return { jugadorId: d.id, nombre: data.nombre, dorsal: data.dorsal, titular: data.titular, capitan: data.capitan, debut: data.debut };
    })
  );
  // IncidentesList es un Client Component -- un Timestamp crudo del Admin SDK no cruza el limite
  // servidor->cliente, hay que pasarlo a Date.
  const incidentes = incidentesSnap.docs.map((d) => {
    const data = d.data() as Incidente;
    const createdAt = data.createdAt as unknown as FirebaseFirestore.Timestamp;
    return { id: d.id, ...data, createdAt: createdAt?.toDate?.() ?? data.createdAt };
  });

  const puedeOperar = puedeOperarCategoria(session, partido.categoriaId);
  const puedeReiniciar = esManagerDeCategoria(session, partido.categoriaId);
  const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
  const mostrarReset = esPartidoDePrueba && esManagerDeCategoria(session, partido.categoriaId);

  return { plantel, plantelCompleto, incidentes, puedeOperar, puedeReiniciar, esPartidoDePrueba, mostrarReset };
}
