// M17 A / B / C del domingo 2026-11-01 (Fecha 11, de visitante): A vs Lomas Athletic A 14:00, B vs Lomas Athletic B
// 12:30, C vs CUBA C 11:00 (los horarios ya estan en la base; las placas no los traen). M17 D no tiene partido.
// Formaciones de las placas del club: titulares 1-15 y suplentes con el dorsal de la placa. M17 A no trae suplentes.
// "BOSCH, Justo" de M17 C es el de M17 (no el de M19, que es "Bosch Peluffo, Justo").
// Se cargan y PUBLICAN (pedido explicito). Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-m17-fecha11-formaciones.ts   (DRY_RUN=1 para mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface EquipoFormacion {
  partidoId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    partidoId: "m17-a-f11",
    titulares: ["CAREY PAEZ, Marcos", "MONTOREANO, Beltran", "RACCIATI, Ignacio", "BENEGAS, Felix", "LYNCH, Gonzalo", "DEANE, Javier", "DOMINGUEZ OLIVERA, Jose", "VALVERDE, Francisco", "BUSTO CAVANAGH, Fermin", "GOMEZ DE ALZAGA, Camilo", "ARNAUDO, Pablo", "JACA OTAÑO, Beltran", "FUENTES ROCHA, Timoteo", "LORO MARCHESE, Tomas", "GARAT, Simon"],
    suplentes: [],
  },
  {
    partidoId: "m17-b-f11",
    titulares: ["BUCHANAN, Esteban", "DE UNDURRAGA, Joaquin", "VEDOYA, Augusto", "LISSARRAGUE, Pedro", "MEDINGER, Marcos", "SANTAMARINA, Juan", "PERKINS, Jeronimo", "FALCON, Mateo", "LEUPOLD, Francisco", "MARINO AGUIRRE, Agustin", "ZAVALA, Jean", "PEREZ SARTORI, Tomas", "ZAVALA, Sawens", "URANGA, Bautista", "GALICE NAON, Felix"],
    suplentes: [["16", "EIJO, Juan Alejandro"], ["17", "POMMER, Simon"], ["18", "GOTI, Vicente"]],
  },
  {
    partidoId: "m17-c-f11",
    titulares: ["MONSEGUR, Geronimo", "VALLEJOS, Silvestre", "MERELLO, Ignacio", "BAUSILI, Francisco", "ESCALANTE, Manuel", "BOSCH, Justo", "DIAZ HERRERA, Pedro", "DE ACHAVAL, Mateo", "CIRIO, Simon", "DE LA TOUR, Alejandro", "CASTELLI, Joaquin", "MOYANO, Nicolas", "BALZANO, Joaquin", "PALMA CANE, Ignacio", "GARCIA, Gael"],
    suplentes: [["16", "SERRA GALLO, Gonzalo"], ["17", "URANGA, Milo"], ["18", "LASHERAS, Juan Ignacio"], ["19", "RUIZ, Gustavo"], ["20", "WEINERT, Antonio"]],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.partidoId}: ${eq.titulares.length} titulares`);
    const partidoRef = adminDb.collection("partidos").doc(eq.partidoId);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${eq.partidoId} no existe`);
    const d = snap.data() as { estado?: string; fecha?: string; hora?: string; rival?: string };
    if (d.fecha !== "2026-11-01") throw new Error(`${eq.partidoId}: fecha "${d.fecha}" (esperaba 2026-11-01)`);
    if (d.estado !== "programado") {
      console.warn(`SALTEADO ${eq.partidoId}: estado "${d.estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((n, i) => ({ nombre: titleCase(n), dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, n]) => ({ nombre: titleCase(n), dorsal, titular: false, enCancha: false })),
    ];
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${eq.partidoId}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
    console.log(
      `${eq.partidoId} vs ${d.rival} (${d.hora}): ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: true,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones cargadas y PUBLICADAS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
