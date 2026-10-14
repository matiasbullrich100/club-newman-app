// M15 A y C: la Fecha 7 vs Alumni (del 2026-09-27) se suspendio por tormenta electrica y quedo sin jugar
// ("programado"); se completa el viernes 2026-10-16 a las 19:00 en Alumni (visitante). Solo cambia
// fecha/hora; no toca la formacion publicada. Idempotente; solo toca partidos "programado".
// Correr con: npx tsx src/scripts/set-m15-a-c-f7-alumni.ts
import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";

const FECHA = "2026-10-16";
const HORA = "19:00";

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const cat of ["m15-a", "m15-c"]) {
    const ref = adminDb.collection("partidos").doc(partidoId(cat, 7));
    const d = (await ref.get()).data() as { estado?: string; rival?: string; fecha?: string; hora?: string; cancha?: string } | undefined;
    if (!d || d.estado !== "programado") throw new Error(`${cat}-f7: estado ${d?.estado}`);
    console.log(`${cat}-f7 vs ${d.rival} (${d.cancha}): ${d.fecha} ${d.hora}  ->  ${FECHA} ${HORA}`);
    await ref.update({ fecha: FECHA, hora: HORA, updatedAt: new Date() });
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
