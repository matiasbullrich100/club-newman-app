import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { fixtureDivisionDe, numeroFechasDivisionDe, type CategoriaConFixtureDivision, type FechaDivision } from "@/lib/fixtureDivision";
import type { FechaResultadosDivisionUrba } from "@/lib/urba";

// Igual que fixtureDivisionDe pero, si hay resultados frescos de URBA para esa fecha en
// resultadosDivision/{categoriaId} (los baja el cron, ver ./actualizar.ts), los usa en vez del
// JSON estatico. Si Firestore no tiene nada todavia, cae al comportamiento de siempre
// (JSON historico -> fixture sin resultados). Solo la vista de detalle de una fecha necesita esto;
// el picker de fechas se sigue armando con fixtureDivisionDe (solo mira el calendario).
export async function fixtureDivisionConResultados(
  categoriaId: CategoriaConFixtureDivision,
  numeroFecha: number
): Promise<FechaDivision | null> {
  let override: { fecha: string | null; partidos: FechaResultadosDivisionUrba["partidos"] } | undefined;
  try {
    const snap = await adminDb.collection("resultadosDivision").doc(categoriaId).get();
    const fechas = snap.exists
      ? (snap.data()?.fechas as Record<string, FechaResultadosDivisionUrba> | undefined)
      : undefined;
    override = fechas?.[String(numeroFecha)];
  } catch {
    override = undefined; // sin Firestore o error de red: se usa el JSON
  }
  return fixtureDivisionDe(categoriaId, numeroFecha, override);
}

export interface FechaDivisionNumerada extends FechaDivision {
  numeroFecha: number;
}

// Todas las fechas de la zona (calendario completo), cada una con sus resultados frescos de URBA
// si ya se bajaron (una sola lectura del doc resultadosDivision/{categoriaId}, no una por fecha).
// Para la vista de Cruces, que necesita cruzar todo el fixture de la division de un saque.
export async function fixtureDivisionCompleto(categoriaId: CategoriaConFixtureDivision): Promise<FechaDivisionNumerada[]> {
  let fechasOverride: Record<string, FechaResultadosDivisionUrba> | undefined;
  try {
    const snap = await adminDb.collection("resultadosDivision").doc(categoriaId).get();
    fechasOverride = snap.exists ? (snap.data()?.fechas as Record<string, FechaResultadosDivisionUrba> | undefined) : undefined;
  } catch {
    fechasOverride = undefined;
  }
  const total = numeroFechasDivisionDe(categoriaId);
  const salida: FechaDivisionNumerada[] = [];
  for (let n = 1; n <= total; n++) {
    const datos = fixtureDivisionDe(categoriaId, n, fechasOverride?.[String(n)]);
    if (datos) salida.push({ ...datos, numeroFecha: n });
  }
  return salida;
}
