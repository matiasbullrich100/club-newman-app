// Formaciones de la Fecha 4 de M17 (A/B/C), domingo 2026-08-30, como BORRADOR
// (formacionPublicada: false). Transcriptas de las 3 placas que pasó el club.
// Correr con: npm run migrate-m17-fecha4-formaciones   (DRY_RUN=1 para simular).
//
// - A vs San Andrés A (14:00, en San Andrés)  |  B vs San Andrés B (12:30, en San Andrés)
// - C vs Belgrano C (11:00, en Newman)  -- el fixture tenía "Alumni C", se corrige al del placa.
// - Escalante (Manuel), Huber (Ramon) y Vallejos (Silvestre) son titulares en C y ADEMÁS van al
//   banco de B (entran después de jugar en C) -- pedido explícito del club.
//
// Nombres: se toma el que ya está cargado en la base para ese jugador (mismas fechas 1-3 de M17);
// si es un jugador nuevo, se pasa de MAYÚSCULAS a Title Case. Los "nuevos" se listan al correr.
// Idempotente / solo partidos "programado". No toca hora ni cancha del fixture (salvo el rival de C).

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
  rivalCorregido?: string; // si el fixture hay que ajustarlo al de la placa
  titulares: string[];
  suplentes: string[];
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m17-a",
    titulares: [
      "SAENZ VALIENTE, Tomas",
      "MONTOREANO, Beltran",
      "LANFRANCO, Miguel",
      "DOMINGUEZ OLIVERA, Jose",
      "CASTELLI, Vicente",
      "FALCON, Mateo",
      "STEVERLYNCK, Liam",
      "VALVERDE, Francisco",
      "BUSTO CAVANAGH, Fermin",
      "GOMEZ DE ALZAGA, Camilo",
      "ARNAUDO, Pablo",
      "JACA OTAÑO, Beltran",
      "FUENTES ROCHA, Timoteo",
      "LORO MARCHESE, Tomas",
      "GARAT, Simon",
    ],
    suplentes: ["RACCIATI, Ignacio", "DEANE, Javier"],
  },
  {
    categoriaId: "m17-b",
    titulares: [
      "BUCHANAN, Esteban",
      "CAREY PAEZ, Marcos",
      "LOPEZ AUFRANC, Lucas",
      "LISSARRAGUE, Pedro",
      "VEDOYA, Augusto",
      "BOSCH, Justo",
      "SANTAMARINA, Juan",
      "LYNCH, Gonzalo",
      "CUENYA, Ramon",
      "MARINO AGUIRRE, Agustin",
      "ZAVALA, Jean",
      "POMMER, Simon",
      "ZAVALA, Sawens",
      "BIBILONI, Rufino",
      "GALICE NAON, Felix",
    ],
    suplentes: [
      "PEREZ SARTORI, Tomas",
      "LEUPOLD, Francisco",
      "DELFINO, Ignacio",
      "POLIZZA, Juan Diego",
      // entran después de jugar en C:
      "ESCALANTE, Manuel",
      "HUBER, Ramon",
      "VALLEJOS, Silvestre",
    ],
  },
  {
    categoriaId: "m17-c",
    rivalCorregido: "Belgrano C",
    titulares: [
      "MERELLO, Ignacio",
      "VALLEJOS, Silvestre",
      "BUENADER, Ivan",
      "ESCALANTE, Manuel",
      "BAUSILI, Francisco",
      "DIAZ HERRERA, Pedro",
      "BUENADER, Pedro",
      "HUBER, Ramon",
      "CIRIO, Simon",
      "BELAUSTEGUI, Facundo",
      "LANUSSE, Ignacio",
      "DE LA TOUR, Alejandro",
      "MOYANO, Nicolas",
      "PALMA CANE, Ignacio",
      "GARCIA, Gael",
    ],
    suplentes: ["MONSEGUR, Geronimo", "RUIZ, Gustavo", "SERRA GALLO, Gonzalo", "EIJO, Juan Alejandro"],
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
    if (!snap.exists) { console.warn(`SALTEADO ${pid}: no existe.`); continue; }
    const data = snap.data() as { estado?: string; rival?: string };
    if (data.estado !== "programado") { console.warn(`SALTEADO ${pid}: estado="${data.estado}".`); continue; }

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

    const cambioRival = equipo.rivalCorregido && data.rival !== equipo.rivalCorregido;
    console.log(
      `${pid}: ${jugadores.length} jug (${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl)` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "") +
        (cambioRival ? `, rival "${data.rival}" -> "${equipo.rivalCorregido}"` : "")
    );

    if (dryRun) continue;
    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) { batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j); totalDocs++; }
    const patch: Record<string, unknown> = { formacionPublicada: false, enCanchaIds: titularesIds, updatedAt: new Date() };
    if (cambioRival) patch.rival = equipo.rivalCorregido;
    batch.update(partidoRef, patch);
    totalDocs++;
  }

  if (nuevos.length) {
    console.log("\nJugadores NUEVos (no estaban en fechas previas de M17, revisá el nombre):");
    nuevos.forEach((n) => console.log("  " + n));
  }

  if (dryRun) { console.log("\n(DRY RUN) nada escrito."); return; }
  await batch.commit();
  console.log(`\nListo. ${totalDocs} escrituras. Formaciones como BORRADOR (sin publicar).`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
