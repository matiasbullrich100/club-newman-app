import type { Incidente, Resultado } from "@/types/firestore";

// try/try_scrum/try_penal cuentan como "try" para el bonus ofensivo -- conversion/penal/drop
// suman puntos pero no tries.
const TIPOS_TRY = new Set<Incidente["tipo"]>(["try", "try_scrum", "try_penal"]);

export function esTry(tipo: Incidente["tipo"]): boolean {
  return TIPOS_TRY.has(tipo);
}

// Cuenta los tries de cada equipo. Se usa para el "(4T)" al lado del marcador -- tanto en vivo
// (contador incremental en actions.ts) como al terminar (recalculo exacto desde las incidencias).
export function contarTries(
  incidentes: Pick<Incidente, "tipo" | "equipo">[]
): { triesNewman: number; triesRival: number } {
  let triesNewman = 0;
  let triesRival = 0;
  for (const inc of incidentes) {
    if (!TIPOS_TRY.has(inc.tipo)) continue;
    if (inc.equipo === "newman") triesNewman++;
    else if (inc.equipo === "rival") triesRival++;
  }
  return { triesNewman, triesRival };
}

/**
 * Bonus ofensivo: 3 tries o mas de diferencia contra el rival, sin importar el resultado.
 * Bonus defensivo: perder por 7 puntos o menos. Un equipo puede tener los dos en el mismo
 * partido (ej. mete varios tries pero el rival gana igual por poco a fuerza de penales) -- un
 * solo booleano alcanza porque en esta app solo se usa para el indicador "(B)" del resultado, no
 * para calcular puntos de tabla (esos ya vienen calculados de la tabla oficial de URBA).
 */
export function calcularBonus(
  incidentes: Pick<Incidente, "tipo" | "equipo">[],
  resultado: Pick<Resultado, "newman" | "rival">
): { bonusNewman: boolean; bonusRival: boolean } {
  let triesNewman = 0;
  let triesRival = 0;
  for (const inc of incidentes) {
    if (!TIPOS_TRY.has(inc.tipo)) continue;
    if (inc.equipo === "newman") triesNewman++;
    else if (inc.equipo === "rival") triesRival++;
  }

  const bonusOfensivoNewman = triesNewman - triesRival >= 3;
  const bonusOfensivoRival = triesRival - triesNewman >= 3;
  const bonusDefensivoNewman = resultado.rival > resultado.newman && resultado.rival - resultado.newman <= 7;
  const bonusDefensivoRival = resultado.newman > resultado.rival && resultado.newman - resultado.rival <= 7;

  return {
    bonusNewman: bonusOfensivoNewman || bonusDefensivoNewman,
    bonusRival: bonusOfensivoRival || bonusDefensivoRival,
  };
}
