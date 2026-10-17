// Pre E vs CUBA (Fecha 26, sabado 2026-10-17): gano Newman 15-12. Se carga como "terminado" sin
// incidencias ni liveState (partido que no se siguio en vivo), igual que otros resultados cargados a mano.
// Correr con: npx tsx src/scripts/cargar-resultado-pre-e-f26.ts
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const ref = adminDb.collection("partidos").doc("pre-e-f26");
  const estado = (await ref.get()).data()?.estado;
  if (estado !== "programado") throw new Error(`pre-e-f26: estado "${estado}"`);
  await ref.update({ estado: "terminado", "resultado.newman": 15, "resultado.rival": 12, updatedAt: FieldValue.serverTimestamp() });
  const d = (await ref.get()).data();
  console.log("pre-e-f26", d?.estado, JSON.stringify(d?.resultado), "vs", d?.rival);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
