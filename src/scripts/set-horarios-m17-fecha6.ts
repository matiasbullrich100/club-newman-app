// Corrige rival/horario/local de la Fecha 6 de M17 (domingo 2026-09-13), pasados por el club por
// las fichas de equipo -- son EL DATO REAL, pisan lo que hubiera quedado del fixture de URBA:
//  - M17 A vs SITAS A, 12:30 hs en Newman (el fixture tenía 14:00 -- corregido).
//  - M17 B vs SITAS B, 14:00 hs en Newman (el fixture tenía 12:30 -- corregido).
//  - M17 C vs Los Pinos, 12:30 hs en Newman, LOCAL (el fixture tenía "Pucará D" de visitante a las
//    11:00 -- corregido). Es AMISTOSO (el club arregló este partido para llenar el hueco de
//    Pucará D, no cuenta para la tabla de posiciones).
// Correr con: npx tsx src/scripts/set-horarios-m17-fecha6.ts

import { config } from "dotenv";
import { resolve } from "path";

const NUMERO_FECHA = 6;

const DATOS: Record<string, { hora: string; rival?: string; esLocal?: boolean; amistoso?: boolean }> = {
  "m17-a": { hora: "12:30" },
  "m17-b": { hora: "14:00" },
  "m17-c": { hora: "12:30", rival: "Los Pinos", esLocal: true, amistoso: true },
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { partidoId } = await import("../lib/categorias");
  const { FieldValue } = await import("firebase-admin/firestore");

  const batch = adminDb.batch();

  for (const [categoriaId, { hora, rival, esLocal, amistoso }] of Object.entries(DATOS)) {
    const ref = adminDb.collection("partidos").doc(partidoId(categoriaId, NUMERO_FECHA));
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId.padEnd(10)} se saltea (${snap.exists ? snap.data()!.estado : "no existe"})`);
      continue;
    }
    const d = snap.data()!;
    const data: FirebaseFirestore.DocumentData = { hora, cancha: "Newman", updatedAt: FieldValue.serverTimestamp() };
    if (rival) data.rival = rival;
    if (esLocal !== undefined) data.esLocal = esLocal;
    if (amistoso !== undefined) data.amistoso = amistoso;
    batch.update(ref, data);
    console.log(
      `${categoriaId.padEnd(10)} ${hora}${rival ? `  vs ${rival}` : ""}${esLocal !== undefined ? `  (local=${esLocal})` : ""}${amistoso ? "  (amistoso)" : ""}   (antes: ${d.hora} / vs ${d.rival} / local=${d.esLocal})`
    );
  }

  await batch.commit();
  console.log("\nListo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
