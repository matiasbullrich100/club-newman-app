// Horarios y sedes de la Fecha 25 de Plantel Superior (fin de semana del 9-10/10/2026), pasados por
// el club. Todo de visitante: Pre G el viernes en SIC (vs SIC G, segun el fixture de la zona Pre F/G/H);
// el resto el sabado en CASI, en dos sedes: "La Boya" (Pre D/E/F) y "CASI Central" (Primera, Inter, Pre A/B/C, M-22).
// Pre H tiene Fecha libre.
// Correr con: npx tsx src/scripts/set-horarios-superior-fecha25.ts

import { config } from "dotenv";
import { resolve } from "path";

const FECHA = 25;

const DATOS: Record<string, { hora: string; cancha: string; fecha?: string; rival?: string }> = {
  "pre-g": { fecha: "2026-10-09", hora: "20:30", cancha: "SIC Central", rival: "SIC G" },
  "pre-f": { hora: "12:00", cancha: "La Boya" },
  "pre-d": { hora: "12:00", cancha: "La Boya" },
  "pre-e": { hora: "13:45", cancha: "La Boya" },
  "pre-b": { hora: "10:15", cancha: "CASI Central" },
  "pre-a": { hora: "12:00", cancha: "CASI Central" },
  "m-22": { hora: "12:00", cancha: "CASI Central" },
  "pre-c": { hora: "13:45", cancha: "CASI Central" },
  intermedia: { hora: "13:45", cancha: "CASI Central" },
  primera: { hora: "15:30", cancha: "CASI Central" },
};

const LIBRES = ["pre-h"];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  for (const [categoriaId, datos] of Object.entries(DATOS)) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f${FECHA}`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId.padEnd(10)} se saltea (${snap.exists ? snap.data()!.estado : "no existe"})`);
      continue;
    }
    const antes = snap.data()!;
    await ref.update({ ...datos, esLocal: false, updatedAt: FieldValue.serverTimestamp() });
    console.log(
      `${categoriaId.padEnd(10)} ${datos.fecha ?? antes.fecha} ${datos.hora} | ${datos.cancha} | vs ${datos.rival ?? antes.rival}   (antes: ${antes.fecha} ${antes.hora ?? "-"} | ${antes.cancha} | vs ${antes.rival})`
    );
  }

  for (const categoriaId of LIBRES) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f${FECHA}`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId.padEnd(10)} LIBRE: se saltea`);
      continue;
    }
    await ref.update({
      rival: "Libre",
      notaEspecial: "Fecha libre",
      hora: FieldValue.delete(),
      numeroCancha: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`${categoriaId.padEnd(10)} -> Fecha libre`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
