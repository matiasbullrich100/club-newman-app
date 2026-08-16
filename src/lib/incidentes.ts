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
  interrupcion_medica: "Partido interrumpido — Médico",
  interrupcion_clima: "Partido interrumpido — Clima",
  walkover: "W.O. — sin primera línea",
};

// Try Penal y Try Scrum se le dan al equipo, no a un jugador puntual.
const SIN_JUGADOR_PUNTUAL: Incidente["tipo"][] = ["try_penal", "try_scrum"];
const SIN_EQUIPO: Incidente["tipo"][] = ["fin_1t", "fin_2t", "interrupcion_medica", "interrupcion_clima"];

// Una incidencia mal cargada solo se puede corregir dentro de su propia familia (puntos<->puntos
// o tarjeta<->tarjeta) -- cambiar de familia dejaria campos inconsistentes (una tarjeta no tiene
// puntos, un cambio no tiene este jugadorId, etc). Usado tanto por el server action como por la UI.
export const FAMILIA_PUNTOS: Incidente["tipo"][] = ["try", "try_scrum", "conversion", "penal", "drop", "try_penal"];
export const FAMILIA_TARJETA: Incidente["tipo"][] = [
  "tarjeta_amarilla",
  "tarjeta_doble_amarilla",
  "tarjeta_roja",
  "tarjeta_roja_20",
  "tarjeta_azul",
];

// Duracion de la sancion en cancha -- solo amarilla y roja de 20 tienen reingreso (roja comun y
// doble amarilla son expulsion definitiva, no aplica). Compartido entre el server action que saca
// al jugador de la cancha y el cliente que muestra la cuenta regresiva, para no duplicar el numero.
export const DURACION_SANCION_SEGUNDOS: Partial<Record<Incidente["tipo"], number>> = {
  tarjeta_amarilla: 10 * 60,
  tarjeta_roja_20: 20 * 60,
};

export function requierePlayerSelection(tipo: Incidente["tipo"]): boolean {
  return !SIN_JUGADOR_PUNTUAL.includes(tipo);
}

/**
 * rivalNombre: nombre real del rival (ej. "SIC") para mostrar en vez del generico "Rival".
 * nombreNewman: "Newman" salvo en Juveniles, donde se pide aclarar el equipo (ej. "Newman A").
 */
export function describirIncidente(inc: Incidente, rivalNombre?: string, nombreNewman = "Newman"): string {
  if (inc.tipo === "cambio") {
    // Salida/reingreso por sancion (amarilla/roja de 20): un solo lado, sin par (ver
    // DURACION_SANCION_SEGUNDOS en match/actions.ts) -- no tiene sentido mostrar el otro como "?".
    if (inc.jugadorSaleNombre && !inc.jugadorEntraNombre) {
      return `Sale ${inc.jugadorSaleNombre} — ${nombreNewman} (sanción)`;
    }
    if (inc.jugadorEntraNombre && !inc.jugadorSaleNombre) {
      return `Entra ${inc.jugadorEntraNombre} — ${nombreNewman} (reingreso)`;
    }
    return `Cambio — ${nombreNewman} — Sale ${inc.jugadorSaleNombre ?? "?"}, entra ${inc.jugadorEntraNombre ?? "?"}`;
  }
  if (SIN_EQUIPO.includes(inc.tipo)) {
    return ETIQUETAS_INCIDENTE[inc.tipo];
  }
  if (inc.equipo === "newman") {
    const quien = inc.jugadorNombre ? `${nombreNewman} — ${inc.jugadorNombre}` : nombreNewman;
    return `${ETIQUETAS_INCIDENTE[inc.tipo]} — ${quien}`;
  }
  return `${ETIQUETAS_INCIDENTE[inc.tipo]} — ${rivalNombre ?? "Rival"}`;
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
