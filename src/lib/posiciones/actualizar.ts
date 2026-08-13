import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { fetchPosicionesUrba } from "@/lib/urba";
import { TORNEOS_URBA } from "@/lib/torneos-urba";

export interface ResultadoActualizacion {
  categoriaId: string;
  ok: boolean;
  error?: string;
}

// Llamado por el cron semanal (src/app/api/cron/actualizar-posiciones/route.ts) y por el script
// manual (src/scripts/actualizar-posiciones.ts) -- misma logica, dos disparadores.
export async function actualizarPosiciones(): Promise<ResultadoActualizacion[]> {
  const resultados: ResultadoActualizacion[] = [];

  for (const [categoriaId, { championshipId, equipoNombre }] of Object.entries(TORNEOS_URBA)) {
    try {
      const { championshipName, filas } = await fetchPosicionesUrba(championshipId);
      await adminDb.collection("posiciones").doc(categoriaId).set({
        championshipId,
        championshipName,
        nuestroEquipo: equipoNombre,
        filas,
        updatedAt: FieldValue.serverTimestamp(),
      });
      resultados.push({ categoriaId, ok: true });
    } catch (e) {
      resultados.push({ categoriaId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return resultados;
}
