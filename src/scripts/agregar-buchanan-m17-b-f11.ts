// M17 B vs Lomas Athletic B (2026-11-01): el club pidio sumar a "Buchanan, Esteban" de titular con el 3 (el casillero 3
// de la formacion estaba vacio). Idempotente. Correr con: npx tsx src/scripts/agregar-buchanan-m17-b-f11.ts
import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const ref = adminDb.collection("partidos").doc("m17-b-f11");
  const nombre = "Buchanan, Esteban";
  const id = playerId(nombre);
  const plantelSnap = await ref.collection("plantel").get();
  const ocupado = plantelSnap.docs.find((d) => d.data().dorsal === "3" && d.id !== id);
  if (ocupado) throw new Error(`El 3 ya lo tiene ${ocupado.data().nombre}`);
  const partido = (await ref.get()).data()!;
  if (partido.estado !== "programado") throw new Error(`Estado ${partido.estado}: usar el cambio en vivo`);
  const enCancha: string[] = partido.enCanchaIds ?? [];
  await ref.collection("plantel").doc(id).set({ nombre, dorsal: "3", titular: true, enCancha: true });
  await ref.update({
    enCanchaIds: enCancha.includes(id) ? enCancha : [...enCancha, id],
    formacionActualizadaEn: new Date(),
    updatedAt: new Date(),
  });
  console.log(`Listo: ${nombre} titular con el 3 (${enCancha.length} -> ${enCancha.includes(id) ? enCancha.length : enCancha.length + 1} titulares)`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
