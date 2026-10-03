import type { FilaPosicion } from "@/types/firestore";

// Maximo que puede sumar un equipo en un partido: 4 por ganar + 1 de bonus ofensivo (el bonus
// defensivo es para el que pierde por 7 o menos, asi que ganando no se suma).
export const PUNTOS_MAXIMOS_POR_PARTIDO = 5;

/**
 * Posiciones (`FilaPosicion.posicion`) que ya tienen asegurado un lugar entre los `cupos` primeros
 * (playoff), aunque falten partidos -- se marcan con "*" en TablaPosiciones.
 *
 * Regla: un equipo esta clasificado cuando, como mucho, `cupos - 1` rivales pueden todavia
 * terminar con tantos puntos como el o mas (sus puntos de hoy + 5 por cada partido que les falta).
 * Con puntos iguales NO alcanza (no se sabe el desempate): "quedan 10 puntos y le llevas 11 al
 * quinto" si, "le llevas 10" no. No mira quien juega contra quien en lo que falta, asi que puede
 * marcar un poco mas tarde de lo estrictamente posible, nunca antes.
 *
 * Partidos que faltan = todos contra todos a doble vuelta: 2 * (equipos - 1) - jugados (Top 14: 26;
 * 12 equipos: 22; 13 equipos: 24).
 */
export function posicionesClasificadas(filas: FilaPosicion[], cupos = 4): Set<number> {
  const clasificadas = new Set<number>();
  if (filas.length <= cupos) return clasificadas;
  const partidosTotales = 2 * (filas.length - 1);
  const maximos = filas.map((f) => f.puntos + PUNTOS_MAXIMOS_POR_PARTIDO * Math.max(0, partidosTotales - f.jugados));
  filas.forEach((f, i) => {
    const rivalesQuePuedenAlcanzarlo = filas.filter((_, j) => j !== i && maximos[j] >= f.puntos).length;
    if (rivalesQuePuedenAlcanzarlo <= cupos - 1) clasificadas.add(f.posicion);
  });
  return clasificadas;
}
