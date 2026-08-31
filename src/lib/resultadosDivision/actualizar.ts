import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { fetchResultadosDivisionUrba, type FechaResultadosDivisionUrba } from "@/lib/urba";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { grupoDeCategoria } from "@/lib/categorias";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";

export interface ResultadoActualizacionDivision {
  categoriaId: string;
  ok: boolean;
  fechas?: number;
  error?: string;
}

// Baja de URBA los resultados de TODOS los cruces de la zona de cada categoria que tiene Fixt.
// Division y los guarda en resultadosDivision/{categoriaId}. Con esto el Fixt. Division deja de
// cargarse a mano. Lo dispara un cron PROPIO (src/app/api/cron/actualizar-resultados-division/route.ts),
// con horario propio DESPUES de cada jornada -- separado del cron de la tabla de posiciones, que
// corre cada pocos minutos durante los partidos, para no compartir recursos con la app en vivo.
// Script manual: src/scripts/actualizar-resultados-division.ts.
export async function actualizarResultadosDivision(
  grupo?: "superior" | "juveniles"
): Promise<ResultadoActualizacionDivision[]> {
  const entradas = Object.entries(TORNEOS_URBA).filter(
    ([categoriaId]) =>
      tieneFixtureDivision(categoriaId) && (!grupo || grupoDeCategoria(categoriaId).grupo === grupo)
  );

  // Varias categorias pueden compartir championshipId (ej. Pre F/G/H) -- se baja cada torneo UNA
  // sola vez, y en paralelo (no encadenar ~16 fetches de varios cientos de KB de a uno).
  const torneosUnicos = [...new Set(entradas.map(([, t]) => t.championshipId))];
  const porTorneo = new Map<
    number,
    { fechas: Record<string, FechaResultadosDivisionUrba> } | { error: string }
  >();
  await Promise.all(
    torneosUnicos.map(async (championshipId) => {
      try {
        porTorneo.set(championshipId, { fechas: await fetchResultadosDivisionUrba(championshipId) });
      } catch (e) {
        porTorneo.set(championshipId, { error: e instanceof Error ? e.message : String(e) });
      }
    })
  );

  const resultados: ResultadoActualizacionDivision[] = [];
  for (const [categoriaId, { championshipId }] of entradas) {
    const datos = porTorneo.get(championshipId);
    if (!datos || "error" in datos) {
      resultados.push({ categoriaId, ok: false, error: datos?.error ?? "sin datos" });
      continue;
    }
    try {
      await adminDb.collection("resultadosDivision").doc(categoriaId).set({
        championshipId,
        fechas: datos.fechas,
        updatedAt: FieldValue.serverTimestamp(),
      });
      resultados.push({ categoriaId, ok: true, fechas: Object.keys(datos.fechas).length });
    } catch (e) {
      resultados.push({ categoriaId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return resultados;
}
