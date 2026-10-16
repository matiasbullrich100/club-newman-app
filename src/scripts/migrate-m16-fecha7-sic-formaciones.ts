// Carga y PUBLICA las formaciones de M16 A / C vs SIC (Fecha 7 postergada) y M16 D vs SIC (amistoso, en el lugar
// de su Fecha 10 libre), domingo 2026-10-18 en Newman (A 11:00, C y D 09:30). Transcriptas de la imagen del club
// (hoja "M16 2026", cuyo encabezado dice "Domingo 11/10" por error: son los partidos del 18/10). Titulares 1-15 y
// suplentes con el dorsal de la planilla (los casilleros vacios se saltean). Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-m16-fecha7-sic-formaciones.ts   (DRY_RUN=1 para solo mirar)

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
    partidoId: "m16-a-f7",
    titulares: ["BARLETTA, SANTINO","LLAVALLOL, GERONIMO","GILLIGAN, JERONIMO","SAUL, BENJAMIN","TESSORE, BENITO","NORES, FELIPE","MÜLLER, SANTINO","DIAZ DE VIVAR, RAMON","SACKMANN, RAMON","SLUZEWSKI, TOMAS","URANGA, MATEO","CONTEPOMI, SILVESTRE","RODRIGUEZ RIBAS, AGUSTIN","PETERS, JUSTO","AUTILIO, BENJAMIN"],
    suplentes: [["16","SOLA, JUAN"],["17","LALOR, MIGUEL"],["18","SALESE, RAMON"],["19","FABBRI, SANTINO"],["20","RICHELET, JUAN"],["21","SUAYA, LORENZO"],["22","REYNAL, JERONIMO"],["23","NORMAN, MARCOS"]],
  },
  {
    partidoId: "m16-c-f7",
    titulares: ["SALESE, RAMON","POLIZZA, DELFIN","IBARBIA, RUFINO","VELARDE, PEDRO","ARAMBURU, SANTIAGO","GILARDI, SIMON","CASA, FELIX","MÜLLER, PASCAL","ESTRADA, IGNACIO","MONTOVIO, IGNACIO","MOYANO, SANTIAGO","SIMON PADROS, JUAN","VAZQUEZ CAPUTO, AGUSTIN","VILA ECHAGÜE, JUAN","MAMMOLINO, FRANCISCO"],
    suplentes: [["16","IRIBAS, RAMON"],["17","MERELLO, SIMON"],["18","RENTERIA, MARCOS"],["19","CASTELLI, FELIPE"],["20","CASSAGNE, LUIS"],["21","PALMA, BENJAMIN"]],
  },
  {
    partidoId: "m16-d-f10",
    titulares: ["OLMOS, FELIPE","HELBIG, RUFINO","VEDOYA, ALFONSO","NICHOLSON, MATEO","BOCCARDO, MATEO","SOUTHALL, GALO","CARDONI, RAFAEL","FRAVEGA, JERONIMO","LEONARD, SALVADOR","MAQUEDA, RAFAEL","CASTELLI, PEDRO","OCAMPO, SALVADOR","CORREA, SANTIAGO","CAPUTO, FELIX","GUYOT, LUCAS"],
    suplentes: [["16","SUMMERS, OLIVER"],["17","ACHAVAL, RUFINO"],["18","KAPLUN, JUAN"],["19","BOURDIEU, MAX"]],
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
    if (d.fecha !== "2026-10-18") throw new Error(`${eq.partidoId}: fecha "${d.fecha}" (esperaba 2026-10-18)`);
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
    console.log(`${eq.partidoId} vs ${d.rival} ${d.hora}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : ""));
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
