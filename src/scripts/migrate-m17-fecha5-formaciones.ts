// Formaciones de la Fecha 5 de M17 (A/B/C), domingo 2026-09-06, como BORRADOR
// (formacionPublicada: false). Transcriptas del texto que paso el club (A vs Los Tilos A 14:00 en
// Newman, B vs Los Tilos B 12:30 en Newman, C vs BACRC/"Buenos Aires C" 11:00 de visitante --
// coincide con el rival ya cargado en el fixture, no hace falta corregirlo).
// Correr con: npm run migrate-m17-fecha5-formaciones   (DRY_RUN=1 para simular).
//
// Nombres: se toma el que ya esta cargado en la base para ese jugador (mismas fechas previas de
// M17); si es un jugador nuevo, se pasa de MAYUSCULAS a Title Case. Los "nuevos" se listan al
// correr. Idempotente / solo partidos "programado".

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
    categoriaId: "m17-a",
    titulares: [
      "RACCIATI, Ignacio",
      "MONTOREANO, Beltran",
      "LANFRANCO, Miguel",
      "LYNCH, Gonzalo",
      "DOMINGUEZ OLIVERA, Jose",
      "DEANE, Javier",
      "FALCON, Mateo",
      "VALVERDE, Francisco",
      "BUSTO CAVANAGH, Fermin",
      "GOMEZ DE ALZAGA, Camilo",
      "ARNAUDO, Pablo",
      "JACA OTAÑO, Beltran",
      "FUENTES ROCHA, Timoteo",
      "LORO MARCHESE, Tomas",
      "GARAT, Simon",
    ],
    suplentes: ["PERKINS, Jeronimo"],
  },
  {
    categoriaId: "m17-b",
    titulares: [
      "LOPEZ AUFRANC, Lucas",
      "CAREY PAEZ, Marcos",
      "SAENZ VALIENTE, Tomas",
      "VEDOYA, Augusto",
      "LISSARRAGUE, Pedro",
      "BOSCH, Justo",
      "SANTAMARINA, Juan",
      "DELFINO, Ignacio",
      "LEUPOLD, Francisco",
      "MARINO AGUIRRE, Agustin",
      "ZAVALA, Jean",
      "PEREZ SARTORI, Tomas",
      "ZAVALA, Sawens",
      "BIBILONI, Rufino",
      "GALICE NAON, Felix",
    ],
    suplentes: ["BUENADER, Pedro", "POMMER, Simon"],
  },
  {
    categoriaId: "m17-c",
    titulares: [
      "BUCHANAN, Esteban",
      "VALLEJOS, Silvestre",
      "MERELLO, Ignacio",
      "ESCALANTE, Manuel",
      "BAUSILI, Francisco",
      "GOTI, Vicente",
      "DIAZ HERRERA, Pedro",
      "HUBER, Ramon",
      "CIRIO, Simon",
      "BELAUSTEGUI, Facundo",
      "POLIZZA, Juan Diego",
      "MOYANO, Nicolas",
      "EIJO, Juan Alejandro",
      "BUENADER, Ivan",
      "GARCIA, Gael",
    ],
    suplentes: [
      "PRENESTE, Beltran",
      "DE ACHAVAL, Mateo",
      "PALMA CANE, Ignacio",
      "WEINERT, Antonio",
      "ANCHORENA, Santos",
      "LANUSSE, Ignacio",
      "DE LA TOUR, Alejandro",
    ],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  // Nombres ya cargados para M17 (fechas previas): id -> nombre exacto.
  const previos = new Map<string, string>();
  for (const id of partidoIdsDeGrupo("m17")) {
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
    const data = snap.data() as { estado?: string; rival?: string };
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
    console.log("\nJugadores NUEVOS (no estaban en fechas previas de M17, revisá el nombre):");
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
