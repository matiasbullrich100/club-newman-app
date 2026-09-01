// Recalcula resultado.triesNewman / resultado.triesRival de UN partido puntual desde sus
// incidencias (lo mismo que hace terminarPartido). Util para arreglar un partido en curso que
// venia de antes de que el contador existiera, o para forzar la sincronizacion.
//
// Correr con: npm run recontar-tries-partido <partidoId>

import { config } from "dotenv";
import { resolve } from "path";
import type { Incidente } from "../types/firestore";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const partidoId = process.argv[2];
  if (!partidoId) throw new Error("Falta el partidoId. Ej: npm run recontar-tries-partido pre-a-test-beromama");

  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const { contarTries, esTry } = await import("../lib/match/bonus");

  console.log(`diag: esTry("try") = ${esTry("try")}, esTry("conversion") = ${esTry("conversion")}`);

  const ref = adminDb.collection("partidos").doc(partidoId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`No existe partidos/${partidoId}`);
  const antes = snap.data()?.resultado ?? {};

  const incSnap = await ref.collection("incidentes").get();
  const incidentes = incSnap.docs.map((d) => d.data() as Incidente);
  const { triesNewman, triesRival } = contarTries(incidentes);

  console.log(`incidencias: ${incidentes.length} | tries newman=${triesNewman} rival=${triesRival}`);
  console.log(`resultado antes: ${JSON.stringify(antes)}`);

  await ref.update({
    "resultado.triesNewman": triesNewman,
    "resultado.triesRival": triesRival,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log("Listo. resultado.triesNewman/triesRival actualizados.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
