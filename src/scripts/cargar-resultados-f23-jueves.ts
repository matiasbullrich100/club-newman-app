// Carga los resultados del jueves 2026-09-24 (partidos que no se siguieron en vivo), como
// "terminado" sin liveState/incidencias: Pre E 50 - CUBA F 14, Pre G 78 - Pre H 14 (amistoso interno).
// Correr con: npx tsx src/scripts/cargar-resultados-f23-jueves.ts

import { config } from "dotenv";
import { resolve } from "path";

const RESULTADOS: Record<string, { newman: number; rival: number }> = {
  "pre-e-f23": { newman: 50, rival: 14 },
  "pre-g-f23": { newman: 78, rival: 14 },
  "pre-h-f23": { newman: 14, rival: 78 },
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const [id, r] of Object.entries(RESULTADOS)) {
    const ref = adminDb.collection("partidos").doc(id);
    const estado = (await ref.get()).data()?.estado;
    if (estado !== "programado") throw new Error(`${id}: estado "${estado}"`);
    await ref.update({
      estado: "terminado",
      "resultado.newman": r.newman,
      "resultado.rival": r.rival,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const d = (await ref.get()).data();
    console.log(id, d?.estado, JSON.stringify(d?.resultado), "vs", d?.rival);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
