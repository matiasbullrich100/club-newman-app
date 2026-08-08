import type { Incidente } from "@/types/firestore";

export const ETIQUETAS_INCIDENTE: Record<Incidente["tipo"], string> = {
  try: "Try",
  try_scrum: "Try Scrum",
  conversion: "Conversión",
  penal: "Penal",
  drop: "Drop",
  try_penal: "Try Penal",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
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

export function describirIncidente(inc: Incidente): string {
  if (inc.tipo === "cambio") {
    return `Sale ${inc.jugadorSaleNombre ?? "?"}, entra ${inc.jugadorEntraNombre ?? "?"}`;
  }
  if (SIN_EQUIPO.includes(inc.tipo)) {
    return ETIQUETAS_INCIDENTE[inc.tipo];
  }
  const quien = inc.equipo === "newman" ? inc.jugadorNombre ?? "Newman" : "Rival";
  return `${ETIQUETAS_INCIDENTE[inc.tipo]} — ${quien}`;
}

const PRIORIDAD_PERIODO: Record<string, number> = { "1T": 0, "2T": 1 };

/** Orden cronologico ascendente: 1T antes que 2T, y dentro de cada tiempo, minuto de menor a mayor. */
export function ordenarIncidentes<T extends { periodo: string; minuto: number }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    const porPeriodo = (PRIORIDAD_PERIODO[a.periodo] ?? 0) - (PRIORIDAD_PERIODO[b.periodo] ?? 0);
    if (porPeriodo !== 0) return porPeriodo;
    return a.minuto - b.minuto;
  });
}
