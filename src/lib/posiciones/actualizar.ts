import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { fetchPosicionesUrba } from "@/lib/urba";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { grupoDeCategoria } from "@/lib/categorias";

export interface ResultadoActualizacion {
  categoriaId: string;
  ok: boolean;
  error?: string;
}

// Llamado por el cron de GitHub Actions (src/app/api/cron/actualizar-posiciones/route.ts) y por
// el script manual (src/scripts/actualizar-posiciones.ts) -- misma logica, dos disparadores.
// `grupo` filtra que categorias tocar: el cron pega los sabados solo a Plantel Superior (juegan
// sabado) y los domingos solo a Juveniles (juegan domingo), asi cada corrida es liviana y no
// pisa datos de categorias que ese dia no jugaron. Sin `grupo`, actualiza todo (uso del script
// manual).
export async function actualizarPosiciones(grupo?: "superior" | "juveniles"): Promise<ResultadoActualizacion[]> {
  const resultados: ResultadoActualizacion[] = [];

  const entradas = Object.entries(TORNEOS_URBA).filter(
    ([categoriaId]) => !grupo || grupoDeCategoria(categoriaId).grupo === grupo
  );

  for (const [categoriaId, { championshipId, equipoNombre }] of entradas) {
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
