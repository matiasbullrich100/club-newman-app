// Semifinales de playoff de Plantel Superior (programa oficial de URBA): cada equipo de Newman que juega suma un
// partido "Fecha 27" con fase "semifinal" -- mismo flujo que una fecha normal (resumen, formacion, seguimiento en
// vivo, resultado). Semifinales neutrales: el equipo que figura a la IZQUIERDA en el programa va como "local".
//   Viernes 23/10 en Hindu: M22 (Newman vs Hindu) 19:00, cancha 5.
//   Viernes 23/10 en CUBA: Pre F vs Alumni F 19:00 (Dumas 3), Pre E vs CUBA E 21:00 (Miguens 2).
//   Sabado 24/10 en CUBA: Pre D 10:00 (Miguens 2) vs CUBA D, Pre C 12:00 (Apraiz 1) vs SIC C, Pre B 14:00
//   (Apraiz 1) vs SIC B, Pre A 16:00 (Miguens 2) vs CASI, Inter 18:00 (Miguens 2) vs SIC.
// Primera (semifinal vie 30/10 vs Alumni, cancha de CASI, hora a confirmar): se carga el cruce sin hora; esta
// semana figura como libre. Pre G y Pre H no juegan playoff. Idempotente: no pisa un partido ya existente.
// Correr con: npx tsx src/scripts/cargar-semifinales-plantel-superior.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";

interface Semi {
  cat: string;
  fecha: string;
  hora?: string;
  rival: string;
  esLocal: boolean;
  cancha: string;
  numeroCancha?: string;
}

const SEMIS: Semi[] = [
  { cat: "m-22", fecha: "2026-10-23", hora: "19:00", rival: "Hindu", esLocal: true, cancha: "Hindu", numeroCancha: "5" },
  { cat: "pre-f", fecha: "2026-10-23", hora: "19:00", rival: "Alumni F", esLocal: true, cancha: "CUBA", numeroCancha: "Dumas 3" },
  { cat: "pre-e", fecha: "2026-10-23", hora: "21:00", rival: "CUBA E", esLocal: true, cancha: "CUBA", numeroCancha: "Miguens 2" },
  { cat: "pre-d", fecha: "2026-10-24", hora: "10:00", rival: "CUBA D", esLocal: false, cancha: "CUBA", numeroCancha: "Miguens 2" },
  { cat: "pre-c", fecha: "2026-10-24", hora: "12:00", rival: "SIC C", esLocal: false, cancha: "CUBA", numeroCancha: "Apraiz 1" },
  { cat: "pre-b", fecha: "2026-10-24", hora: "14:00", rival: "SIC B", esLocal: false, cancha: "CUBA", numeroCancha: "Apraiz 1" },
  { cat: "pre-a", fecha: "2026-10-24", hora: "16:00", rival: "CASI", esLocal: false, cancha: "CUBA", numeroCancha: "Miguens 2" },
  { cat: "intermedia", fecha: "2026-10-24", hora: "18:00", rival: "SIC", esLocal: true, cancha: "CUBA", numeroCancha: "Miguens 2" },
  { cat: "primera", fecha: "2026-10-30", rival: "Alumni", esLocal: true, cancha: "CASI" },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  for (const s of SEMIS) {
    const ref = adminDb.collection("partidos").doc(`${s.cat}-f27`);
    if ((await ref.get()).exists) {
      console.log(`${s.cat}-f27 ya existe, no se toca`);
      continue;
    }
    console.log(`${s.cat}-f27 ${s.fecha} ${s.hora ?? "(hora a confirmar)"} ${s.esLocal ? "Newman vs" : "vs"} ${s.rival} @ ${s.cancha}${s.numeroCancha ? " " + s.numeroCancha : ""}`);
    if (dryRun) continue;
    await ref.set({
      categoriaId: s.cat,
      numeroFecha: 27,
      fase: "semifinal",
      fecha: s.fecha,
      ...(s.hora ? { hora: s.hora } : {}),
      rival: s.rival,
      esLocal: s.esLocal,
      cancha: s.cancha,
      ...(s.numeroCancha ? { numeroCancha: s.numeroCancha } : {}),
      estado: "programado",
      resultado: { newman: 0, rival: 0 },
      enCanchaIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  if (dryRun) console.log("(DRY RUN) nada escrito.");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
