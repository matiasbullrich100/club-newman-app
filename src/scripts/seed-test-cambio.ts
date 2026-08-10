// Partido de prueba "pre-a-test-cambio" -- no aparece en ningun fixture/categoria real (solo se
// llega por URL directa), pensado para probar el buscador de "otro jugador" en Cambios sin tocar
// partidos reales. Correr con: npm run seed-test-cambio (pisa el partido si ya existia). Se
// resetea a 0-0 con el boton "Resetear partido de prueba" en su propia pagina (esta en la lista
// blanca de PARTIDOS_DEMO_IDS en match/actions.ts).
import { config } from "dotenv";
import { resolve } from "path";
import type { JugadorPartido, LiveState, Partido } from "../types/firestore";

const PARTIDO_ID = "pre-a-test-cambio";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const partidoRef = adminDb.collection("partidos").doc(PARTIDO_ID);
  const partido: Partido = {
    categoriaId: "pre-a",
    numeroFecha: "test",
    rival: "Rival Test",
    esLocal: true,
    cancha: "Newman",
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: Array.from({ length: 15 }, (_, i) => `${String(i + 1).padStart(2, "0")} test`),
  };
  await partidoRef.set({ ...partido, createdAt: new Date(), updatedAt: new Date() });

  const liveState: LiveState = { periodo: null, clockRunning: false, clockAnchor: null, accumulatedSeconds: 0 };
  await partidoRef.collection("liveState").doc("state").set(liveState);

  const titulares = Array.from({ length: 15 }, (_, i) => ({
    id: `${String(i + 1).padStart(2, "0")} test`,
    doc: { nombre: `Titular, ${String(i + 1).padStart(2, "0")}`, dorsal: String(i + 1), titular: true, enCancha: true } as JugadorPartido,
  }));
  const suplentes = Array.from({ length: 3 }, (_, i) => ({
    id: `${String(i + 16).padStart(2, "0")} test`,
    doc: { nombre: `Suplente, ${String(i + 16).padStart(2, "0")}`, dorsal: String(i + 16), titular: false, enCancha: false } as JugadorPartido,
  }));

  for (const j of [...titulares, ...suplentes]) {
    await partidoRef.collection("plantel").doc(j.id).set(j.doc);
  }

  console.log(`Listo: /partido/${PARTIDO_ID}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
