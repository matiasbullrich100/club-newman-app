// M15 D tenia Fecha libre el 11/10 (Fecha 9); jugo un amistoso el viernes 2026-10-09 en Olivos y perdio
// 20-40. Mismo criterio que su Fecha 8 (amistoso vs SIC): el partido de la fecha pasa a "terminado" con
// amistoso: true. Sin tries/bonus/formacion (no hay datos).
// Correr con: npx tsx src/scripts/cargar-amistoso-m15-d-olivos.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const ref = adminDb.collection("partidos").doc("m15-d-f9");
  const d = (await ref.get()).data();
  if (d?.estado !== "programado" || d.notaEspecial !== "Fecha libre") throw new Error(`m15-d-f9 inesperado: ${JSON.stringify(d)}`);
  await ref.update({
    fecha: "2026-10-09",
    rival: "Olivos",
    esLocal: false,
    cancha: "Olivos",
    amistoso: true,
    estado: "terminado",
    resultado: { newman: 20, rival: 40 },
    notaEspecial: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const n = (await ref.get()).data();
  console.log(n?.estado, n?.fecha, n?.rival, n?.esLocal ? "(L)" : "(V)", n?.cancha, JSON.stringify(n?.resultado), n?.amistoso ? "AMISTOSO" : "");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
