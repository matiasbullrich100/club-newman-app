// Amistoso interno Pre G vs Pre H (jueves 2026-09-24): el horario pasa de 20:00 a 20:30.
// Correr con: npx tsx src/scripts/set-pre-g-h-f23-hora.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const id of ["pre-g-f23", "pre-h-f23"]) {
    const ref = adminDb.collection("partidos").doc(id);
    await ref.update({ hora: "20:30", updatedAt: FieldValue.serverTimestamp() });
    const d = (await ref.get()).data();
    console.log(id, d?.rival, d?.fecha, d?.hora, d?.cancha);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
