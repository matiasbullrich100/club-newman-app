// Crea 2 partidos de prueba mas (ademas de demo-partido-1) para poder ver como se ve la home
// cuando hay varios partidos en vivo al mismo tiempo, en categorias reales (M-22 y Pre A).
// No pisa el fixture real: usa IDs propios (demo-partido-2/3), no "m-22-fN"/"pre-a-fN".
// Correr con: npm run seed-demo-extra

import { config } from "dotenv";
import { resolve } from "path";
import type { JugadorPartido, LiveState, Partido } from "../types/firestore";

const PARTIDOS_DEMO_EXTRA: { id: string; categoriaId: string }[] = [
  { id: "demo-partido-2", categoriaId: "m-22" },
  { id: "demo-partido-3", categoriaId: "pre-a" },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { playerId } = await import("../lib/players");

  const titulares = Array.from({ length: 15 }, (_, i) => ({
    nombre: `Jugador ${String(i + 1).padStart(2, "0")}`,
    dorsal: String(i + 1),
    titular: true,
  }));
  const suplentes = Array.from({ length: 8 }, (_, i) => ({
    nombre: `Jugador ${String(i + 16).padStart(2, "0")}`,
    dorsal: String(i + 16),
    titular: false,
  }));
  const plantel = [...titulares, ...suplentes];

  for (const { id, categoriaId } of PARTIDOS_DEMO_EXTRA) {
    const partidoRef = adminDb.collection("partidos").doc(id);
    const existente = await partidoRef.get();
    if (existente.exists) {
      console.log(`Ya existe ${id}, no se vuelve a sembrar.`);
      continue;
    }

    console.log(`Sembrando ${id} (${categoriaId})...`);
    const batch = adminDb.batch();

    const partido: Partido = {
      categoriaId,
      numeroFecha: "demo",
      rival: "Beromama",
      esLocal: true,
      cancha: "Cancha 1",
      estado: "programado",
      resultado: { newman: 0, rival: 0 },
      enCanchaIds: titulares.map((j) => playerId(j.nombre)),
    };
    batch.set(partidoRef, { ...partido, createdAt: new Date(), updatedAt: new Date() });

    const liveState: LiveState = { periodo: null, clockRunning: false, clockAnchor: null, accumulatedSeconds: 0 };
    batch.set(partidoRef.collection("liveState").doc("state"), liveState);

    for (const jugador of plantel) {
      const jugadorId = playerId(jugador.nombre);
      const doc: JugadorPartido = {
        nombre: jugador.nombre,
        dorsal: jugador.dorsal,
        titular: jugador.titular,
        enCancha: jugador.titular,
      };
      batch.set(partidoRef.collection("plantel").doc(jugadorId), doc);
    }

    await batch.commit();
  }

  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
