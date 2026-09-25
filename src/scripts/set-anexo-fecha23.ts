// Pre C y Pre D (Fecha 23, sabado 2026-09-26) juegan en el Anexo de Atletico del Rosario; el resto
// (Primera, Inter, Pre A, Pre B) en la sede central, que se deja como "Atlético del Rosario".
// Correr con: npx tsx src/scripts/set-anexo-fecha23.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const c of ["pre-c", "pre-d"]) {
    const ref = adminDb.collection("partidos").doc(`${c}-f23`);
    await ref.update({ cancha: "Atlético del Rosario - Anexo", updatedAt: FieldValue.serverTimestamp() });
  }
  for (const c of ["primera", "intermedia", "pre-a", "pre-b", "pre-c", "pre-d"]) {
    const d = (await adminDb.collection("partidos").doc(`${c}-f23`).get()).data();
    console.log(c.padEnd(10), d?.hora, d?.esLocal ? "(L)" : "(V)", d?.rival, "|", d?.cancha);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
