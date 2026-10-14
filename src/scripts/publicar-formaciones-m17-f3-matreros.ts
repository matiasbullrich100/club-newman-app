// Publica las formaciones de M17 A y B de la Fecha 3 (vs Los Matreros, 2026-10-14).
// Correr con: npx tsx src/scripts/publicar-formaciones-m17-f3-matreros.ts
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const id of ["m17-a-f3", "m17-b-f3"]) {
    const ref = adminDb.collection("partidos").doc(id);
    const d = (await ref.get()).data() as { rival?: string; estado?: string; enCanchaIds?: string[] };
    if (d.estado !== "programado" || (d.enCanchaIds?.length ?? 0) !== 15) throw new Error(`${id}: no esta listo (${d.estado})`);
    await ref.update({ formacionPublicada: true, updatedAt: new Date() });
    console.log(`${id} vs ${d.rival}: publicada`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
