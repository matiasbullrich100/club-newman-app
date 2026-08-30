// Carga las formaciones de la Fecha 4 de M16 (A/B/C/D) vs Belgrano, domingo 2026-08-30, como
// BORRADOR (formacionPublicada: false). Transcriptas de la captura "M16 2026" que pasó el club.
// Correr con: npm run migrate-m16-fecha4-formaciones   (DRY_RUN=1 para simular).
//
// Nombres de la planilla en MAYÚSCULAS -> se pasan a Title Case para quedar igual que las fechas
// 1-3 ya cargadas. El id de jugador ignora may/min y acentos, así que igual cruza bien.
// Idempotente: pisa el plantel y borra los que hayan quedado de una corrida anterior. Solo actúa
// sobre partidos en estado "programado". No toca rival ni hora del fixture.

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 4;

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[]; // 15
  suplentes: string[];
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m16-a",
    titulares: [
      "BARLETTA, Santino",
      "LLAVALLOL, Geronimo",
      "GILLIGAN, Jeronimo",
      "SAUL, Benjamin",
      "RUIZ GUIÑAZU, Santos",
      "TESSORE, Benito",
      "MÜLLER, Santino",
      "DIAZ DE VIVAR, Ramon",
      "SACKMANN, Ramon",
      "REYNAL, Jeronimo",
      "URANGA, Mateo",
      "CONTEPOMI, Silvestre",
      "SLUZEWSKI, Tomas",
      "BESTANI, Cruz",
      "RODRIGUEZ RIBAS, Agustin",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m16-b",
    titulares: [
      "IRIBAS, Ramon",
      "RUSSO, Quinto",
      "MIGUENS, Santiago",
      "GUILLANI, Juan Jose",
      "FABBRI, Santino",
      "CASTELLI, Felipe",
      "NORES, Felipe",
      "RICHELET, Juan",
      "PUIG, Salvador",
      "SUAYA, Lorenzo",
      "HERRERA, Rufino",
      "RENTERIA, Marcos",
      "PETERS, Justo",
      "NORMAN, Marcos",
      "AUTILIO, Benjamin",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m16-c",
    titulares: [
      "IBARBIA, Rufino",
      "POLIZZA, Delfin",
      "SALESE, Ramon",
      "VEDOYA, Alfonso",
      "ARAMBURU, Santiago",
      "CASA, Felix",
      "PALMA, Benjamin",
      "MÜLLER, Pascal",
      "ESTRADA, Ignacio",
      "MONTOVIO, Ignacio",
      "CORREA, Santiago",
      "SIMON PADROS, Juan",
      "VAZQUEZ CAPUTO, Agustin",
      "VILA ECHAGÜE, Juan",
      "OLIVERA, Diogenes",
    ],
    suplentes: [
      "SOLA, Juan",
      "FRAVEGA, Jeronimo",
      "MERELLO, Simon",
      "MAMMOLINO, Francisco",
      "GILARDI, Simon",
    ],
  },
  {
    categoriaId: "m16-d",
    titulares: [
      "IBARGUREN, Santiago",
      "LALOR, Miguel",
      "MC CORMICK, Alfonso",
      "OLMOS, Felipe",
      "BOCCARDO, Mateo",
      "CARDONI, Rafael",
      "HELBIG, Rufino",
      "CASSAGNE, Luis",
      "LEONARD, Salvador",
      "BOURDIEU, Max",
      "ACHAVAL, Rufino",
      "OCAMPO, Salvador",
      "NICHOLSON, Mateo",
      "CASTELLI, Pedro",
      "GUYOT, Lucas",
    ],
    suplentes: [
      "MAQUEDA, Rafael",
      "KAPLUN, Juan",
      "CAPUTO, Felix",
      "SAUTHHALL, Galo",
      "BULLRICH, Hilario",
      "MOYANO, Santiago",
      "BECU, Marcos",
    ],
  },
];

function jugadoresDe(equipo: EquipoFormacion): JugadorPartido[] {
  const out: JugadorPartido[] = [];
  equipo.titulares.forEach((nombre, i) => {
    out.push({ nombre: titleCase(nombre), dorsal: String(i + 1), titular: true, enCancha: true });
  });
  equipo.suplentes.forEach((nombre, i) => {
    out.push({ nombre: titleCase(nombre), dorsal: String(16 + i), titular: false, enCancha: false });
  });
  return out;
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");

  const batch = adminDb.batch();
  let totalDocs = 0;

  for (const equipo of EQUIPOS) {
    const pid = partidoId(equipo.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();

    if (!snap.exists) {
      console.warn(`SALTEADO ${pid}: el partido no existe en Firestore.`);
      continue;
    }
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado = "${estado}" (solo "programado").`);
      continue;
    }

    const jugadores = jugadoresDe(equipo);

    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) {
        throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id ("${id}").`);
      }
      ids.set(id, j.nombre);
    }
    const nuevosIds = new Set(ids.keys());

    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !nuevosIds.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));

    console.log(
      `${pid}: ${jugadores.length} jugadores (${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl)` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );

    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) {
      batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
      totalDocs++;
    }
    batch.update(partidoRef, {
      formacionPublicada: false,
      enCanchaIds: titularesIds,
      updatedAt: new Date(),
    });
    totalDocs++;
  }

  if (dryRun) {
    console.log("\n(DRY RUN) nada escrito.");
    return;
  }

  await batch.commit();
  console.log(`\nListo. ${totalDocs} escrituras. Formaciones cargadas como BORRADOR (sin publicar).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
