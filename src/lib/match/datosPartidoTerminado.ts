import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { puedeOperarCategoria, esManagerDeCategoria } from "@/lib/auth/scope";
import { grupoDeCategoria } from "@/lib/categorias";
import { FAMILIA_TARJETA } from "@/lib/incidentes";
import { PARTIDOS_DEMO_IDS } from "@/lib/partidosPrueba";
import { apellidosAmbiguos, ordenarPorDorsal } from "@/lib/players";
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
  const [plantelSnap, incidentesSnap, jugadoresSnap, jugadoresClubSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").orderBy("createdAt").get(),
    jugadoresQuery.get(),
    // Sin scope de grupo/edad -- dos jugadores con el mismo apellido en divisiones distintas (ej.
    // uno en Plantel, otro en Juveniles) siguen siendo ambiguos para quien lee el feed. Ver
    // apellidosAmbiguos() en lib/players.ts.
    adminDb.collection("jugadores").get(),
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
  const puedeReiniciar = esManagerDeCategoria(session, partido.categoriaId);
  const esManager = puedeReiniciar; // mismo chequeo, ver el filtro de tarjetas mas abajo

  // IncidentesList es un Client Component -- un Timestamp crudo del Admin SDK no cruza el limite
  // servidor->cliente, hay que pasarlo a Date.
  const todasLasIncidencias = incidentesSnap.docs.map((d) => {
    const data = d.data() as Incidente;
    const createdAt = data.createdAt as unknown as FirebaseFirestore.Timestamp;
    return { id: d.id, ...data, createdAt: createdAt?.toDate?.() ?? data.createdAt };
  });
  // Terminado el partido, las tarjetas (y el "Fin {tarjeta}: sale/entra" que las cierra) se ocultan
  // del feed para todos menos el manager de esta categoria -- se siguen viendo durante el partido
  // (en_juego/entretiempo, ver /partido/[id]/page.tsx) y siguen sumando al stock de jugadores/ vía
  // publicarIncidente. Pensado para que el manager pueda reconciliar contra lo que URBA denuncia
  // antes de que la tarjeta quede visible para todos -- si el arbitro no la denuncio, el manager la
  // borra (Corregir → Eliminar jugada, ya resta del stock) sin que haya llegado a mostrarse en
  // público.
  const incidentes = esManager
    ? todasLasIncidencias
    : todasLasIncidencias.filter((inc) => !FAMILIA_TARJETA.includes(inc.tipo) && !(inc.tipo === "cambio" && inc.cierreSancionTipo));

  const puedeOperar = puedeOperarCategoria(session, partido.categoriaId);
  const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
  const mostrarReset = esPartidoDePrueba && esManagerDeCategoria(session, partido.categoriaId);
  const ambiguos = apellidosAmbiguos(jugadoresClubSnap.docs.map((d) => (d.data() as JugadorAgregado).nombre));

  return { plantel, plantelCompleto, incidentes, puedeOperar, puedeReiniciar, esPartidoDePrueba, mostrarReset, apellidosAmbiguos: ambiguos };
}
