// Formaciones de la Fecha 8 de M16 (A/B/C/D), domingo 2026-10-04, como BORRADOR
// (formacionPublicada: false). Transcriptas de la placa "M16 2026" que paso el club -- OJO: el
// encabezado de la placa es el viejo ("DOMINGO 13/9", San Cirano / El Retiro); se ignora, se toma
// solo la lista de jugadores de cada equipo. No se toca rival/hora/cancha del fixture (en M16 D el
// fixture dice "Hurling B" y la placa "El Retiro B" -- se deja el del fixture).
//
// Nombres: se toma el que ya esta guardado en la base para ese jugador (jugadores/ o plantel de
// cualquier fecha) si el id coincide (ignora may/min y acentos); si es nuevo, se pasa de MAYUSCULAS
// a Title Case y se lista al correr. Suplentes con el dorsal de la placa (16+).
// Correr con: npx tsx src/scripts/migrate-m16-fecha8-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 8;

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
      "BARLETTA, SANTINO",
      "LLAVALLOL, GERONIMO",
      "GILLIGAN, JERONIMO",
      "SAUL, BENJAMIN",
      "TESSORE, BENITO",
      "NORES, FELIPE",
      "MÜLLER, SANTINO",
      "DIAZ DE VIVAR, RAMON",
      "SACKMANN, RAMON",
      "SLUZEWSKI, TOMAS",
      "URANGA, MATEO",
      "CONTEPOMI, SILVESTRE",
      "RODRIGUEZ RIBAS, AGUSTIN",
      "PETERS, JUSTO",
      "AUTILIO, BENJAMIN",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m16-b",
    titulares: [
      "SOLA, JUAN",
      "MIGUENS, SANTIAGO",
      "SALESE, RAMON",
      "IBARGUREN, SANTIAGO",
      "FABBRI, SANTINO",
      "CASA, FELIX",
      "CASTELLI, FELIPE",
      "PALMA, BENJAMIN",
      "PUIG, SALVADOR",
      "SUAYA, LORENZO",
      "HERRERA, RUFINO",
      "RENTERIA, MARCOS",
      "SIMON PADROS, JUAN",
      "NORMAN, MARCOS",
      "OLIVERA, DIOGENES",
    ],
    suplentes: ["RICHELET, JUAN", "CORREA, SANTIAGO", "GUILLANI, JUAN JOSE"],
  },
  {
    categoriaId: "m16-c",
    titulares: [
      "LALOR, MIGUEL",
      "POLIZZA, DELFIN",
      "IBARBIA, RUFINO",
      "ARAMBURU, SANTIAGO",
      "VELARDE, PEDRO",
      "CARDONI, RAFAEL",
      "CASSAGNE, LUIS",
      "MÜLLER, PASCAL",
      "ESTRADA, IGNACIO",
      "MONTOVIO, IGNACIO",
      "VILA ECHAGÜE, JUAN",
      "OCAMPO, SALVADOR",
      "SUMMERS, OLIVER",
      "VAZQUEZ CAPUTO, AGUSTIN",
      "MAMMOLINO, FRANCISCO",
    ],
    suplentes: ["SOUTHALL, GALO"],
  },
  {
    categoriaId: "m16-d",
    titulares: [
      "ALVEAR, FRANCISCO",
      "Mc CORMICK, ALFONSO",
      "VEDOYA, ALFONSO",
      "OLMOS, FELIPE",
      "BECU, MARCOS",
      "GILARDI, SIMON",
      "HELBIG, RUFINO",
      "BOCCARDO, MATEO",
      "LEONARD, SALVADOR",
      "MAQUEDA, RAFAEL",
      "CASTELLI, PEDRO",
      "NICHOLSON, MATEO",
      "MOYANO, SANTIAGO",
      "CAPUTO, FELIX",
      "BOURDIEU, MAX",
    ],
    suplentes: ["KEMP, CRUZ", "GUYOT, LUCAS", "SOUTHALL, GALO"],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  // Nombres ya guardados: id -> nombre exacto (jugadores/ primero, despues plantel de cualquier fecha).
  const previos = new Map<string, string>();
  (await adminDb.collection("jugadores").get()).docs.forEach((d) => {
    const n = (d.data() as { nombre?: string }).nombre;
    if (n) previos.set(d.id, n);
  });
  for (const p of (await adminDb.collection("partidos").get()).docs) {
    (await p.ref.collection("plantel").get()).docs.forEach((d) => {
      const n = (d.data() as { nombre?: string }).nombre;
      if (n && !previos.has(d.id)) previos.set(d.id, n);
    });
  }

  const nombreFinal = (raw: string): { nombre: string; nuevo: boolean } => {
    const tc = titleCase(raw.replace(/\s+,/, ","));
    const previo = previos.get(playerId(tc));
    return previo ? { nombre: previo, nuevo: false } : { nombre: tc, nuevo: true };
  };

  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");
  const batch = adminDb.batch();
  const nuevos: string[] = [];

  for (const equipo of EQUIPOS) {
    const pid = partidoId(equipo.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) {
      console.warn(`SALTEADO ${pid}: no existe.`);
      continue;
    }
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado="${estado}".`);
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

    if (equipo.titulares.length !== 15) throw new Error(`${pid}: ${equipo.titulares.length} titulares`);
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" -> mismo id "${id}".`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !ids.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));

    console.log(
      `${pid}: ${jugadores.length} jug (${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl)` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );

    if (dryRun) continue;
    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, { formacionPublicada: false, enCanchaIds: titularesIds, formacionActualizadaEn: new Date(), updatedAt: new Date() });
  }

  console.log(nuevos.length ? "\nJugadores NUEVOS (revisar nombre):\n  " + nuevos.join("\n  ") : "\nSin jugadores nuevos.");
  if (dryRun) return console.log("\n(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("\nListo. Formaciones como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
