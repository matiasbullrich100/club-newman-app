import type { Incidente } from "@/types/firestore";

export const ETIQUETAS_INCIDENTE: Record<Incidente["tipo"], string> = {
  try: "Try",
  conversion: "Conversión",
  penal: "Penal",
  drop: "Drop",
  try_penal: "Try Penal",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
  tarjeta_azul: "Tarjeta azul",
  cambio: "Cambio",
  lesion: "Lesión",
};

export function describirIncidente(inc: Incidente): string {
  if (inc.tipo === "cambio") {
    return `Sale ${inc.jugadorSaleNombre ?? "?"}, entra ${inc.jugadorEntraNombre ?? "?"}`;
  }
  const quien = inc.equipo === "newman" ? inc.jugadorNombre ?? "Newman" : "Rival";
  return `${ETIQUETAS_INCIDENTE[inc.tipo]} — ${quien}`;
}
