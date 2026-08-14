import type { JugadorAgregado, TipoIncidente } from "@/types/firestore";
import type { FechaTarjeta } from "@/lib/tarjetasFormato";

export type { FechaTarjeta } from "@/lib/tarjetasFormato";

export type HistorialTarjetasPorJugador = Map<string, Partial<Record<TipoIncidente, FechaTarjeta[]>>>;

const CAMPO_HISTORIAL_POR_TIPO: Partial<Record<TipoIncidente, keyof JugadorAgregado>> = {
  tarjeta_amarilla: "fechasAmarillas",
  tarjeta_doble_amarilla: "fechasDobleAmarilla",
  tarjeta_roja: "fechasRojas",
  tarjeta_roja_20: "fechasRojas20",
  tarjeta_azul: "fechasAzules",
};

/**
 * Arma, para cada jugador, en que fecha (numero + rival) tuvo cada tipo de tarjeta -- para los
 * paneles tap-to-expand de la tabla de Tarjetas en /estadisticas/[grupoId].
 *
 * A diferencia de la version vieja (obtenerHistorialTarjetas), esto NO pega contra Firestore: los
 * arrays fechasAmarillas/fechasDobleAmarilla/fechasRojas/fechasRojas20/fechasAzules ya vienen
 * mantenidos incrementalmente en cada jugadores/{id} (ver CAMPO_HISTORIAL_TARJETA en
 * match/actions.ts, actualizado en publicarIncidente/corregirTipoIncidente/eliminarIncidente) --
 * la pagina ya trae esos documentos para la tabla, asi que esto es una transformacion sincronica
 * en memoria, sin ninguna lectura extra.
 */
export function construirHistorialTarjetas(jugadores: (JugadorAgregado & { id: string })[]): HistorialTarjetasPorJugador {
  const resultado: HistorialTarjetasPorJugador = new Map();

  for (const jugador of jugadores) {
    const porTipo: Partial<Record<TipoIncidente, FechaTarjeta[]>> = {};
    for (const tipo of Object.keys(CAMPO_HISTORIAL_POR_TIPO) as TipoIncidente[]) {
      const campo = CAMPO_HISTORIAL_POR_TIPO[tipo]!;
      const filas = jugador[campo] as FechaTarjeta[] | undefined;
      if (!filas || filas.length === 0) continue;
      // Orden cronologico -- necesario para que "cada 3 amarillas = 1 fecha de suspension" tome
      // las primeras 3 en el tiempo, no el orden en que quedaron guardadas en el array.
      porTipo[tipo] = [...filas].sort((a, b) => Number(a.numeroFecha) - Number(b.numeroFecha));
    }
    if (Object.keys(porTipo).length > 0) resultado.set(jugador.id, porTipo);
  }

  return resultado;
}
