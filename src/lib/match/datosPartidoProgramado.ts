import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { puedeOperarCategoria, esManagerDeCategoria, puedeResetearPartidoDePrueba } from "@/lib/auth/scope";
import { grupoDeCategoria } from "@/lib/categorias";
import { PARTIDOS_DEMO_IDS } from "@/lib/partidosPrueba";
import { ordenarPorDorsal } from "@/lib/players";
import { sugerirPateador } from "@/lib/match/pateador";
import type { JugadorAgregado, JugadorPartido, Partido } from "@/types/firestore";
import type { SessionPayload } from "@/lib/auth/session";

// Todo lo que necesita PartidoProgramadoPanel para un partido "programado" (formacion +, si quien
// mira puede operar esa categoria, el panel del designado) -- compartido entre /partido/[id]
// (pagina completa) y /categoria/[id] (que muestra el proximo partido directo, sin ese paso
// intermedio).
export async function datosPartidoProgramado(partidoId: string, partido: Partido, session: SessionPayload | null) {
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  const grupo = grupoDeCategoria(partido.categoriaId);
  const jugadoresQuery =
    grupo.grupo === "superior"
      ? adminDb.collection("jugadores").where("grupo", "==", "superior")
      : adminDb.collection("jugadores").where("grupo", "==", "juveniles").where("edadId", "==", grupo.edadId);
  const [plantelSnap, jugadoresSnap] = await Promise.all([partidoRef.collection("plantel").get(), jugadoresQuery.get()]);

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
    pateadorHabitualId: partido.pateadorHabitualId,
  };

  const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
  const puedeOperar = puedeOperarCategoria(session, partido.categoriaId, esPartidoDePrueba);

  // Sugerencia del pateador habitual -- para poder elegirlo YA, antes de arrancar el partido, sin
  // perder el 1er minuto de juego. Solo hace falta calcularla mientras nadie contesto (una vez
  // guardado, pateadorHabitualId deja de ser undefined). Ver sugerirPateador.
  const sugeridoPateadorId =
    puedeOperar && partido.pateadorHabitualId === undefined
      ? await sugerirPateador(partido.categoriaId, plantel.map((j) => j.jugadorId))
      : null;
  const puedeReiniciar = esManagerDeCategoria(session, partido.categoriaId);
  const mostrarReset = esPartidoDePrueba && puedeResetearPartidoDePrueba(session, partido.categoriaId);

  // Formacion cargada como borrador (ver formacionPublicada en types/firestore.ts) -- quien no
  // puede operar esta categoria no ve la formacion real hasta que se publique.
  const formacionPublicada = partido.formacionPublicada !== false;
  const ocultarFormacion = !formacionPublicada && !puedeOperar;
  const plantelParaMostrar = ocultarFormacion ? [] : plantel;

  return {
    plantel: plantelParaMostrar,
    plantelCompleto,
    partidoParaCliente,
    puedeOperar,
    puedeReiniciar,
    esPartidoDePrueba,
    mostrarReset,
    formacionPublicada,
    ocultarFormacion,
    sugeridoPateadorId,
  };
}
