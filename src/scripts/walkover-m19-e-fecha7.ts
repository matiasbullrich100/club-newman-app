// M19 E vs BACRC E (Fecha 7, domingo 2026-09-27): walkover, BACRC E no se presenta -> Newman gana 8-0.
// Replica registrarWalkover() de la app (estado terminado + resultado + incidente "walkover").
// Correr con: npx tsx src/scripts/walkover-m19-e-fecha7.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");

  const ref = adminDb.collection("partidos").doc("m19-e-f7");
  const d = (await ref.get()).data();
  if (d?.estado !== "programado") throw new Error(`m19-e-f7: estado "${d?.estado}"`);
  const batch = adminDb.batch();
  batch.update(ref, {
    estado: "terminado",
    "resultado.newman": 8,
    "resultado.rival": 0,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(ref.collection("incidentes").doc(), {
    tipo: "walkover",
    equipo: "rival",
    periodo: "1T",
    minuto: 0,
    segundoAbsoluto: 0,
    publicadoPorCuentaId: "script",
    createdAt: Timestamp.now(),
  });
  await batch.commit();
  const n = (await adminDb.collection("partidos").doc("m19-e-f7").get()).data();
  console.log("m19-e-f7", n?.estado, JSON.stringify(n?.resultado), "vs", n?.rival, n?.fecha);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
