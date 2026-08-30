// Formaciones de la Fecha 4 de M15 (A/B/C/D) vs Pucará, domingo 2026-08-30, como BORRADOR.
// Transcriptas de las 4 placas del club (el texto "23 de agosto" de las placas es un dato viejo
// del template -- el partido es la fecha 4, 30/08, ya vs Pucará y en Pucará según el fixture).
// Correr con: npm run migrate-m15-fecha4-formaciones   (DRY_RUN=1 para simular).
//
// Nombres: se usa el que ya está cargado en la base para ese jugador (fechas 1-3 de M15); si es
// nuevo, se pasa de la placa a Title Case. Los "nuevos" se listan al correr. No toca el fixture.
// Idempotente / solo partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId, partidoIdsDeGrupo } from "../lib/categorias";
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
  titulares: string[];
  suplentes: string[];
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m15-a",
    titulares: [
      "LLAMBI BOVINO, Felipe",
      "SOLA, Benicio",
      "ARAUJO, Santos",
      "ARNAUDO LOSADA, Ignacio Javier",
      "AMARAL TRIGO, Milo",
      "LOPEZ SAUBIDET, Juan Cruz",
      "LUNA ALURRALDE, Ignacio",
      "MIGUENS, Faustino",
      "PECHAR, Jose",
      "VALVERDE, Manuel",
      "LLAVALLOL, Marcos",
      "RODRIGUEZ RIBAS, Hilario",
      "REYNAL, Abbott Juan",
      "TISCORNIA, Felix",
      "LOPEZ AUFRANC, Hilario",
    ],
    suplentes: ["FIORITO, Jaime"],
  },
  {
    categoriaId: "m15-b",
    titulares: [
      "ORDOÑEZ, Pablo",
      "BARROS OCAMPO, Bartolome",
      "ZEMBORAIN, Antonio",
      "CONTEPOMI, Vicente",
      "ORIS DE ROA, Teofilo",
      "DIAZ MATHE, Cruz",
      "VILLAMIL, Simon",
      "CZAR, Cristobal",
      "ALEGRE, Baldomero",
      "BULLRICH, Jose",
      "SCHAIR, Tomas",
      "DORMAL, Santiago",
      "MENDIZABAL, Felipe",
      "BERASATEGUI, Fernando",
      "LEYBA, Fermin Gabriel",
    ],
    suplentes: ["GARCIA IGARZA, Joaquin"],
  },
  {
    categoriaId: "m15-c",
    titulares: [
      "WAISMAN, Matias",
      "KAUFMANN, Juan",
      "MARINO, Facundo",
      "SANTAMARINA BERGADA, Jeronimo",
      "CHIAPPE BECCAR VARELA, Pedro",
      "ZIMMERMANN, Francisco",
      "POLIZZA, Vicente",
      "ESTRADA, Jose Maria",
      "VINENT FERNANDEZ SPERONI, Benjamin",
      "BARISIC, Milo",
      "BOSCH HOLMBERG, Lucio",
      "VIGANO, Simon",
      "ARAMBURU, Iñaki",
      "CHEVALLIER BOUTELL, Gonzalo",
      "POGGI, Joaquin",
    ],
    suplentes: [
      "RICHARDS, Patricio Juan",
      "STODDART, Marcos",
      "GARAT NOLTING, Jaime",
      "SERANTES, Mateo",
      "BELAUSTEGUI, Isidro",
      "PALETTE PUEYRREDON, Bautista",
      "RESTUCCI MICHELI, Lucio",
      "BELL, Keneth",
    ],
  },
  {
    categoriaId: "m15-d",
    titulares: [
      "QUIGLEY, Mathew",
      "GRETHER, Emilio",
      "RICHARDS, Patricio Juan",
      "ONETO GAONA, Alejandro Blas",
      "STODDART, Marcos",
      "SERANTES, Mateo",
      "RESTUCCI MICHELI, Lucio",
      "IGLESIAS ARRIETA, Beltran",
      "PALETTE PUEYRREDON, Bautista",
      "BELAUSTEGUI, Isidro",
      "IBARZABAL, Tomas",
      "BELL, Keneth",
      "NAZAR, Florencio",
      "GARAT NOLTING, Jaime",
      "BONADEO, Santos",
    ],
    suplentes: ["MATTA Y TREJO, Alfonso", "VALLACO, Juan Cruz"],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  const previos = new Map<string, string>();
  for (const id of partidoIdsDeGrupo("m15")) {
    const pl = await adminDb.collection("partidos").doc(id).collection("plantel").get();
    pl.docs.forEach((doc) => {
      const n = (doc.data() as { nombre?: string }).nombre;
      if (n && !previos.has(doc.id)) previos.set(doc.id, n);
    });
  }
  const nombreFinal = (raw: string): { nombre: string; nuevo: boolean } => {
    const tc = titleCase(raw);
    const previo = previos.get(playerId(tc));
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
    if (!snap.exists) { console.warn(`SALTEADO ${pid}: no existe.`); continue; }
    if ((snap.data() as { estado?: string }).estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado="${(snap.data() as { estado?: string }).estado}".`);
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
    for (const j of jugadores) { batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j); totalDocs++; }
    batch.update(partidoRef, { formacionPublicada: false, enCanchaIds: titularesIds, updatedAt: new Date() });
    totalDocs++;
  }

  if (nuevos.length) {
    console.log("\nJugadores NUEVos (no estaban en fechas previas de M15, revisá el nombre):");
    nuevos.forEach((n) => console.log("  " + n));
  }
  if (dryRun) { console.log("\n(DRY RUN) nada escrito."); return; }
  await batch.commit();
  console.log(`\nListo. ${totalDocs} escrituras. Formaciones como BORRADOR (sin publicar).`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
