// Carga las formaciones de la Fecha 9 de M16 (A/B/C/D vs Champagnat, de local, domingo 2026-10-11) como
// BORRADOR (formacionPublicada: false), transcriptas de la imagen "M16 2026" del club. Los nombres vienen
// "APELLIDO, Nombre": se pasan por titleCase() como en las otras cargas de juveniles. Suplentes con el
// dorsal de la planilla (M16 A y B no traen suplentes). Tambien carga el horario de la imagen.
// Correr con: npx tsx src/scripts/migrate-m16-fecha9-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const NUMERO_FECHA = 9;
// Horarios de la imagen del club (pisan los del fixture: C y D venian cruzados).
const HORAS: Record<string, string> = { "m16-a": "11:00", "m16-b": "09:30", "m16-c": "09:30", "m16-d": "11:00" };

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m16-a",
    titulares: ["BARLETTA, SANTINO","LLAVALLOL, GERONIMO","GILLIGAN, JERONIMO","SAUL, BENJAMIN","TESSORE, BENITO","NORES, FELIPE","MÜLLER, SANTINO","DIAZ DE VIVAR, RAMON","SACKMANN, RAMON","SLUZEWSKI, TOMAS","URANGA, MATEO","CONTEPOMI, SILVESTRE","RODRIGUEZ RIBAS, AGUSTIN","PETERS, JUSTO","AUTILIO, BENJAMIN"],
    suplentes: [],
  },
  {
    categoriaId: "m16-b",
    titulares: ["SOLA, JUAN","MIGUENS, SANTIAGO","LALOR, MIGUEL","GUILLANI, JUAN JOSE","FABBRI, SANTINO","CASTELLI, FELIPE","RICHELET, JUAN","PALMA, BENJAMIN","PUIG, SALVADOR","SUAYA, LORENZO","HERRERA, RUFINO","REYNAL, JERONIMO","RENTERIA, MARCOS","NORMAN, MARCOS","OLIVERA, DIOGENES"],
    suplentes: [],
  },
  {
    categoriaId: "m16-c",
    titulares: ["SALESE, RAMON","POLIZZA, DELFIN","IBARBIA, RUFINO","VELARDE, PEDRO","IBARGUREN, SANTIAGO","CASA, FELIX","GILARDI, SIMON","MÜLLER, PASCAL","ESTRADA, IGNACIO","MONTOVIO, IGNACIO","MOYANO, SANTIAGO","SIMON PADROS, JUAN","VAZQUEZ CAPUTO, AGUSTIN","VILA ECHAGÜE, JUAN","MAMMOLINO, FRANCISCO"],
    suplentes: [["16","ARAMBURU, SANTIAGO"],["17","VEDOYA, ALFONSO"],["18","CASSAGNE, LUIS"],["19","LEONARD, SALVADOR"],["20","SOUTHALL, GALO"],["21","GUYOT, LUCAS"]],
  },
  {
    categoriaId: "m16-d",
    titulares: ["ALVEAR, FRANCISCO","Mc CORMICK, ALFONSO","VEDOYA, ALFONSO","OLMOS, FELIPE","BOCCARDO, MATEO","HELBIG, RUFINO","CARDONI, RAFAEL","CASSAGNE, LUIS","LEONARD, SALVADOR","MAQUEDA, RAFAEL","CASTELLI, PEDRO","MERELLO, SIMON","NICHOLSON, MATEO","SOUTHALL, GALO","GUYOT, LUCAS"],
    suplentes: [["16","FRAVEGA, JERONIMO"],["17","SOLER, SHAKA"],["18","KAPLUN, JUAN"],["19","CAPUTO, FELIX"],["20","ACHAVAL, RUFINO"],["21","OCAMPO, SALVADOR"]],
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
      ...eq.titulares.map((nombre, i) => ({ nombre: titleCase(nombre), dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, nombre]) => ({ nombre: titleCase(nombre), dorsal, titular: false, enCancha: false })),
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
      hora: HORAS[eq.categoriaId],
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
