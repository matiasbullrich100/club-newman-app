// Resetea demo-partido-1 a estado "programado" para volver a probar el flujo del Designado
// desde cero. Borra incidencias, reinicia el reloj y el plantel (enCancha = titular).
// Correr con: npx tsx src/scripts/reset-demo.ts

import { config } from "dotenv";
import { resolve } from "path";

const PARTIDO_ID = "demo-partido-1";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const partidoRef = adminDb.collection("partidos").doc(PARTIDO_ID);
  const partidoSnap = await partidoRef.get();
  if (!partidoSnap.exists) {
    console.log(`${PARTIDO_ID} no existe.`);
    return;
  }

  const plantelSnap = await partidoRef.collection("plantel").get();
  const incidentesSnap = await partidoRef.collection("incidentes").get();

  const batch = adminDb.batch();

  const titularesIds = plantelSnap.docs.filter((d) => d.data().titular).map((d) => d.id);
  batch.update(partidoRef, {
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: titularesIds,
    updatedAt: new Date(),
  });

  batch.set(partidoRef.collection("liveState").doc("state"), {
    periodo: null,
    clockRunning: false,
    clockAnchor: null,
    accumulatedSeconds: 0,
  });

  for (const doc of plantelSnap.docs) {
    const titular = doc.data().titular as boolean;
    batch.update(doc.ref, {
      enCancha: titular,
      minutosJugados1T: 0,
      minutosJugados2T: 0,
    });
  }

  for (const doc of incidentesSnap.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
  console.log(`Listo. ${PARTIDO_ID} reseteado a "programado", ${incidentesSnap.size} incidencias borradas.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
