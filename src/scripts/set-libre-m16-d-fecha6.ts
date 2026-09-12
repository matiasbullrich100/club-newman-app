// M16 D tiene Fecha libre en la Fecha 6 (domingo 2026-09-13) -- Alumni D no presenta equipo. Pasa
// el partido a "Fecha libre" (rival "Libre", notaEspecial), sin horario ni cancha. Correr con:
// npx tsx src/scripts/set-libre-m16-d-fecha6.ts

import { config } from "dotenv";
import { resolve } from "path";

const NUMERO_FECHA = 6;
const CATEGORIA_ID = "m16-d";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { partidoId } = await import("../lib/categorias");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ref = adminDb.collection("partidos").doc(partidoId(CATEGORIA_ID, NUMERO_FECHA));
  const snap = await ref.get();
  if (!snap.exists || snap.data()!.estado !== "programado") {
    console.log(`${CATEGORIA_ID} se saltea (${snap.exists ? snap.data()!.estado : "no existe"})`);
    return;
  }

  await ref.update({
    rival: "Libre",
    notaEspecial: "Fecha libre",
    hora: FieldValue.delete(),
    numeroCancha: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`${CATEGORIA_ID} -> Fecha libre`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
