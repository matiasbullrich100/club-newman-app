import type { Periodo } from "@/types/firestore";

export interface CambioEvento {
  periodo: Periodo;
  minuto: number; // ya relativo al inicio de su período (ver clock.ts)
  jugadorSaleId?: string;
  jugadorEntraId?: string;
}

export interface JugadorInput {
  jugadorId: string;
  titular: boolean;
}

export interface MinutosResultado {
  minutos1T: number;
  minutos2T: number;
}

/**
 * Minutos jugados por período a partir del registro de cambios.
 * El estado "en cancha" es continuo entre tiempos: si un titular sale en el 1T y nadie lo
 * vuelve a ingresar, arranca el 2T afuera (no se resetea a "titular = en cancha" en cada
 * período). Soporta más de una entrada/salida por jugador en el mismo tiempo.
 */
export function calcularMinutos(
  plantel: JugadorInput[],
  cambios: CambioEvento[],
  period1DurationMin: number,
  period2DurationMin: number
): Record<string, MinutosResultado> {
  const resultado: Record<string, MinutosResultado> = {};

  for (const jugador of plantel) {
    const primerTiempo = simularPeriodo(jugador.jugadorId, jugador.titular, cambios, "1T", period1DurationMin);
    const segundoTiempo = simularPeriodo(
      jugador.jugadorId,
      primerTiempo.enCanchaAlFinal,
      cambios,
      "2T",
      period2DurationMin
    );
    resultado[jugador.jugadorId] = {
      minutos1T: primerTiempo.minutos,
      minutos2T: segundoTiempo.minutos,
    };
  }

  return resultado;
}

function simularPeriodo(
  jugadorId: string,
  enCanchaAlEmpezar: boolean,
  cambios: CambioEvento[],
  periodo: Periodo,
  duracionMin: number
): { minutos: number; enCanchaAlFinal: boolean } {
  if (duracionMin <= 0) return { minutos: 0, enCanchaAlFinal: enCanchaAlEmpezar };

  type Evento = { minuto: number; tipo: "sale" | "entra" };
  const eventos: Evento[] = [];
  for (const c of cambios) {
    if (c.periodo !== periodo) continue;
    if (c.jugadorSaleId === jugadorId) eventos.push({ minuto: c.minuto, tipo: "sale" });
    if (c.jugadorEntraId === jugadorId) eventos.push({ minuto: c.minuto, tipo: "entra" });
  }
  eventos.sort((a, b) => a.minuto - b.minuto);

  let minutos = 0;
  let enCancha = enCanchaAlEmpezar;
  let desde = 0;

  for (const evento of eventos) {
    if (evento.tipo === "sale" && enCancha) {
      minutos += evento.minuto - desde;
      enCancha = false;
    } else if (evento.tipo === "entra" && !enCancha) {
      desde = evento.minuto;
      enCancha = true;
    }
  }

  if (enCancha) {
    minutos += duracionMin - desde;
  }

  return { minutos: Math.max(0, Math.round(minutos)), enCanchaAlFinal: enCancha };
}
