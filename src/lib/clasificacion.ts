import type { FilaPosicion } from "@/types/firestore";
import type { PartidoDivision } from "@/lib/fixtureDivision";

// Maximo que puede sumar un equipo en un partido: 4 por ganar + 1 de bonus ofensivo (el bonus
// defensivo es para el que pierde por 7 o menos, asi que ganando no se suma).
export const PUNTOS_MAXIMOS_POR_PARTIDO = 5;

interface CruceDirecto {
  jugados: number;
  puntosA: number;
  puntosB: number;
  difA: number;
  difB: number;
}

// Resultado de los partidos entre `a` y `b` (los dos de la doble rueda). Puntos de tabla: 4 por
// ganar, 2 por empatar, +1 por bonus (ofensivo o defensivo -- nunca los dos en el mismo partido).
function cruceDirecto(a: string, b: string, partidos: PartidoDivision[]): CruceDirecto {
  const c: CruceDirecto = { jugados: 0, puntosA: 0, puntosB: 0, difA: 0, difB: 0 };
  for (const p of partidos) {
    const aLocal = p.local === a && p.visitante === b;
    const aVisitante = p.local === b && p.visitante === a;
    if (!aLocal && !aVisitante) continue;
    if (!p.jugado || p.especial || p.golesLocal === undefined || p.golesVisitante === undefined) continue;
    const golesA = aLocal ? p.golesLocal : p.golesVisitante;
    const golesB = aLocal ? p.golesVisitante : p.golesLocal;
    const bonusA = aLocal ? p.bonusLocal : p.bonusVisitante;
    const bonusB = aLocal ? p.bonusVisitante : p.bonusLocal;
    c.jugados++;
    c.puntosA += (golesA > golesB ? 4 : golesA === golesB ? 2 : 0) + (bonusA ? 1 : 0);
    c.puntosB += (golesB > golesA ? 4 : golesA === golesB ? 2 : 0) + (bonusB ? 1 : 0);
    c.difA += golesA - golesB;
    c.difB += golesB - golesA;
  }
  return c;
}

/**
 * Desempate por los partidos entre dos equipos igualados en puntos: gana el que sumo mas puntos de
 * tabla en esos dos partidos y, si empatan, el de mayor diferencia de tantos. Solo vale cuando los
 * dos partidos ya se jugaron; si falta alguno o siguen igualados, no hay desempate (false).
 */
export function ganaDesempateDirecto(a: string, b: string, partidos: PartidoDivision[]): boolean {
  const c = cruceDirecto(a, b, partidos);
  if (c.jugados < 2) return false;
  if (c.puntosA !== c.puntosB) return c.puntosA > c.puntosB;
  return c.difA > c.difB;
}

/**
 * Posiciones (`FilaPosicion.posicion`) que ya tienen asegurado un lugar entre los `cupos` primeros
 * (playoff), aunque falten partidos -- se marcan con "*" en TablaPosiciones.
 *
 * Regla: un equipo esta clasificado cuando, como mucho, `cupos - 1` rivales pueden todavia
 * terminar con tantos puntos como el o mas (sus puntos de hoy + 5 por cada partido que les falta).
 * Con puntos iguales, si se pasan los `partidos` de la zona y el equipo gana el desempate directo
 * contra ese unico rival (ver ganaDesempateDirecto), ese rival no lo alcanza; si hay mas de un
 * rival que solo puede igualarlo, o no se sabe el desempate, cuentan todos ("quedan 10 puntos y le
 * llevas 11 al quinto" si, "le llevas 10" solo si ya le ganaste el cruce). No mira quien juega
 * contra quien en lo que falta, asi que puede marcar un poco mas tarde de lo estrictamente
 * posible, nunca antes.
 *
 * Partidos que faltan = todos contra todos a doble vuelta: 2 * (equipos - 1) - jugados (Top 14: 26;
 * 12 equipos: 22; 13 equipos: 24).
 */
export function posicionesClasificadas(filas: FilaPosicion[], cupos = 4, partidos?: PartidoDivision[]): Set<number> {
  const clasificadas = new Set<number>();
  if (filas.length <= cupos) return clasificadas;
  const partidosTotales = 2 * (filas.length - 1);
  const maximos = filas.map((f) => f.puntos + PUNTOS_MAXIMOS_POR_PARTIDO * Math.max(0, partidosTotales - f.jugados));
  filas.forEach((f, i) => {
    const superan = filas.filter((_, j) => j !== i && maximos[j] > f.puntos).length;
    const soloIgualan = filas.filter((_, j) => j !== i && maximos[j] === f.puntos);
    let alcanzan = superan + soloIgualan.length;
    if (partidos && soloIgualan.length === 1 && ganaDesempateDirecto(f.equipo, soloIgualan[0].equipo, partidos)) alcanzan -= 1;
    if (alcanzan <= cupos - 1) clasificadas.add(f.posicion);
  });
  return clasificadas;
}
