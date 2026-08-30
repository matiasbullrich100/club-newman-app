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
// Division y los guarda en resultadosDivision/{categoriaId}. Lo dispara el MISMO cron que la tabla
// de posiciones (src/app/api/cron/actualizar-posiciones/route.ts) -- misma cadencia sabado
// (Superior) / domingo (Juveniles) -- y el script manual src/scripts/actualizar-resultados-division.ts.
// Con esto el Fixt. Division deja de cargarse a mano.
export async function actualizarResultadosDivision(
  grupo?: "superior" | "juveniles"
): Promise<ResultadoActualizacionDivision[]> {
  const resultados: ResultadoActualizacionDivision[] = [];
  const cachePorTorneo = new Map<number, Record<string, FechaResultadosDivisionUrba>>();

  const entradas = Object.entries(TORNEOS_URBA).filter(
    ([categoriaId]) =>
      tieneFixtureDivision(categoriaId) && (!grupo || grupoDeCategoria(categoriaId).grupo === grupo)
  );

  for (const [categoriaId, { championshipId }] of entradas) {
    try {
      let fechas = cachePorTorneo.get(championshipId);
      if (!fechas) {
        fechas = await fetchResultadosDivisionUrba(championshipId);
        cachePorTorneo.set(championshipId, fechas);
      }
      await adminDb.collection("resultadosDivision").doc(categoriaId).set({
        championshipId,
        fechas,
        updatedAt: FieldValue.serverTimestamp(),
      });
      resultados.push({ categoriaId, ok: true, fechas: Object.keys(fechas).length });
    } catch (e) {
      resultados.push({ categoriaId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return resultados;
}
