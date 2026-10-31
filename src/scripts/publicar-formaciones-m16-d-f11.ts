// Publica la formacion de M16 D de la Fecha 11 (domingo 2026-11-01) que estaba en borrador.
// Correr con: npx tsx src/scripts/publicar-formaciones-m16-d-f11.ts
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const ref = adminDb.collection("partidos").doc("m16-d-f11");
  const d = (await ref.get()).data();
  if (!d || d.estado !== "programado" || (d.enCanchaIds?.length ?? 0) !== 15) {
    console.log(`se saltea (${d?.estado}, titulares=${d?.enCanchaIds?.length})`);
    return;
  }
  await ref.update({ formacionPublicada: true, updatedAt: new Date() });
  console.log(`publica m16-d-f11 vs ${d.rival} (${d.hora})`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
