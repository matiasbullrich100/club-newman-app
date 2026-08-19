// Partido de prueba "pre-a-test-beromama" -- no aparece en ningun fixture/categoria real (solo se
// llega por URL directa), rival Beromama, con el plantel real de Pre A que jugo contra Belgrano
// Athletic (pre-a-f15, 09-08, 22-6) para poder simular cambios con nombres reales. Correr con:
// npm run seed-test-beromama (pisa el partido si ya existia). Al ser un partido de prueba (esta
// en PARTIDOS_DEMO_IDS de match/actions.ts), nada de lo que pase ahi -- tarjetas, minutos --
// contamina las estadisticas reales de esos jugadores, aunque son personas reales. Se resetea a
// 0-0 con el boton "Resetear partido de prueba" en su propia pagina.

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";
import type { JugadorPartido, LiveState, Partido } from "../types/firestore";

const PARTIDO_ID = "pre-a-test-beromama";

// Plantel real de pre-a-f15 (Pre A vs Belgrano Athletic, 22-6 de local, 09-08).
const PLANTEL: { nombre: string; dorsal: string; titular: boolean }[] = [
  { nombre: "Wright James", dorsal: "1", titular: true },
  { nombre: "Pueyrredón Rodrigo", dorsal: "2", titular: true },
  { nombre: "Roggero Francisco", dorsal: "3", titular: true },
  { nombre: "Ureta Jerónimo", dorsal: "4", titular: true },
  { nombre: "Shaw Francisco", dorsal: "5", titular: true },
  { nombre: "Bruzzone Justo", dorsal: "6", titular: true },
  { nombre: "Salinas Juan", dorsal: "7", titular: true },
  { nombre: "Russo Rufino", dorsal: "8", titular: true },
  { nombre: "Bullrich Simón", dorsal: "9", titular: true },
  { nombre: "Jaca Otaño Iñaki", dorsal: "10", titular: true },
  { nombre: "Pereyra Cruz", dorsal: "11", titular: true },
  { nombre: "Butler Bautista", dorsal: "12", titular: true },
  { nombre: "Iribarren Marcos", dorsal: "13", titular: true },
  { nombre: "Silva Alfonso", dorsal: "14", titular: true },
  { nombre: "G. Taboada Santiago", dorsal: "15", titular: true },
  { nombre: "Walker Bautista", dorsal: "16", titular: false },
  { nombre: "Ureta Tomas", dorsal: "17", titular: false },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const partidoRef = adminDb.collection("partidos").doc(PARTIDO_ID);

  const incidentesSnap = await partidoRef.collection("incidentes").get();
  for (const doc of incidentesSnap.docs) await doc.ref.delete();

  const partido: Partido = {
    categoriaId: "pre-a",
    numeroFecha: "test",
    rival: "Beromama",
    esLocal: true,
    cancha: "Cancha 1",
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: PLANTEL.filter((j) => j.titular).map((j) => playerId(j.nombre)),
  };
  await partidoRef.set({ ...partido, createdAt: new Date(), updatedAt: new Date() });

  const liveState: LiveState = { periodo: null, clockRunning: false, clockAnchor: null, accumulatedSeconds: 0 };
  await partidoRef.collection("liveState").doc("state").set(liveState);

  for (const j of PLANTEL) {
    const doc: JugadorPartido = { nombre: j.nombre, dorsal: j.dorsal, titular: j.titular, enCancha: j.titular };
    await partidoRef.collection("plantel").doc(playerId(j.nombre)).set(doc);
  }

  console.log(`Listo: /partido/${PARTIDO_ID} (${PLANTEL.length} jugadores)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
