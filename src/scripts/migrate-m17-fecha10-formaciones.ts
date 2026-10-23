// M17 A / B / C del domingo 2026-10-25 en Newman. A vs Hindu A 14:00 y B vs Hindu B 12:30 (Fecha 10 del fixture).
// M17 C: SIC D dio W.O. y el club armo un AMISTOSO vs Belgrano D (10:00): el partido de la Fecha 10 de M17 C pasa a
// "Belgrano D", amistoso, local, 10:00. (El W.O. de SIC D lo cuenta URBA en su tabla; aca no se carga como partido.)
// Formaciones de las placas del club: titulares 1-15 y suplentes con el dorsal de la placa. Se cargan y PUBLICAN.
// "BOSCH, Justo" de M17 C es el de M17 (no el de M19, que es "Bosch Peluffo, Justo").
// Idempotente; solo "programado". Correr con: npx tsx src/scripts/migrate-m17-fecha10-formaciones.ts   (DRY_RUN=1 para mirar)

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
  hora: string;
  amistoso?: { rival: string };
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    partidoId: "m17-a-f10",
    hora: "14:00",
    titulares: ["RACCIATI, Ignacio", "MONTOREANO, Beltran", "SAENZ VALIENTE, Tomas", "GOTI, Vicente", "MEDINGER, Marcos", "DEANE, Javier", "DOMINGUEZ OLIVERA, Jose", "VALVERDE, Francisco", "BUSTO CAVANAGH, Fermin", "GOMEZ DE ALZAGA, Camilo", "GALICE NAON, Felix", "JACA OTAÑO, Beltran", "FUENTES ROCHA, Timoteo", "LORO MARCHESE, Tomas", "GARAT, Simon"],
    suplentes: [["16", "BENEGAS, Felix"]],
  },
  {
    partidoId: "m17-b-f10",
    hora: "12:30",
    titulares: ["CAREY PAEZ, Marcos", "DE UNDURRAGA, Joaquin", "LOPEZ AUFRANC, Lucas", "LISSARRAGUE, Pedro", "LYNCH, Gonzalo", "SANTAMARINA, Juan", "PERKINS, Jeronimo", "FALCON, Mateo", "LEUPOLD, Francisco", "MARINO AGUIRRE, Agustin", "ZAVALA, Jean", "POMMER, Simon", "ZAVALA, Sawens", "BIBILONI, Rufino", "URANGA, Bautista"],
    suplentes: [["16", "VALLEJOS, Silvestre"], ["17", "PEREZ SARTORI, Tomas"]],
  },
  {
    partidoId: "m17-c-f10",
    hora: "10:00",
    amistoso: { rival: "Belgrano D" },
    titulares: ["BUCHANAN, Esteban", "DE ACHAVAL, Mateo", "MONSEGUR, Geronimo", "ESCALANTE, Manuel", "BAUSILI, Francisco", "VEDOYA, Augusto", "DIAZ HERRERA, Pedro", "BOSCH, Justo", "CIRIO, Simon", "DE LA TOUR, Alejandro", "CASTELLI, Joaquin", "MOYANO, Nicolas", "PALMA CANE, Ignacio", "POLIZZA, Juan Diego", "EIJO, Juan Alejandro"],
    suplentes: [["16", "MERELLO, Ignacio"], ["17", "RUIZ, Gustavo"], ["18", "WEINERT, Antonio"], ["19", "LASHERAS, Juan Ignacio"], ["20", "GARCIA, Gael"], ["21", "URANGA, Milo"], ["22", "SERRA GALLO, Gonzalo"], ["23", "BUENADER, Ivan"], ["24", "PRENESTE, Beltran"]],
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
    if (d.fecha !== "2026-10-25") throw new Error(`${eq.partidoId}: fecha "${d.fecha}" (esperaba 2026-10-25)`);
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
      `${eq.partidoId} (antes: ${d.rival} ${d.hora}) -> ${eq.amistoso ? eq.amistoso.rival + " AMISTOSO " : ""}${eq.hora}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      ...(eq.amistoso ? { amistoso: true, rival: eq.amistoso.rival, esLocal: true, cancha: "Newman" } : {}),
      hora: eq.hora,
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
