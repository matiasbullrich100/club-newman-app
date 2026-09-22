// Borra el horario viejo (heredado del fixture de URBA contra Atl. del Rosario) de M-22 y Pre E,
// que quedo pegado en el corrector de rival/local de la Fecha 23 (set-fixture-fecha23.ts) -- ese
// horario no corresponde al nuevo rival (BAC M22 B / CUBA F). Se vuelve a poner cuando el club lo
// confirme. Correr con: npx tsx src/scripts/clear-hora-fecha23.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const batch = adminDb.batch();
  for (const categoriaId of ["m-22", "pre-e"]) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f23`);
    batch.update(ref, { hora: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
    console.log(`${categoriaId}: hora borrada`);
  }
  await batch.commit();
  console.log("Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
