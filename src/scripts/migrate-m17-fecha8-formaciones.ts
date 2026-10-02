// Carga las formaciones de la Fecha 8 de M17 (A vs Liceo Naval A, B vs Liceo Naval B, C vs Belgrano C;
// domingo 2026-10-04) como BORRADOR (formacionPublicada: false). Transcriptas de la placa que paso
// el club (posicion 1-15 titulares, 16+ suplentes; el dorsal es la posicion). Los nombres se
// escribieron con la forma ya guardada en la base para cada jugador (mismo playerId), no en
// MAYUSCULAS como vienen en la placa.
// Correr con: npx tsx src/scripts/migrate-m17-fecha8-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 8;

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m17-a",
    titulares: [
      "Racciati, Ignacio",
      "Montoreano, Beltran",
      "Saenz Valiente, Tomas",
      "Benegas, Felix",
      "Lynch, Gonzalo",
      "Dominguez Olivera, Jose",
      "Perkins, Jerónimo",
      "Deane, Javier",
      "Busto Cavanagh, Fermin",
      "Gomez de Alzaga, Camilo",
      "Arnaudo, Pablo",
      "Jaca Otaño, Beltran",
      "Perez Sartori, Tomas",
      "Loro Marchese, Tomas",
      "Garat, Simon",
    ],
    suplentes: [
      ["16", "Medinger, Marcos"],
      ["17", "Valverde, Francisco"],
    ],
  },
  {
    categoriaId: "m17-b",
    titulares: [
      "Carey Paez, Marcos",
      "Vallejos, Silvestre",
      "Lopez Aufranc, Lucas",
      "Lissarrague, Pedro",
      "Escalante, Manuel",
      "Santamarina, Juan",
      "Buenader, Pedro",
      "Delfino, Ignacio",
      "Leupold, Francisco",
      "Fuentes Rocha, Timoteo",
      "Zavala, Jean",
      "Pommer, Simon",
      "Zavala, Sawens",
      "Uranga, Bautista",
      "Galice Naon, Felix",
    ],
    suplentes: [
      ["16", "Falcon, Mateo"],
      ["17", "Marino Aguirre, Agustin"],
    ],
  },
  {
    categoriaId: "m17-c",
    titulares: [
      "Buchanan, Esteban",
      "De Undurraga, Joaquin",
      "Bausili, Francisco",
      "Diaz Herrera, Pedro",
      "De Achaval, Mateo",
      "Vedoya, Augusto",
      "Goti, Vicente",
      "Huber, Ramon",
      "Bosch, Justo",
      "Cirio, Simon",
      "Weinert, Antonio",
      "Belaustegui, Facundo",
      "Bibiloni, Rufino",
      "Polizza, Juan Diego",
      "Garcia, Gael",
    ],
    suplentes: [
      ["16", "Buenader, Ivan"],
      ["17", "Ruiz, Gustavo"],
      ["18", "Merello, Ignacio"],
      ["19", "Lasheras, Juan Ignacio"],
      ["20", "Monsegur, Geronimo"],
      ["21", "Eijo, Juan Alejandro"],
      ["22", "Preneste, Beltran"],
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
