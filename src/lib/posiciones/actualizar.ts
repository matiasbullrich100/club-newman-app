import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { fetchPosicionesUrba } from "@/lib/urba";
import { TORNEOS_URBA } from "@/lib/torneos-urba";
import { grupoDeCategoria } from "@/lib/categorias";
import { tieneFixtureDivision } from "@/lib/fixtureDivision";
import { actualizarResultadosDivision } from "@/lib/resultadosDivision/actualizar";

export interface ResultadoActualizacion {
  categoriaId: string;
  ok: boolean;
  error?: string;
}

function maxJugados(filas: { jugados?: number }[] | undefined): number {
  if (!filas || filas.length === 0) return 0;
  return Math.max(...filas.map((f) => f.jugados ?? 0));
}

// Llamado por el cron de GitHub Actions (src/app/api/cron/actualizar-posiciones/route.ts) y por
// el script manual (src/scripts/actualizar-posiciones.ts) -- misma logica, dos disparadores.
// `grupo` filtra que categorias tocar: el cron pega los sabados solo a Plantel Superior (juegan
// sabado) y los domingos solo a Juveniles (juegan domingo), asi cada corrida es liviana y no
// pisa datos de categorias que ese dia no jugaron. Sin `grupo`, actualiza todo (uso del script
// manual).
//
// Ademas: si una categoria paso a tener MAS fechas jugadas que la ultima vez (se jugo una fecha
// nueva desde la corrida anterior), se refresca tambien el Fixt. Division de ESA categoria en la
// misma corrida -- asi la tabla y el Fixt. Division nunca quedan desfasados (el cron pesado de
// resultados-division sigue existiendo aparte para el repaso nocturno, pero no es la unica via).
export async function actualizarPosiciones(grupo?: "superior" | "juveniles"): Promise<ResultadoActualizacion[]> {
  const resultados: ResultadoActualizacion[] = [];
  const conFechaNueva = new Set<string>();

  const entradas = Object.entries(TORNEOS_URBA).filter(
    ([categoriaId]) => !grupo || grupoDeCategoria(categoriaId).grupo === grupo
  );

  for (const [categoriaId, { championshipId, equipoNombre }] of entradas) {
    try {
      const ref = adminDb.collection("posiciones").doc(categoriaId);
      const jugadosAntes = maxJugados((await ref.get()).data()?.filas);
      const { championshipName, filas } = await fetchPosicionesUrba(championshipId);
      await ref.set({
        championshipId,
        championshipName,
        nuestroEquipo: equipoNombre,
        filas,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (maxJugados(filas) > jugadosAntes && tieneFixtureDivision(categoriaId)) {
        conFechaNueva.add(categoriaId);
      }
      resultados.push({ categoriaId, ok: true });
    } catch (e) {
      resultados.push({ categoriaId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (conFechaNueva.size > 0) {
    // Solo las categorias con fecha nueva -> uno o dos fetches pesados de URBA, no los ~16.
    await actualizarResultadosDivision(undefined, [...conFechaNueva]).catch(() => {});
  }

  return resultados;
}
