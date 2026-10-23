// Publica las formaciones de M19 A / B / C / D / E de la Fecha 10 (domingo 2026-10-25) que estan en borrador.
// Equivale a publicarFormacion() de la app: solo marca formacionPublicada: true en partidos "programado".
// Correr con: npx tsx src/scripts/publicar-formaciones-m19-f10.ts
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const c of ["m19-a", "m19-b", "m19-c", "m19-d", "m19-e"]) {
    const ref = adminDb.collection("partidos").doc(`${c}-f10`);
    const d = (await ref.get()).data();
    if (!d || d.estado !== "programado" || d.formacionPublicada !== false || (d.enCanchaIds?.length ?? 0) !== 15) {
      console.log(`${c}: se saltea (${d?.estado}, publicada=${d?.formacionPublicada})`);
      continue;
    }
    await ref.update({ formacionPublicada: true, updatedAt: new Date() });
    console.log(`publica ${c}-f10 vs ${d.rival}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
