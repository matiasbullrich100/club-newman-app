// Carga las formaciones de la Fecha 7 de M17 (A y B vs D. Francesa, de visitante, domingo 2026-09-27)
// como BORRADOR (formacionPublicada: false). Transcriptas de las planillas oficiales de URBA
// "20260927 A vs DEPO FRANCESA.pdf" y "20260927 B vs DEPO FRANCESA.pdf" (posicion 01-15 titulares,
// 16-23 suplentes; el dorsal es la posicion). M17 C tiene Fecha libre, no se carga.
// Correr con: npx tsx src/scripts/migrate-m17-fecha7-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 7;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m17-a",
    titulares: [
      "Goti, Vicente",
      "Montoreano, Beltran",
      "Racciatti, Ignacio",
      "Lynch, Gonzalo",
      "Dominguez Olivera, José Enrique",
      "Buenader, Pedro",
      "Perkins, Jerónimo",
      "Deane, Javier",
      "Busto Cavanagh, Fermin",
      "Gómez Alzaga, Camilo",
      "Arnaudo Losada, Pablo Florencio",
      "Jaca Otaño, Beltran",
      "Perez Sartori, Tomas",
      "Loro Marchese, Tomas",
      "Garat, Simon",
    ],
    suplentes: [
      ["16", "Carey, Marcos"],
      ["17", "Zavala, Sawens"],
      ["18", "Marino Aguirre, Agustin"],
      ["19", "Leupold, Francisco"],
      ["20", "Santamarina, Juan Ramón"],
      ["21", "Lopez, Aufranc"],
      ["22", "Sáenz Valiente, Tomás José Maria"],
    ],
  },
  {
    categoriaId: "m17-b",
    titulares: [
      "Lopez, Aufranc",
      "Carey, Marcos",
      "Sáenz Valiente, Tomás José Maria",
      "Vedoya, Augusto",
      "Lissarrague, Pedro",
      "Bosch, Justo",
      "Santamarina, Juan Ramón",
      "Delfino, Ignacio",
      "Leupold, Francisco",
      "Marino Aguirre, Agustin",
      "Zavala, Jean",
      "Perez Sartori, Tomas",
      "Zavala, Sawens",
      "Bibiloni, Rufino",
      "Galice Naon, Felix",
    ],
    suplentes: [
      ["16", "Pommer, Simon Guillermo"],
      ["17", "Buenader, Pedro"],
      ["18", "Vallejos Meana, Silvestre Jose"],
      ["19", "Polizza, Juan Diego"],
      ["20", "Diaz Herrera, Pedro"],
      ["21", "Buchanan, Esteban"],
      ["22", "Escalante, Manuel"],
      ["23", "Huber, Ramon"],
    ],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado "${estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((nombre, i) => ({ nombre, dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, nombre]) => ({ nombre, dorsal, titular: false, enCancha: false })),
    ];
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !ids.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
    console.log(
      `${pid}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: false,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones cargadas como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
