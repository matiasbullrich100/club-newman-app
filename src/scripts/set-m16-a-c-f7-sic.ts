// M16 A y C: la Fecha 7 vs SIC (del 2026-09-27) quedo sin jugar ("programado"); se juega el domingo
// 2026-10-18 en Newman -- C a las 09:30, A a las 11:00. Solo cambia fecha/hora (y confirma local/cancha).
// Idempotente; solo toca partidos "programado". Correr con: npx tsx src/scripts/set-m16-a-c-f7-sic.ts
import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";

const FECHA = "2026-10-18";
const HORAS: Record<string, string> = { "m16-a": "11:00", "m16-c": "09:30" };

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  for (const [cat, hora] of Object.entries(HORAS)) {
    const ref = adminDb.collection("partidos").doc(partidoId(cat, 7));
    const snap = await ref.get();
    const d = snap.data() as { estado?: string; rival?: string; fecha?: string; hora?: string; esLocal?: boolean; cancha?: string } | undefined;
    if (!d || d.estado !== "programado") throw new Error(`${cat}-f7: estado ${d?.estado}`);
    console.log(`${cat}-f7 vs ${d.rival}: ${d.fecha} ${d.hora} ${d.esLocal ? "(L)" : "(V)"} ${d.cancha}  ->  ${FECHA} ${hora} (L) Newman`);
    await ref.update({ fecha: FECHA, hora, esLocal: true, cancha: "Newman", updatedAt: new Date() });
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
