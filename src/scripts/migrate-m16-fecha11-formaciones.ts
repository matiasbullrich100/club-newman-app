// M16 A / B / C / D del domingo 2026-11-01 (Fecha 11, de local, en Newman): A vs San Albano A 11:00, B vs San Albano B 09:30,
// C vs C.U.Q. A 11:00. Formaciones de la hoja "M16 2026" del club (su encabezado dice "Domingo 11/10" por error, como otras
// semanas): titulares 1-15 y suplentes con el dorsal de la hoja (casilleros vacios se saltean).
// M16 C: la hoja repite a "Moyano, Santiago" como titular 11 y suplente 16 -> queda solo de titular (se avisa al club).
// M16 D: la hoja dice "Los Tilos B (L)" a las 11:00 pero en la base el partido es vs C.U.Q. B 09:30 -> se carga como
// BORRADOR (sin publicar) y sin tocar rival ni hora, hasta que el club aclare.
// A / B / C se cargan y PUBLICAN (pedido explicito). Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-m16-fecha11-formaciones.ts   (DRY_RUN=1 para mirar)

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
  publicar: boolean;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    partidoId: "m16-a-f11",
    publicar: true,
    titulares: ["BARLETTA, Santino", "LLAVALLOL, Geronimo", "GILLIGAN, Jeronimo", "SAUL, Benjamin", "TESSORE, Benito", "NORES, Felipe", "MÜLLER, Santino", "DIAZ DE VIVAR, Ramon", "SACKMANN, Ramon", "REYNAL, Jeronimo", "RODRIGUEZ RIBAS, Agustin", "SLUZEWSKI, Tomas", "CONTEPOMI, Silvestre", "PETERS, Justo", "AUTILIO, Benjamin"],
    suplentes: [["16", "RICHELET, Juan"], ["17", "URANGA, Mateo"], ["18", "SOLA, Juan"], ["19", "SALESE, Ramon"], ["21", "HERRERA, Rufino"], ["22", "SIMON PADROS, Juan"], ["23", "RENTERIA, Marcos"]],
  },
  {
    partidoId: "m16-b-f11",
    publicar: true,
    titulares: ["SOLA, Juan", "SALESE, Ramon", "IRIBAS, Ramon", "GUILLANI, Juan Jose", "FABBRI, Santino", "CASTELLI, Felipe", "CASA, Felix", "RICHELET, Juan", "PUIG, Salvador", "SUAYA, Lorenzo", "HERRERA, Rufino", "SIMON PADROS, Juan", "NORMAN, Marcos", "URANGA, Mateo", "OLIVERA, Diogenes"],
    suplentes: [["16", "BESTANI, Cruz"], ["17", "MIGUENS, Santiago"]],
  },
  {
    partidoId: "m16-c-f11",
    publicar: true,
    titulares: ["LALOR, Miguel", "POLIZZA, Delfin", "IBARBIA, Rufino", "VELARDE, Pedro", "ARAMBURU, Santiago", "GILARDI, Simon", "PALMA, Benjamin", "MÜLLER, Pascal", "ESTRADA, Ignacio", "MONTOVIO, Ignacio", "MOYANO, Santiago", "SIMON PADROS, Juan", "MERELLO, Simon", "VILA ECHAGUE, Juan", "MAMMOLINO, Francisco"],
    suplentes: [["17", "BESTANI, Cruz"], ["18", "CASSAGNE, Luis"]],
  },
  {
    partidoId: "m16-d-f11",
    publicar: false,
    titulares: ["OLMOS, Felipe", "HELBIG, Rufino", "ASENJO, Bautista", "VEDOYA, Alfonso", "BOCCARDO, Mateo", "SOUTHALL, Galo", "CARDONI, Rafael", "CASSAGNE, Luis", "CORREA, Santiago", "MAQUEDA, Rafael", "CASTELLI, Pedro", "OCAMPO, Salvador", "NICHOLSON, Mateo", "ACHAVAL, Rufino", "GUYOT, Lucas"],
    suplentes: [["16", "CAPUTO, Felix"], ["17", "BOURDIEU, Max"], ["18", "KAPLUN, Juan"], ["19", "LEONARD, Salvador"]],
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
      `${eq.partidoId} vs ${d.rival} (${d.hora}): ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl, ` +
        (eq.publicar ? "PUBLICA" : "borrador") +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: eq.publicar,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. A/B/C cargadas y PUBLICADAS; D como BORRADOR.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
