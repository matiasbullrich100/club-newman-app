import type { Incidente, Resultado } from "@/types/firestore";

// try/try_scrum/try_penal cuentan como "try" para el bonus ofensivo -- conversion/penal/drop
// suman puntos pero no tries.
const TIPOS_TRY = new Set<Incidente["tipo"]>(["try", "try_scrum", "try_penal"]);

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
