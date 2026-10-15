// M19 C y D: la Fecha 7 vs BACRC (del 2026-09-27) quedo sin jugar ("programado"); se juega el domingo
// 2026-10-18 en Newman, C y D a las 11:00. Solo cambia fecha/hora; no toca formacion publicada.
// (M19 A: fecha/hora cambiadas aparte a 12:30, sigue "suspendido"; M19 B no juega el domingo.)
// Idempotente; solo toca partidos "programado". Correr con: npx tsx src/scripts/set-m19-c-d-f7-bacrc.ts
import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";

const FECHA = "2026-10-18";
const HORAS: Record<string, string> = { "m19-c": "11:00", "m19-d": "11:00" };

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const [cat, hora] of Object.entries(HORAS)) {
    const ref = adminDb.collection("partidos").doc(partidoId(cat, 7));
    const d = (await ref.get()).data() as { estado?: string; rival?: string; fecha?: string; hora?: string } | undefined;
    if (!d || d.estado !== "programado") throw new Error(`${cat}-f7: estado ${d?.estado}`);
    console.log(`${cat}-f7 vs ${d.rival}: ${d.fecha} ${d.hora}  ->  ${FECHA} ${hora}`);
    await ref.update({ fecha: FECHA, hora, updatedAt: new Date() });
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
