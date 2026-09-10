// Borra `numeroCancha` (la cancha PUNTUAL dentro del predio, ej. "1", "3" -- lo unico que el club
// confirma a mano y lo unico que hace aparecer la palabra "Cancha" en la app) de TODOS los
// partidos. Deja intactas `hora` (horarios ya confirmados) y `cancha` (nombre del predio/club
// local, se deriva solo de quien es local y se usa para el "en X" de los partidos ya jugados;
// nunca muestra la palabra "Cancha"). El club carga las canchas despues desde /programar.
// Correr con: npx tsx src/scripts/borrar-canchas.ts            (dry-run: solo lista)
//             npx tsx src/scripts/borrar-canchas.ts --aplicar  (borra de verdad)
// Idempotente: si ya no hay numeroCancha en ningun partido, no hace nada.

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const aplicar = process.argv.includes("--aplicar");
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const snap = await adminDb.collection("partidos").get();
  const conCancha = snap.docs.filter((d) => {
    const p = d.data() as { numeroCancha?: string };
    return !!p.numeroCancha && p.numeroCancha.trim() !== "";
  });

  if (conCancha.length === 0) {
    console.log("Ningun partido tiene numeroCancha cargada. Nada que hacer.");
    return;
  }

  console.log(`Partidos con numeroCancha (${conCancha.length}):`);
  for (const d of conCancha) {
    const p = d.data() as { cancha?: string; numeroCancha?: string; hora?: string };
    console.log(`  ${d.id}  numeroCancha="${p.numeroCancha ?? ""}"  ->  borrar  (hora "${p.hora ?? ""}" y predio "${p.cancha ?? ""}" se mantienen)`);
  }

  if (!aplicar) {
    console.log("\nDry-run. Volve a correr con --aplicar para borrar numeroCancha.");
    return;
  }

  // Firestore limita cada batch a 500 escrituras -- parte en tandas de 400 por las dudas.
  for (let i = 0; i < conCancha.length; i += 400) {
    const batch = adminDb.batch();
    for (const d of conCancha.slice(i, i + 400)) {
      batch.update(d.ref, { numeroCancha: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
  }
  console.log(`\nListo: numeroCancha borrada en ${conCancha.length} partidos. Horarios y predios intactos.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
