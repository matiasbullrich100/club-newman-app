// Fechas del playoff del TOP 14 (temporada 2026), segun lo que informo la prensa de URBA: son
// tentativas hasta que URBA las confirme oficialmente. `sede` (por categoria) la muestra /playoff.
// Los primeros 4 de cada tabla clasifican: semifinales 1° vs 4° y 2° vs 3°.

export interface SemifinalPlayoff {
  fecha?: string; // ISO yyyy-mm-dd; ausente = todavia no informada
  hora?: string; // "HH:MM"; ausente = todavia no informada
  cruce: [number, number]; // posiciones de la tabla que se enfrentan
}

export interface PlayoffCategoria {
  semis: SemifinalPlayoff[];
  final?: string; // ISO yyyy-mm-dd; ausente = todavia no informada
  sede?: string;
  /** Sede de la final si es distinta de la de las semifinales; ausente = la misma `sede` (si hay `final`) o sin informar. */
  sedeFinal?: string;
  /** Hora de la final ("HH:MM"); ausente = todavia sin informar. */
  horaFinal?: string;
  /** Cancha puntual de la final dentro de la sede ("2" -> "CUBA 2"). */
  canchaFinal?: string;
}

// Programa oficial de semifinales de URBA (Intermedia, Pre A-F y M22: viernes 23 y sabado 24/10/2026 en CUBA Villa de
// Mayo, M22 en Hindu). Las dos semifinales de una categoria juegan a la misma hora salvo M22. Primera: fechas de la
// prensa de URBA (vie 30 y sab 31/10, cancha de CASI), horario todavia sin informar.
const cuba = (fecha: string, hora: string, horaFinal: string, canchaFinal: string): PlayoffCategoria => ({
  semis: [
    { fecha, hora, cruce: [1, 4] },
    { fecha, hora, cruce: [2, 3] },
  ],
  final: "2026-11-14",
  horaFinal,
  canchaFinal,
  sede: "CUBA (Villa de Mayo)",
});

export const PLAYOFF: Record<string, PlayoffCategoria> = {
  primera: {
    semis: [
      { fecha: "2026-10-30", cruce: [1, 4] },
      { fecha: "2026-10-31", cruce: [2, 3] },
    ],
    sede: "Cancha de CASI",
    // Final: sabado 7/11 (Newman vs Hindu); sede todavia sin informar.
    final: "2026-11-07",
    horaFinal: "17:10",
    sedeFinal: "CASI",
  },
  intermedia: cuba("2026-10-24", "18:00", "16:00", "1"),
  "pre-a": cuba("2026-10-24", "16:00", "14:00", "2"),
  "pre-b": cuba("2026-10-24", "14:00", "14:00", "3"),
  "pre-c": cuba("2026-10-24", "12:00", "12:00", "3"),
  "pre-d": cuba("2026-10-24", "10:00", "10:00", "2"),
  "pre-e": cuba("2026-10-23", "21:00", "12:00", "1"),
  "pre-f": cuba("2026-10-23", "19:00", "10:00", "3"),
  // M-22: semifinales en Hindu (SIC vs Buenos Aires 21:00 y Newman vs Hindu 19:00); la final, en CUBA (afiche de las finales).
  "m-22": {
    semis: [
      { fecha: "2026-10-23", hora: "21:00", cruce: [1, 4] },
      { fecha: "2026-10-23", hora: "19:00", cruce: [2, 3] },
    ],
    sede: "Hindú",
    final: "2026-11-14",
    sedeFinal: "CUBA (Villa de Mayo)",
    horaFinal: "12:00",
    canchaFinal: "2",
  },
};

// "vie 30/10" a partir de un ISO yyyy-mm-dd (sin depender de la zona horaria del servidor).
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
  return `${dia} ${d}/${m}`;
}
