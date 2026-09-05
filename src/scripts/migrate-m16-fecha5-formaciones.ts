// Formaciones de la Fecha 5 de M16 (A/B/C/D), domingo 2026-09-06, como BORRADOR
// (formacionPublicada: false). Transcriptas de la captura "M16 2026" que paso el club -- OJO: la
// captura traia el encabezado viejo ("DOMINGO 30/8", la fecha de la Fecha 4 ya jugada, vs
// Belgrano), pero el club confirmo que el CONTENIDO de la planilla (que jugador esta en que
// equipo) es el de esta semana -- se ignora el encabezado, se toma solo la lista de jugadores.
//
// El club paso la lista definitiva de A y B (reemplaza la transcripcion original, que tenia dos
// nombres sin confirmar en A: dorsal 14 repetia "Bestani, Cruz" -- ahora Bestani pasa a la B,
// dorsal 13, y Peters se mueve de la B a la A, dorsal 14). C sigue con UN casillero sin confirmar
// (revisar y cargar a mano con "Editar Formacion" una vez confirmado):
// - m16-c dorsal 14: la celda de la captura decia literalmente "#REF!" (formula rota en el
//   original), no un nombre. Por eso C queda con 14 titulares en vez de 15.
//
// Nombres: se toma el que ya esta cargado en la base para ese jugador (mismas fechas previas de
// M16) si el id coincide (ignora may/min y acentos); si es nuevo, se pasa de MAYUSCULAS a Title
// Case. Los "nuevos" se listan al correr para poder revisar rapido cualquier tilde/apellido raro.
// Correr con: npm run migrate-m16-fecha5-formaciones   (DRY_RUN=1 para simular).

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId, partidoIdsDeGrupo } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 5;

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: string[];
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m16-a",
    titulares: [
      "IRIBAS, Ramon",
      "LLAVALLOL, Geronimo",
      "GILLIGAN, Jeronimo",
      "SAUL, Benjamin",
      "TESSORE, Benito",
      "NORES, Felipe",
      "MÜLLER, Santino",
      "DIAZ DE VIVAR, Ramon",
      "SACKMANN, Ramon",
      "REYNAL, Jeronimo",
      "URANGA, Mateo",
      "CONTEPOMI, Silvestre",
      "SLUZEWSKI, Tomas",
      "PETERS, Justo",
      "RODRIGUEZ RIBAS, Agustin",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m16-b",
    titulares: [
      "POLIZZA, Delfin",
      "MIGUENS, Santiago",
      "SOLA, Juan",
      "FABBRI, Santino",
      "ARAMBURU, Santiago",
      "CASTELLI, Felipe",
      "CASA, Felix",
      "RICHELET, Juan",
      "PUIG, Salvador",
      "SUAYA, Lorenzo",
      "HERRERA, Rufino",
      "RENTERIA, Marcos",
      "BESTANI, Cruz",
      "NORMAN, Marcos",
      "AUTILIO, Benjamin",
    ],
    suplentes: ["LALOR, Miguel", "VEDOYA, Alfonso", "VAZQUEZ CAPUTO, Agustin", "OLIVERA, Diogenes"],
  },
  {
    categoriaId: "m16-c",
    titulares: [
      "ASENJO, Bautista",
      "IBARBIA, Rufino",
      "SALESE, Ramon",
      "MÜLLER, Pascal",
      "IBARGUREN, Santiago",
      "GILARDI, Simon",
      "CASSAGNE, Luis",
      "PALMA, Benjamin",
      "ESTRADA, Ignacio",
      "MONTOVIO, Ignacio",
      "FRAVEGA, Jeronimo",
      "SIMON PADROS, Juan",
      "MERELLO, Simon",
      // dorsal 14: sin confirmar (ver comentario arriba, "#REF!" en la planilla) -- se omite.
      "MAMMOLINO, Francisco",
    ],
    suplentes: ["BOURDIEU, Max", "CORREA, Santiago"],
  },
  {
    categoriaId: "m16-d",
    titulares: [
      "KEMP, Cruz",
      "BECU, Marcos",
      "MC CORMICK, Alfonso",
      "OLMOS, Felipe",
      "BOCCARDO, Mateo",
      "CARDONI, Rafael",
      "HELBIG, Rufino",
      "BULLRICH, Hilario",
      "LEONARD, Salvador",
      "ACHAVAL, Mateo",
      "MAQUEDA, Rafael",
      "NICHOLSON, Mateo",
      "CASTELLI, Pedro",
      "GUYOT, Lucas",
      "MOYANO, Santiago",
    ],
    suplentes: [],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  // Nombres ya cargados para M16 (fechas previas): id -> nombre exacto.
  const previos = new Map<string, string>();
  for (const id of partidoIdsDeGrupo("m16")) {
    const pl = await adminDb.collection("partidos").doc(id).collection("plantel").get();
    pl.docs.forEach((doc) => {
      const n = (doc.data() as { nombre?: string }).nombre;
      if (n && !previos.has(doc.id)) previos.set(doc.id, n);
    });
  }

  const nombreFinal = (raw: string): { nombre: string; nuevo: boolean } => {
    const tc = titleCase(raw);
    const id = playerId(tc);
    const previo = previos.get(id);
    return previo ? { nombre: previo, nuevo: false } : { nombre: tc, nuevo: true };
  };

  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");
  const batch = adminDb.batch();
  let totalDocs = 0;
  const nuevos: string[] = [];

  for (const equipo of EQUIPOS) {
    const pid = partidoId(equipo.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) {
      console.warn(`SALTEADO ${pid}: no existe.`);
      continue;
    }
    const data = snap.data() as { estado?: string };
    if (data.estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado="${data.estado}".`);
      continue;
    }

    const jugadores: JugadorPartido[] = [];
    equipo.titulares.forEach((raw, i) => {
      const { nombre, nuevo } = nombreFinal(raw);
      if (nuevo) nuevos.push(`${pid} #${i + 1}: ${nombre}`);
      jugadores.push({ nombre, dorsal: String(i + 1), titular: true, enCancha: true });
    });
    equipo.suplentes.forEach((raw, i) => {
      const { nombre, nuevo } = nombreFinal(raw);
      if (nuevo) nuevos.push(`${pid} #${16 + i}: ${nombre}`);
      jugadores.push({ nombre, dorsal: String(16 + i), titular: false, enCancha: false });
    });

    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" -> mismo id "${id}".`);
      ids.set(id, j.nombre);
    }
    const nuevosIds = new Set(ids.keys());
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !nuevosIds.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));

    console.log(
      `${pid}: ${jugadores.length} jug (${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl)` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );

    if (dryRun) continue;
    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) {
      batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
      totalDocs++;
    }
    batch.update(partidoRef, { formacionPublicada: false, enCanchaIds: titularesIds, updatedAt: new Date() });
    totalDocs++;
  }

  if (nuevos.length) {
    console.log("\nJugadores NUEVOS (no estaban en fechas previas de M16, revisá el nombre):");
    nuevos.forEach((n) => console.log("  " + n));
  }

  if (dryRun) {
    console.log("\n(DRY RUN) nada escrito.");
    return;
  }
  await batch.commit();
  console.log(`\nListo. ${totalDocs} escrituras. Formaciones como BORRADOR (sin publicar).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
