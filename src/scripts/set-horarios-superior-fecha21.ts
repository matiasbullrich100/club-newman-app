// Horarios y sedes de la Fecha 21 de Plantel Superior (sábado), pasados por el club por WhatsApp.
// Todo en La Plata salvo Pre G, que juega en el Club (cancha "Newman"). Pre H NO se toca acá
// (el club avisó que queda libre porque Champa no presenta equipo -- se decide aparte).
// La cancha PUNTUAL (numeroCancha) la confirman unos días antes; se carga después desde /programar.
// Correr con: npx tsx src/scripts/set-horarios-superior-fecha21.ts

import { config } from "dotenv";
import { resolve } from "path";

const FECHA = 21;
// categoriaId -> { hora, cancha (predio) }
const HORARIOS: Record<string, { hora: string; cancha: string }> = {
  "m-22": { hora: "10:15", cancha: "La Plata Rugby Club" },
  "pre-b": { hora: "10:15", cancha: "La Plata Rugby Club" },
  "pre-g": { hora: "10:15", cancha: "Newman" }, // en el Club
  "pre-e": { hora: "12:00", cancha: "La Plata Rugby Club" },
  "pre-c": { hora: "12:00", cancha: "La Plata Rugby Club" },
  "pre-a": { hora: "12:00", cancha: "La Plata Rugby Club" },
  "pre-f": { hora: "13:45", cancha: "La Plata Rugby Club" },
  "pre-d": { hora: "13:45", cancha: "La Plata Rugby Club" },
  intermedia: { hora: "13:45", cancha: "La Plata Rugby Club" },
  primera: { hora: "15:30", cancha: "La Plata Rugby Club" },
};

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { partidoId } = await import("../lib/categorias");
  const { FieldValue } = await import("firebase-admin/firestore");

  const batch = adminDb.batch();
  for (const [categoriaId, { hora, cancha }] of Object.entries(HORARIOS)) {
    const ref = adminDb.collection("partidos").doc(partidoId(categoriaId, FECHA));
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`${categoriaId.padEnd(10)} NO EXISTE ${partidoId(categoriaId, FECHA)} -- se saltea`);
      continue;
    }
    const d = snap.data()!;
    if (d.estado !== "programado") {
      console.log(`${categoriaId.padEnd(10)} estado=${d.estado} (no "programado") -- se saltea`);
      continue;
    }
    batch.update(ref, { hora, cancha, updatedAt: FieldValue.serverTimestamp() });
    console.log(`${categoriaId.padEnd(10)} ${hora}  ${cancha}   (antes: ${d.hora ?? "-"} / ${d.cancha ?? "-"})`);
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
