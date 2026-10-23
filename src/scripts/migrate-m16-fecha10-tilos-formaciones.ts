// M16 vs Los Tilos, domingo 2026-10-25 (de visitante, en Los Tilos): A 11:00, B 09:30 -- Fecha 10 del fixture -- y C 11:00
// como AMISTOSO (su Fecha 10 era "Libre": pasa a "Los Tilos", amistoso, visitante, sin la nota "Fecha libre", igual que
// M16 D vs SIC). Formaciones de la imagen del club (hoja "M16 2026", cuyo encabezado dice "Domingo 11/10" por error):
// titulares 1-15 y suplentes con el dorsal de la planilla (casilleros vacios o con "-" se saltean). Se cargan y PUBLICAN.
// Idempotente; solo "programado". Correr con: npx tsx src/scripts/migrate-m16-fecha10-tilos-formaciones.ts   (DRY_RUN=1 para mirar)

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
  amistoso?: boolean;
  hora: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    partidoId: "m16-a-f10",
    hora: "11:00",
    titulares: ["BARLETTA, SANTINO", "LLAVALLOL, GERONIMO", "GILLIGAN, JERONIMO", "SAUL, BENJAMIN", "TESSORE, BENITO", "NORES, FELIPE", "MÜLLER, SANTINO", "DIAZ DE VIVAR, RAMON", "SACKMANN, RAMON", "REYNAL, JERONIMO", "RODRIGUEZ RIBAS, AGUSTIN", "SLUZEWSKI, TOMAS", "CONTEPOMI, SILVESTRE", "PETERS, JUSTO", "AUTILIO, BENJAMIN"],
    suplentes: [["16", "RICHELET, JUAN"], ["17", "URANGA, MATEO"]],
  },
  {
    partidoId: "m16-b-f10",
    hora: "09:30",
    titulares: ["SOLA, JUAN", "SALESE, RAMON", "IRIBAS, RAMON", "GUILLANI, JUAN JOSE", "FABBRI, SANTINO", "CASTELLI, FELIPE", "CASA, FELIX", "RICHELET, JUAN", "PUIG, SALVADOR", "SUAYA, LORENZO", "HERRERA, RUFINO", "SIMON PADROS, JUAN", "RENTERIA, MARCOS", "NORMAN, MARCOS", "OLIVERA, DIOGENES"],
    suplentes: [["16", "PALMA, BENJAMIN"], ["17", "LALOR, MIGUEL"]],
  },
  {
    partidoId: "m16-c-f10",
    amistoso: true,
    hora: "11:00",
    titulares: ["VEDOYA, ALFONSO", "POLIZZA, DELFIN", "IBARBIA, RUFINO", "VELARDE, PEDRO", "ARAMBURU, SANTIAGO", "GILARDI, SIMON", "PALMA, BENJAMIN", "MÜLLER, PASCAL", "ESTRADA, IGNACIO", "MONTOVIO, IGNACIO", "SOUTHALL, GALO", "VAZQUEZ CAPUTO, AGUSTIN", "OCAMPO, SALVADOR", "VILA ECHAGÜE, JUAN", "MAMMOLINO, FRANCISCO"],
    suplentes: [["16", "MOYANO, SANTIAGO"], ["17", "BESTANI, CRUZ"], ["18", "CASSAGNE, LUIS"]],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.partidoId}: ${eq.titulares.length} titulares`);
    const partidoRef = adminDb.collection("partidos").doc(eq.partidoId);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${eq.partidoId} no existe`);
    const d = snap.data() as { estado?: string; fecha?: string; hora?: string; rival?: string; notaEspecial?: string };
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
      `${eq.partidoId} (antes: ${d.rival}${d.notaEspecial ? ", " + d.notaEspecial : ""}) ${eq.hora}${eq.amistoso ? " AMISTOSO" : ""}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      ...(eq.amistoso
        ? { amistoso: true, rival: "Los Tilos", esLocal: false, cancha: "Los Tilos", notaEspecial: FieldValue.delete() }
        : {}),
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
