// M-22 vs BAC M22 B (Fecha 23): walkover, Belgrano pierde 8-0 (Newman suma el 8-0). Replica lo que hace
// registrarWalkover() de la app (estado terminado + resultado + incidente "walkover"), y publica las
// formaciones de Plantel de la Fecha 23 que estaban en borrador.
// Correr con: npx tsx src/scripts/walkover-m22-fecha23-y-publicar.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");

  const m22 = adminDb.collection("partidos").doc("m-22-f23");
  const estado = (await m22.get()).data()?.estado;
  if (estado !== "programado") throw new Error(`m-22-f23: estado "${estado}"`);
  const batch = adminDb.batch();
  batch.update(m22, {
    estado: "terminado",
    "resultado.newman": 8,
    "resultado.rival": 0,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(m22.collection("incidentes").doc(), {
    tipo: "walkover",
    equipo: "rival",
    periodo: "1T",
    minuto: 0,
    segundoAbsoluto: 0,
    publicadoPorCuentaId: "script",
    createdAt: Timestamp.now(),
  });

  for (const c of ["primera", "intermedia", "pre-a", "pre-b", "pre-c", "pre-d", "pre-f"]) {
    const ref = adminDb.collection("partidos").doc(`${c}-f23`);
    const d = (await ref.get()).data();
    if (d?.estado !== "programado") throw new Error(`${c}-f23: estado "${d?.estado}"`);
    batch.update(ref, { formacionPublicada: true, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();

  for (const c of ["m-22", "primera", "intermedia", "pre-a", "pre-b", "pre-c", "pre-d", "pre-f"]) {
    const d = (await adminDb.collection("partidos").doc(`${c}-f23`).get()).data();
    console.log(c.padEnd(10), d?.estado, JSON.stringify(d?.resultado), "publicada:", d?.formacionPublicada);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
