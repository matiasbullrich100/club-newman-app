// Publica (formacionPublicada: true) la formacion de la final del Nacional de Clubes de Primera vs Tala RC (21/11), que se
// cargaron como borrador con cargar-final-nacional-primera.ts. Solo si el partido sigue "programado" y tiene formacion.
// Correr con: npx tsx src/scripts/publicar-final-nacional-primera.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  for (const id of ["primera-f29"]) {
    const ref = adminDb.collection("partidos").doc(id);
    const p = (await ref.get()).data() as { estado?: string; fase?: string; enCanchaIds?: string[]; formacionPublicada?: boolean };
    if (p.fase !== "final" || p.estado !== "programado" || (p.enCanchaIds ?? []).length === 0) {
      console.warn(`SALTEADO ${id}: fase=${p.fase} estado=${p.estado} enCancha=${p.enCanchaIds?.length ?? 0}`);
      continue;
    }
    console.log(`${id}: ${p.formacionPublicada ? "ya estaba publicada" : "se publica"}`);
    if (!dryRun) await ref.update({ formacionPublicada: true, updatedAt: FieldValue.serverTimestamp() });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
