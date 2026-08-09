import type { Incidente } from "@/types/firestore";

export const ETIQUETAS_INCIDENTE: Record<Incidente["tipo"], string> = {
  try: "Try",
  try_scrum: "Try Scrum",
  conversion: "Conversión",
  penal: "Penal",
  drop: "Drop",
  try_penal: "Try Penal",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_doble_amarilla: "Doble amarilla",
  tarjeta_roja: "Tarjeta roja",
  tarjeta_roja_20: "Roja de 20",
  tarjeta_azul: "Tarjeta azul",
  cambio: "Cambio",
  lesion: "Lesión",
  fin_1t: "Final 1er tiempo",
  fin_2t: "Final 2do tiempo",
};

// Try Penal y Try Scrum se le dan al equipo, no a un jugador puntual.
const SIN_JUGADOR_PUNTUAL: Incidente["tipo"][] = ["try_penal", "try_scrum"];
const SIN_EQUIPO: Incidente["tipo"][] = ["fin_1t", "fin_2t"];

export function requierePlayerSelection(tipo: Incidente["tipo"]): boolean {
  return !SIN_JUGADOR_PUNTUAL.includes(tipo);
}

/** rivalNombre: nombre real del rival (ej. "SIC") para mostrar en vez del generico "Rival". */
export function describirIncidente(inc: Incidente, rivalNombre?: string): string {
  if (inc.tipo === "cambio") {
    return `Sale ${inc.jugadorSaleNombre ?? "?"}, entra ${inc.jugadorEntraNombre ?? "?"}`;
  }
  if (SIN_EQUIPO.includes(inc.tipo)) {
    return ETIQUETAS_INCIDENTE[inc.tipo];
  }
  const quien = inc.equipo === "newman" ? inc.jugadorNombre ?? "Newman" : rivalNombre ?? "Rival";
  return `${ETIQUETAS_INCIDENTE[inc.tipo]} — ${quien}`;
}

const PRIORIDAD_PERIODO: Record<string, number> = { "1T": 0, "2T": 1 };

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const conToMillis = value as { toMillis?: () => number };
  return typeof conToMillis.toMillis === "function" ? conToMillis.toMillis() : 0;
}

/**
 * Orden cronologico ascendente: 1T antes que 2T, dentro de cada tiempo minuto de menor a mayor,
 * y si dos incidencias caen en el mismo minuto, la que se publico primero (createdAt) va primero.
 */
export function ordenarIncidentes<T extends { periodo: string; minuto: number; createdAt?: unknown }>(
  lista: T[]
): T[] {
  return [...lista].sort((a, b) => {
    const porPeriodo = (PRIORIDAD_PERIODO[a.periodo] ?? 0) - (PRIORIDAD_PERIODO[b.periodo] ?? 0);
    if (porPeriodo !== 0) return porPeriodo;
    const porMinuto = a.minuto - b.minuto;
    if (porMinuto !== 0) return porMinuto;
    return toMillis(a.createdAt) - toMillis(b.createdAt);
  });
}
