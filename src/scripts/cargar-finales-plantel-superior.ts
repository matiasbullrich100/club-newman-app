// Finales de playoff de Plantel Superior en las que juega Newman: cada una suma un partido "Fecha 28" con fase "final"
// (mismo flujo que la semifinal, ver cargar-semifinales-plantel-superior.ts). Rivales = los ganadores de la otra semifinal
// (URBA); hora y cancha puntual quedan a confirmar.
//   Primera: sabado 7/11 vs Hindu (sede sin informar).
//   Pre A (vs Hindu), Pre E (vs SIC) y Pre F (vs Los Tilos): sabado 14/11 en CUBA (Villa de Mayo).
// Idempotente: no pisa un partido ya existente.
// Correr con: npx tsx src/scripts/cargar-finales-plantel-superior.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";

interface Final {
  cat: string;
  fecha: string;
  rival: string;
  cancha?: string;
}

const FINALES: Final[] = [
  { cat: "primera", fecha: "2026-11-07", rival: "Hindu" },
  { cat: "pre-a", fecha: "2026-11-14", rival: "Hindu", cancha: "CUBA" },
  { cat: "pre-e", fecha: "2026-11-14", rival: "SIC", cancha: "CUBA" },
  { cat: "pre-f", fecha: "2026-11-14", rival: "Los Tilos", cancha: "CUBA" },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  for (const f of FINALES) {
    const ref = adminDb.collection("partidos").doc(`${f.cat}-f28`);
    if ((await ref.get()).exists) {
      console.log(`${f.cat}-f28 ya existe, no se toca`);
      continue;
    }
    console.log(`${f.cat}-f28 ${f.fecha} (hora a confirmar) Newman vs ${f.rival}${f.cancha ? " @ " + f.cancha : ""}`);
    if (dryRun) continue;
    await ref.set({
      categoriaId: f.cat,
      numeroFecha: 28,
      fase: "final",
      fecha: f.fecha,
      rival: f.rival,
      esLocal: true,
      ...(f.cancha ? { cancha: f.cancha } : {}),
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
