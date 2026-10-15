// Pre F y Pre G, sabado 2026-10-17 10:15 en Newman: amistoso vs Los Tilos, "3 tiempos de 40"
// (el campo `formato` se muestra junto a "Amistoso"). Correr con: npx tsx src/scripts/set-amistoso-pre-f-g-f26-tilos.ts
import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const id of ["pre-f-f26", "pre-g-f26"]) {
    const ref = adminDb.collection("partidos").doc(id);
    const d = (await ref.get()).data()!;
    if (d.estado !== "programado") throw new Error(`${id}: estado ${d.estado}`);
    await ref.update({ amistoso: true, formato: "3 tiempos de 40", updatedAt: new Date() });
    console.log(`${id}: vs ${d.rival} ${d.fecha} ${d.hora} -> amistoso, 3 tiempos de 40`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
