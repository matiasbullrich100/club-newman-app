// Partido de prueba "m15-c-test-cambio" -- mismo espiritu que pre-a-test-cambio (Plantel Superior)
// pero para Juveniles, con el plantel REAL de M15 C que jugo contra Casi (fecha 2), para que se
// sienta igual a un partido real al probar Cambios/correcciones. No aparece en ningun fixture real
// (numeroFecha "test", solo se llega por URL directa) y esta en la lista blanca de
// PARTIDOS_DEMO_IDS (src/lib/partidosPrueba.ts) -- las tarjetas/minutos que genere NUNCA tocan las
// estadisticas reales de estos jugadores (esPartidoDePrueba corta esa escritura en actions.ts),
// asi que se puede jugar/resetear las veces que haga falta sin riesgo. Correr con:
// npm run seed-test-cambio-juveniles (pisa el partido si ya existia).
import { config } from "dotenv";
import { resolve } from "path";
import type { JugadorPartido, LiveState, Partido } from "../types/firestore";

const PARTIDO_ID = "m15-c-test-cambio";

// Copiado de partidos/m15-c-f2/plantel (el que jugo de verdad contra Casi) -- mismos jugadorId,
// nombre, dorsal y titular/suplente.
const PLANTEL: { id: string; nombre: string; dorsal: string; titular: boolean }[] = [
  { id: "matias waisman", nombre: "Waisman, Matias", dorsal: "1", titular: true },
  { id: "juan kaufmann", nombre: "Kaufmann, Juan", dorsal: "2", titular: true },
  { id: "facundo marino", nombre: "Marino, Facundo", dorsal: "3", titular: true },
  { id: "bergada jeronimo santamarina", nombre: "Santamarina Bergadá, Jerónimo", dorsal: "4", titular: true },
  { id: "beccar chiappe pedro varela", nombre: "Chiappe Beccar Varela, Pedro", dorsal: "5", titular: true },
  { id: "aldo morando", nombre: "Morando, Aldo", dorsal: "6", titular: true },
  { id: "cruz juan lopez saubidet", nombre: "Lopez Saubidet, Juan Cruz", dorsal: "7", titular: true },
  { id: "estrada jose maria", nombre: "Estrada, José María", dorsal: "8", titular: true },
  { id: "alegre baldomero", nombre: "Alegre, Baldomero", dorsal: "9", titular: true },
  { id: "barisic milo", nombre: "Barisic, Milo", dorsal: "10", titular: true },
  { id: "berasategui fernando", nombre: "Berasategui, Fernando", dorsal: "11", titular: true },
  { id: "francisco zimmermann", nombre: "Zimmermann, Francisco", dorsal: "12", titular: true },
  { id: "preneste simon", nombre: "Preneste, Simon", dorsal: "13", titular: true },
  { id: "boutell chevallier gonzalo", nombre: "Chevallier Boutell, Gonzalo", dorsal: "14", titular: true },
  { id: "anzorreguy rufino", nombre: "Anzorreguy, Rufino", dorsal: "15", titular: true },
  { id: "lucio micheli restucci", nombre: "Restucci Micheli, Lucio", dorsal: "16", titular: false },
  { id: "bautista palette pueyrredon", nombre: "Palette Pueyrredon, Bautista", dorsal: "17", titular: false },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const partidoRef = adminDb.collection("partidos").doc(PARTIDO_ID);

  const incidentesSnap = await partidoRef.collection("incidentes").get();
  for (const doc of incidentesSnap.docs) await doc.ref.delete();

  const partido: Partido = {
    categoriaId: "m15-c",
    numeroFecha: "test",
    rival: "Rival Test",
    esLocal: true,
    cancha: "Newman",
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: PLANTEL.filter((j) => j.titular).map((j) => j.id),
  };
  await partidoRef.set({ ...partido, createdAt: new Date(), updatedAt: new Date() });

  const liveState: LiveState = { periodo: null, clockRunning: false, clockAnchor: null, accumulatedSeconds: 0 };
  await partidoRef.collection("liveState").doc("state").set(liveState);

  for (const j of PLANTEL) {
    const doc: JugadorPartido = { nombre: j.nombre, dorsal: j.dorsal, titular: j.titular, enCancha: j.titular };
    await partidoRef.collection("plantel").doc(j.id).set(doc);
  }

  console.log(`Listo: /partido/${PARTIDO_ID} (${PLANTEL.length} jugadores, plantel real de M15 C)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
