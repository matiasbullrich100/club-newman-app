// Horarios y cancha de las finales de Newman del sabado 14/11 en CUBA (Fecha 28, fase "final"), segun lo informado por el
// club: Pre A 14:00 cancha 2, Pre E 12:00 vs SIC cancha 1, Pre F 10:00 vs Los Tilos cancha 3. (Los horarios de las finales
// sin Newman -- Inter 16:00, Pre B 12:00, Pre C 10:00 -- estan en PLAYOFF, src/lib/playoff.ts.)
// Idempotente; solo "programado". Correr con: npx tsx src/scripts/set-horarios-finales-superior.ts
import { config } from "dotenv";
import { resolve } from "path";

const FINALES = [
  { id: "pre-a-f28", hora: "14:00", numeroCancha: "2" },
  { id: "pre-e-f28", hora: "12:00", numeroCancha: "1" },
  { id: "pre-f-f28", hora: "10:00", numeroCancha: "3" },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const f of FINALES) {
    const ref = adminDb.collection("partidos").doc(f.id);
    const d = (await ref.get()).data();
    if (!d || d.fase !== "final" || d.estado !== "programado") throw new Error(`${f.id}: no es una final programada`);
    await ref.update({ hora: f.hora, numeroCancha: f.numeroCancha, updatedAt: new Date() });
    console.log(`${f.id} vs ${d.rival}: ${f.hora} hs, cancha ${f.numeroCancha}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
