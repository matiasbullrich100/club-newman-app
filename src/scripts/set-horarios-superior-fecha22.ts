// Horarios y sedes de la Fecha 22 de Plantel Superior (sábado 2026-09-12), pasados por el club
// (son EL DATO REAL, pisan lo que hubiera en el fixture).
//  - Casi todo en el Club (cancha "Newman"): Primera, Intermedia, M-22, Pre A/B/C/D vs Regatas.
//  - Pre F y Pre G también en el Club, pero vs SIC (no Regatas).
//  - Pre H juega en CUBA (Cuba Central), de visitante.
//  - Pre E queda LIBRE.
//  - La cancha PUNTUAL (numeroCancha) la confirman unos días antes; se carga luego desde /programar.
// Correr con: npx tsx src/scripts/set-horarios-superior-fecha22.ts

import { config } from "dotenv";
import { resolve } from "path";

const FECHA = 22;

// categoriaId -> { hora, cancha (predio), rival?/esLocal? (si cambian respecto al fixture) }
const HORARIOS: Record<string, { hora: string; cancha: string; rival?: string; esLocal?: boolean }> = {
  "pre-b": { hora: "10:15", cancha: "Newman" },
  "pre-d": { hora: "10:15", cancha: "Newman" },
  "pre-g": { hora: "10:15", cancha: "Newman", rival: "SIC", esLocal: true }, // en el Club, vs SIC
  "pre-a": { hora: "12:00", cancha: "Newman" },
  "pre-c": { hora: "12:00", cancha: "Newman" },
  "pre-f": { hora: "12:00", cancha: "Newman", rival: "SIC", esLocal: true }, // en el Club, vs SIC
  "pre-h": { hora: "12:00", cancha: "CUBA", rival: "CUBA", esLocal: false }, // en Cuba Central, visitante
  "m-22": { hora: "13:45", cancha: "Newman" },
  intermedia: { hora: "13:45", cancha: "Newman" },
  primera: { hora: "15:30", cancha: "Newman" },
};

const LIBRES = ["pre-e"];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { partidoId } = await import("../lib/categorias");
  const { FieldValue } = await import("firebase-admin/firestore");

  const batch = adminDb.batch();

  for (const [categoriaId, { hora, cancha, rival, esLocal }] of Object.entries(HORARIOS)) {
    const ref = adminDb.collection("partidos").doc(partidoId(categoriaId, FECHA));
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId.padEnd(10)} se saltea (${snap.exists ? snap.data()!.estado : "no existe"})`);
      continue;
    }
    const d = snap.data()!;
    const data: FirebaseFirestore.DocumentData = { hora, cancha, updatedAt: FieldValue.serverTimestamp() };
    if (rival) data.rival = rival;
    if (esLocal !== undefined) data.esLocal = esLocal;
    batch.update(ref, data);
    console.log(
      `${categoriaId.padEnd(10)} ${hora}  ${cancha}${rival ? `  vs ${rival}` : ""}${esLocal !== undefined ? `  (local=${esLocal})` : ""}   (antes: ${d.hora ?? "-"} / ${d.cancha ?? "-"} / vs ${d.rival} / local=${d.esLocal})`
    );
  }

  for (const categoriaId of LIBRES) {
    const ref = adminDb.collection("partidos").doc(partidoId(categoriaId, FECHA));
    const snap = await ref.get();
    if (!snap.exists || snap.data()!.estado !== "programado") {
      console.log(`${categoriaId.padEnd(10)} LIBRE: se saltea (${snap.exists ? snap.data()!.estado : "no existe"})`);
      continue;
    }
    batch.update(ref, {
      rival: "Libre",
      notaEspecial: "Fecha libre",
      hora: FieldValue.delete(),
      numeroCancha: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`${categoriaId.padEnd(10)} -> Fecha libre`);
  }

  await batch.commit();
  console.log("\nListo. numeroCancha se carga después desde /programar.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
