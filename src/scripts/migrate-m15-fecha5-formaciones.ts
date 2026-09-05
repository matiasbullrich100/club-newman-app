// Formaciones de la Fecha 5 de M15 (A/B/D), domingo 2026-09-06, como BORRADOR
// (formacionPublicada: false). Transcriptas de las 3 placas que paso el club -- OJO: las placas
// traian el encabezado viejo ("Ganadores - Fecha 4", "domingo 23 de agosto"), pero el rival y el
// horario de cada equipo coinciden con la Fecha 5 ya cargada en el fixture (A vs Liceo Naval A
// 11:00, B vs Liceo Naval B 09:30, D vs San Andres C 09:30) -- se ignora el encabezado, se toma
// solo la lista de jugadores. M15 C tiene Fecha libre esta fecha, no se carga.
// Correr con: npm run migrate-m15-fecha5-formaciones   (DRY_RUN=1 para simular).
//
// Nombres: se toma el que ya esta cargado en la base para ese jugador (M15 tiene todas las fechas
// previas con plantel) si el id coincide (ignora may/min y acentos); si es nuevo, se pasa de
// MAYUSCULAS a Title Case. Los "nuevos" se listan al correr. Idempotente / solo partidos
// "programado". No toca rival ni hora del fixture.

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
    categoriaId: "m15-a",
    titulares: [
      "LLAMBI BOVINO, Felipe",
      "SOLA, Benicio",
      "ARAUJO, Santos",
      "BENVENUTI, Vito",
      "AMARAL TRIGO, Milo",
      "LOPEZ SAUBIDET, Juan Cruz",
      "LUNA ALURRALDE, Ignacio",
      "MIGUENS, Faustino",
      "PECHAR, Jose",
      "BULLRICH, José",
      "LLAVALLOL, Marcos",
      "GARCÍA IGARZA, Joaquín",
      "REYNAL, Abbott Juan",
      "TISCORNIA, Félix",
      "LOPEZ AUFRANC, Hilario",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m15-b",
    titulares: [
      "MARINO, Facundo",
      "BARROS OCAMPO, Bartolome",
      "ZEMBORAIN, Antonio",
      "ARNAUDO LOSADA, Ignacio Javier",
      "ORIS DE ROA, Teófilo",
      "DIAZ MATHE, Cruz",
      "CONTEPOMI, Vicente",
      "CZAR, Cristóbal",
      "ALEGRE, Baldomero",
      "VALVERDE, Manuel",
      "TRIGO DE LA BALZE, Honorio",
      "DORMAL, Santiago",
      "ARAMBURU, Iñaki",
      "LEYBA, Fermín Gabriel",
      "MENDIZABAL, Felipe",
    ],
    suplentes: [
      "VILLAMIL, Simón",
      "ORDOÑEZ, Pablo",
      "AYERZA, Iván Federico",
      "SANTAMARINA BERGADÁ, Jerónimo",
      "BARISIC, Milo",
      "SCHAIR, Tomas",
    ],
  },
  {
    categoriaId: "m15-d",
    titulares: [
      "QUIGLEY, Mathew",
      "KAUFMANN, Juan",
      "RICHARDS, Patricio Juan",
      "ESCALANTE, Ignacio",
      "CHIAPPE BECCAR VARELA, Pedro",
      "ZIMMERMANN, Francisco",
      "IGLESIAS ARRIETA, Beltrán",
      "ESTRADA, José María",
      "VINENT FERNANDEZ SPERONI, Benjamín",
      "VIGANÓ, Simon",
      "CHEVALLIER BOUTELL, Gonzalo",
      "POGGI, Joaquín",
      "GARAT NÖLTING, Jaime",
      "BERASATEGUI, Fernando",
      "BELL, Keneth",
    ],
    suplentes: [
      "STODDART, Marcos",
      "ONETO GAONA, Alejandro Blas",
      "SERANTES, Mateo",
      "PALETTE PUEYRREDON, Bautista",
      "BOSCH HOLMBERG, Lucio",
      "ANZORREGUY, Rufino",
      "NAZAR, Florencio",
      "VALLACO, Juan Cruz",
    ],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  // Nombres ya cargados para M15 (fechas previas): id -> nombre exacto.
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
    console.log("\nJugadores NUEVOS (no estaban en fechas previas de M15, revisá el nombre):");
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
