// Corrige rival/local/cancha de la Fecha 23 de Plantel Superior (domingo 2026-09-26, salvo Pre G/H
// que juegan aparte) -- datos pasados por el club, pisan lo que hubiera quedado del fixture de
// URBA (que tenia a los 4 contra Atl. del Rosario).
//  - M-22 vs BAC M22 B, de visitante -- horario todavia no confirmado.
//  - Pre E vs CUBA F, de visitante -- horario todavia no confirmado.
//  - Pre F vs Los Tilos G, de visitante -- horario todavia no confirmado.
//  - Pre G vs Pre H: amistoso interno, en Newman, jueves 2026-09-24 a las 20:00 (no es la fecha 23
//    real de ninguno de los dos -- esa quedo postergada/sin jugar esta semana).
// Correr con: npx tsx src/scripts/set-fixture-fecha23.ts

import { config } from "dotenv";
import { resolve } from "path";

const NUMERO_FECHA = 23;

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");

  const batch = adminDb.batch();

  const cambiosSimples: Record<string, { rival: string; cancha: string }> = {
    "m-22": { rival: "BAC M22 B", cancha: "BAC" },
    "pre-e": { rival: "CUBA F", cancha: "CUBA" },
    "pre-f": { rival: "Los Tilos G", cancha: "Los Tilos" },
  };
  for (const [categoriaId, { rival, cancha }] of Object.entries(cambiosSimples)) {
    const ref = adminDb.collection("partidos").doc(`${categoriaId}-f${NUMERO_FECHA}`);
    batch.update(ref, { rival, cancha, esLocal: false, updatedAt: FieldValue.serverTimestamp() });
    console.log(`${categoriaId.padEnd(8)} vs ${rival}  (V)  cancha=${cancha}  -- horario pendiente`);
  }

  // Amistoso interno Pre G vs Pre H, jueves (no domingo). "Newman G"/"Newman H" para diferenciarlos
  // en el resumen -- ver nombrePropioDivision (pre-g/pre-h) que ya arma ese nombre para el propio.
  const fechaAmistoso = "2026-09-24";
  const horaAmistoso = "20:00";
  batch.update(adminDb.collection("partidos").doc(`pre-g-f${NUMERO_FECHA}`), {
    rival: "Newman H",
    esLocal: true,
    cancha: "Newman",
    fecha: fechaAmistoso,
    hora: horaAmistoso,
    amistoso: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(adminDb.collection("partidos").doc(`pre-h-f${NUMERO_FECHA}`), {
    rival: "Newman G",
    esLocal: true,
    cancha: "Newman",
    fecha: fechaAmistoso,
    hora: horaAmistoso,
    amistoso: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`pre-g / pre-h  amistoso interno en Newman, ${fechaAmistoso} ${horaAmistoso}hs`);

  await batch.commit();
  console.log("\nListo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
