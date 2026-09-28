// Pre D F23 (vs Atl. del Rosario, terminado 99-3): faltaba la conversion del ultimo try (Zirolli
// Santiago, 2T 41'), pateada por Von Wuthenau Facundo (el pateador de todo el partido) -- el
// resultado real fue 101-3, no 99-3. Agrega la incidencia y suma los 2 puntos, mismo patron que
// publicarIncidente() de la app.
// Correr con: npx tsx src/scripts/corregir-conversion-faltante-pre-d-f23.ts

import { config } from "dotenv";
import { resolve } from "path";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");

  const partidoRef = adminDb.collection("partidos").doc("pre-d-f23");
  const d = (await partidoRef.get()).data();
  if (d?.estado !== "terminado") throw new Error(`pre-d-f23: estado "${d?.estado}"`);
  if (d.resultado?.newman !== 99) throw new Error(`resultado.newman inesperado: ${d.resultado?.newman}`);

  const batch = adminDb.batch();
  batch.set(partidoRef.collection("incidentes").doc(), {
    tipo: "conversion",
    equipo: "newman",
    periodo: "2T",
    minuto: 42,
    segundoAbsoluto: 2460,
    puntos: 2,
    jugadorId: "facundo von wuthenau",
    jugadorNombre: "Von Wuthenau Facundo",
    dorsal: "10",
    publicadoPorCuentaId: "script",
    createdAt: Timestamp.now(),
  });
  batch.update(partidoRef, { "resultado.newman": FieldValue.increment(2), updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();

  const n = (await partidoRef.get()).data();
  console.log(n?.estado, JSON.stringify(n?.resultado), "vs", n?.rival);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
