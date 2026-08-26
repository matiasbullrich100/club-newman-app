import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import type { Incidente } from "@/types/firestore";

// Patadas que cuentan para elegir "el pateador de esta categoria" -- las mismas que despues
// activan el atajo en CargaIncidencia (ver TIPOS_CON_PATEADOR_PRESETEADO ahi). Drop queda afuera
// a proposito en los dos lados: mucho menos repetible, no siempre lo patea el mismo.
const TIPOS_PATADA: Incidente["tipo"][] = ["conversion", "penal"];

/**
 * De todos los partidos ya jugados de esta categoria, quien pateo mas veces para Newman -- solo
 * cuenta si ademas esta en el plantel de ESTE partido puntual (sino no tiene sentido sugerirlo).
 * Se llama una sola vez, apenas arranca un partido que todavia no tiene pateadorHabitualId (ver
 * /partido/[partidoId]/page.tsx) -- no hace falta en cada render, ya que el resultado se guarda en
 * el partido apenas el designado lo confirma.
 */
export async function sugerirPateador(categoriaId: string, plantelIds: string[]): Promise<string | null> {
  if (plantelIds.length === 0) return null;
  const partidosSnap = await adminDb.collection("partidos").where("categoriaId", "==", categoriaId).get();
  const conteo = new Map<string, number>();

  await Promise.all(
    partidosSnap.docs.map(async (d) => {
      const incSnap = await d.ref.collection("incidentes").get();
      for (const inc of incSnap.docs) {
        const data = inc.data() as Incidente;
        if (data.equipo === "newman" && TIPOS_PATADA.includes(data.tipo) && data.jugadorId) {
          conteo.set(data.jugadorId, (conteo.get(data.jugadorId) ?? 0) + 1);
        }
      }
    })
  );

  let mejorId: string | null = null;
  let mejorConteo = 0;
  for (const [id, count] of conteo) {
    if (plantelIds.includes(id) && count > mejorConteo) {
      mejorId = id;
      mejorConteo = count;
    }
  }
  return mejorId;
}
