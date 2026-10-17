// Canchas puntuales (numeroCancha) de la Fecha 26 de Plantel Superior (sabado 2026-10-17 en Newman), leidas
// del pizarron del club: Pre D 3, Pre B 2, Pre E 3, Pre C 2, Pre A 1, M-22 2, Inter 1, Primera 1.
// Pre F y Pre G (vs Tilos): cancha 4 (el casillero del pizarron estaba borroneado; confirmado por el club).
// Correr con: npx tsx src/scripts/set-canchas-superior-fecha26.ts
import { config } from "dotenv";
import { resolve } from "path";

const CANCHAS: Record<string, string> = {
  "pre-f": "4",
  "pre-g": "4",
  "pre-d": "3",
  "pre-b": "2",
  "pre-e": "3",
  "pre-c": "2",
  "pre-a": "1",
  "m-22": "2",
  intermedia: "1",
  primera: "1",
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const [cat, n] of Object.entries(CANCHAS)) {
    const ref = adminDb.collection("partidos").doc(`${cat}-f26`);
    const d = (await ref.get()).data();
    if (!d || d.estado !== "programado" || d.fecha !== "2026-10-17") {
      console.log(`${cat}: se saltea (${d?.estado}, ${d?.fecha})`);
      continue;
    }
    await ref.update({ numeroCancha: n, updatedAt: new Date() });
    console.log(`${cat}-f26 ${d.hora} vs ${d.rival}: cancha ${d.numeroCancha ?? "-"} -> ${n}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
