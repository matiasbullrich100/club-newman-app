// Fechas del playoff del TOP 14 (temporada 2026), segun lo que informo la prensa de URBA: son
// tentativas hasta que URBA las confirme oficialmente. `sede` (por categoria) la muestra /playoff.
// Los primeros 4 de cada tabla clasifican: semifinales 1° vs 4° y 2° vs 3°.

export interface SemifinalPlayoff {
  fecha: string; // ISO yyyy-mm-dd
  cruce: [number, number]; // posiciones de la tabla que se enfrentan
}

export interface PlayoffCategoria {
  semis: SemifinalPlayoff[];
  final?: string; // ISO yyyy-mm-dd; ausente = todavia no informada
  sede?: string;
}

const INTERMEDIA_Y_PRE: PlayoffCategoria = {
  semis: [
    { fecha: "2026-10-24", cruce: [1, 4] },
    { fecha: "2026-10-24", cruce: [2, 3] },
  ],
  final: "2026-11-14",
  sede: "CUBA (Villa de Mayo)",
};

export const PLAYOFF: Record<string, PlayoffCategoria> = {
  primera: {
    semis: [
      { fecha: "2026-10-30", cruce: [1, 4] },
      { fecha: "2026-10-31", cruce: [2, 3] },
    ],
    sede: "Cancha de CASI",
  },
  intermedia: INTERMEDIA_Y_PRE,
  "pre-a": INTERMEDIA_Y_PRE,
  "pre-b": INTERMEDIA_Y_PRE,
  "pre-c": INTERMEDIA_Y_PRE,
  "pre-d": INTERMEDIA_Y_PRE,
  "pre-e": INTERMEDIA_Y_PRE,
  "pre-f": INTERMEDIA_Y_PRE,
};

// "vie 30/10" a partir de un ISO yyyy-mm-dd (sin depender de la zona horaria del servidor).
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  return `${dia} ${d}/${m}`;
}
