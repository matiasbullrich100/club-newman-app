// Publica las formaciones de M19 A / C / D vs BACRC (Fecha 7, domingo 2026-10-18) que estan en borrador.
// Correr con: npx tsx src/scripts/publicar-formaciones-m19-f7-bacrc.ts
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const c of ["m19-a", "m19-c", "m19-d"]) {
    const ref = adminDb.collection("partidos").doc(`${c}-f7`);
    const d = (await ref.get()).data();
    if (!d || d.formacionPublicada !== false || (d.enCanchaIds?.length ?? 0) !== 15) {
      console.log(`${c}: se saltea (${d?.estado}, publicada=${d?.formacionPublicada})`);
      continue;
    }
    await ref.update({ formacionPublicada: true, updatedAt: new Date() });
    console.log(`publica ${c}-f7 [${d.estado}] vs ${d.rival}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
