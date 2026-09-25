// Horarios de la Fecha 23 de Plantel Superior (sabado 2026-09-26), pasados por el club.
// Solo horarios -- la cancha/local-visitante de Anexo (Pre C, Pre D) se define aparte.
// Correr con: npx tsx src/scripts/set-horarios-superior-fecha23.ts

import { config } from "dotenv";
import { resolve } from "path";

const HORAS: Record<string, string> = {
  "pre-b": "10:15",
  "pre-a": "12:00",
  intermedia: "13:45",
  primera: "15:30",
  "pre-c": "10:00",
  "pre-d": "12:00",
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const [categoriaId, hora] of Object.entries(HORAS)) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f23`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId} se saltea`);
      continue;
    }
    await ref.update({ hora, updatedAt: FieldValue.serverTimestamp() });
    console.log(`${categoriaId.padEnd(10)} ${snap.data()!.hora ?? "-"} -> ${hora}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
