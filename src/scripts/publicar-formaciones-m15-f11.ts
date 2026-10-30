// Publica las formaciones de M15 A / B / D de la Fecha 11 (domingo 2026-11-01) que estan en borrador.
// Correr con: npx tsx src/scripts/publicar-formaciones-m15-f11.ts
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const c of ["m15-a", "m15-b", "m15-d"]) {
    const ref = adminDb.collection("partidos").doc(`${c}-f11`);
    const d = (await ref.get()).data();
    if (!d || d.estado !== "programado" || d.formacionPublicada !== false || (d.enCanchaIds?.length ?? 0) !== 15) {
      console.log(`${c}: se saltea (${d?.estado}, publicada=${d?.formacionPublicada})`);
      continue;
    }
    await ref.update({ formacionPublicada: true, updatedAt: new Date() });
    console.log(`publica ${c}-f11 vs ${d.rival}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
