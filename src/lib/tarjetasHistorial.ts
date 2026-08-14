import { adminDb } from "@/lib/firebase-admin";
import { partidoIdsDeGrupo } from "@/lib/categorias";
import type { Incidente, Partido, TipoIncidente } from "@/types/firestore";
import type { FechaTarjeta } from "@/lib/tarjetasFormato";

export type { FechaTarjeta } from "@/lib/tarjetasFormato";

const TIPOS_TARJETA: TipoIncidente[] = [
  "tarjeta_amarilla",
  "tarjeta_doble_amarilla",
  "tarjeta_roja",
  "tarjeta_roja_20",
  "tarjeta_azul",
];

export type HistorialTarjetasPorJugador = Map<string, Partial<Record<TipoIncidente, FechaTarjeta[]>>>;

/**
 * Junta, para cada jugador de `jugadorIds`, en que fecha (numero + rival) tuvo cada tipo de
 * tarjeta -- para los tooltips de la tabla de Tarjetas en /estadisticas/[grupoId].
 *
 * A proposito NO usa collectionGroup("incidentes") -- esa consulta pide un indice manual en
 * Firestore que hay que crear a mano en la consola (friccion innecesaria). En cambio, arma los
 * partidoId de todas las fechas de este grupo (deterministicos, ver categorias.ts), los trae de
 * una sola vez con adminDb.getAll(), se queda solo con los "terminado", y busca las incidencias
 * de tarjeta en la subcoleccion de CADA UNO de esos -- una query normal por partido (no
 * collectionGroup), que no necesita ningun indice extra.
 */
export async function obtenerHistorialTarjetas(grupoId: string, jugadorIds: Set<string>): Promise<HistorialTarjetasPorJugador> {
  const resultado: HistorialTarjetasPorJugador = new Map();
  if (jugadorIds.size === 0) return resultado;

  const idsPartidos = partidoIdsDeGrupo(grupoId);
  if (idsPartidos.length === 0) return resultado;

  const partidoSnaps = await adminDb.getAll(...idsPartidos.map((id) => adminDb.collection("partidos").doc(id)));
  const terminados = partidoSnaps.filter((s) => s.exists && (s.data() as Partido).estado === "terminado");

  const porPartido = await Promise.all(
    terminados.map(async (snap) => {
      const p = snap.data() as Partido;
      const incSnap = await snap.ref.collection("incidentes").where("tipo", "in", TIPOS_TARJETA).get();
      return incSnap.docs
        .map((d) => d.data() as Incidente)
        .filter((inc) => inc.equipo === "newman" && inc.jugadorId && jugadorIds.has(inc.jugadorId))
        .map((inc) => ({ jugadorId: inc.jugadorId as string, tipo: inc.tipo, info: { numeroFecha: p.numeroFecha, rival: p.rival } }));
    })
  );

  for (const fila of porPartido.flat()) {
    const porTipo = resultado.get(fila.jugadorId) ?? {};
    const lista = porTipo[fila.tipo] ?? [];
    lista.push(fila.info);
    porTipo[fila.tipo] = lista;
    resultado.set(fila.jugadorId, porTipo);
  }

  // Orden cronologico -- necesario para que "cada 3 amarillas = 1 fecha de suspension" tome las
  // primeras 3 en el tiempo, no el orden en que llegaron las respuestas de Firestore.
  for (const porTipo of resultado.values()) {
    for (const tipo of Object.keys(porTipo) as TipoIncidente[]) {
      porTipo[tipo]!.sort((a, b) => Number(a.numeroFecha) - Number(b.numeroFecha));
    }
  }

  return resultado;
}
