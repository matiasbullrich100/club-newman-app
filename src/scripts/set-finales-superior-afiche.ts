// Afiche oficial "Finales Top 14: Intermedia, Pres y M22" (sabado 14/11 en CUBA). Orden del afiche para los partidos de
// Newman: Pre A = Hindu - Newman (Newman visitante), Pre E = SIC - Newman (Newman visitante), Pre F = Newman - Los Tilos.
// Horarios y canchas: Pre A 14:00 CUBA 2, Pre E 12:00 CUBA 1, Pre F 10:00 CUBA 3. Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/set-finales-superior-afiche.ts
import { config } from "dotenv";
import { resolve } from "path";

const FINALES = [
  { id: "pre-a-f28", esLocal: false, hora: "14:00", numeroCancha: "2" },
  { id: "pre-e-f28", esLocal: false, hora: "12:00", numeroCancha: "1" },
  { id: "pre-f-f28", esLocal: true, hora: "10:00", numeroCancha: "3" },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const f of FINALES) {
    const ref = adminDb.collection("partidos").doc(f.id);
    const d = (await ref.get()).data();
    if (!d || d.fase !== "final" || d.estado !== "programado") throw new Error(`${f.id}: no es una final programada`);
    await ref.update({ esLocal: f.esLocal, hora: f.hora, numeroCancha: f.numeroCancha, updatedAt: new Date() });
    console.log(`${f.id}: ${f.esLocal ? "Newman vs" : "vs Newman:"} ${d.rival}, ${f.hora} hs, CUBA ${f.numeroCancha}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
