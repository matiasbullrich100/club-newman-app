// Formaciones de M15 (A/B/C/D) del domingo 2026-10-04 vs SIC, como BORRADOR (formacionPublicada: false).
// Transcriptas de las 4 placas que paso el club (OJO: el encabezado "Ganadores - Fecha 4" de la placa
// es el viejo, se ignora; el partido se busca por dia 2026-10-04). Titulares 1-15; suplentes
// con el dorsal de la placa (16+; A y C no traen suplentes). No se toca rival/hora/cancha: se
// imprimen para comparar con la placa (A 11:00, B 09:30, C 11:00, D 09:30, en Newman).
//
// Nombres: la placa viene "APELLIDO, NOMBRE". Se usa el nombre ya guardado en la base para ese
// jugador (jugadores/ o plantel de cualquier fecha) si el id coincide (ignora may/min, acentos y
// el orden de las palabras); si es nuevo, se deja Title Case y se lista al correr.
// Correr con: npx tsx src/scripts/migrate-m15-fecha8-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const FECHA = "2026-10-04";
const PARTICULAS = new Set(["de", "del", "la", "y", "von", "van"]);

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (!w ? w : i > 0 && PARTICULAS.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

// "WALKER, CRUZ" / "WALKER, Cruz" -> "Walker, Cruz"
function canonico(raw: string): string {
  const [ape, ...resto] = raw.split(",");
  return resto.length ? `${titleCase(ape.trim())}, ${titleCase(resto.join(",").trim())}` : titleCase(raw.trim());
}

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m15-a",
    titulares: [
      "LLAMBI BOVINO, FELIPE",
      "SOLA, BENICIO",
      "ARAUJO, SANTOS",
      "AMARAL TRIGO, MILO",
      "PEREZ SARTORI, RAMIRO",
      "LOPEZ SAUBIDET, JUAN CRUZ",
      "LUNA ALURRALDE, IGNACIO",
      "MIGUENS, FAUSTINO",
      "PECHAR, JOSE",
      "VALVERDE, MANUEL",
      "LLAVALLOL, MARCOS",
      "GARCÍA IGARZA, JOAQUÍN",
      "REYNAL, ABBOTT", // la placa dice "REYNAL, ABBOTT JUAN" pero el nombre es Reynal Abbott (sin Juan)
      "TISCORNIA, FÉLIX",
      "LOPEZ AUFRANC, HILARIO",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m15-b",
    titulares: [
      "MARINO, FACUNDO",
      "BARROS OCAMPO, BARTOLOME",
      "ZEMBORAIN, ANTONIO",
      "SANTAMARINA BERGADÁ, JERÓNIMO",
      "ORIS DE ROA, TEÓFILO",
      "FIORITO, JAIME",
      "CZAR, CRISTÓBAL",
      "CONTEPOMI, VICENTE",
      "ALEGRE, BALDOMERO",
      "BULLRICH, JOSÉ",
      "TRIGO DE LA BALZE, HONORIO",
      "ARAMBURU, IÑAKI",
      "RODRIGUEZ RIBAS, HILARIO",
      "GARAT NÖLTING, JAIME",
      "MENDIZABAL, FELIPE",
    ],
    suplentes: [
      ["16", "BENVENUTI, Vito"],
      ["17", "AYERZA, Iván Federico"],
      ["18", "ORDOÑEZ, Pablo"],
      ["19", "KAUFMANN, Juan"],
      ["20", "VILLAMIL, Simón"],
      ["21", "VINENT FERNANDEZ SPERONI, Benjamín"],
      ["22", "DORMAL, Santiago"],
      ["23", "SCHAIR, Tomas"],
    ],
  },
  {
    categoriaId: "m15-c",
    titulares: [
      "ORDOÑEZ, PABLO",
      "KAUFMANN, JUAN",
      "RICHARDS, PATRICIO JUAN",
      "ESCALANTE, IGNACIO",
      "IGLESIAS ARRIETA, BELTRÁN",
      "SERANTES, MATEO",
      "DIAZ MATHE, CRUZ",
      "VILLAMIL, SIMÓN",
      "VINENT FERNANDEZ SPERONI, BENJAMÍN", // el nombre de pila se corta en la placa; completo segun el suplente 21 de M15 B
      "BARISIC, MILO",
      "TREVISÁN, PEDRO",
      "DORMAL, SANTIAGO",
      "SCHAIR, TOMAS",
      "LEYBA, FERMÍN GABRIEL",
      "ANZORREGUY, RUFINO",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m15-d",
    titulares: [
      "MATTA Y TREJO, ALFONSO",
      "QUIGLEY, MATHEW",
      "GRETHER, EMILIO",
      "ESTRADA, JOSÉ MARÍA",
      "CHIAPPE BECCAR VARELA, PEDRO",
      "MORANDO, ALDO",
      "BONADEO, SANTOS",
      "STODDART, MARCOS",
      "BELL, KENETH",
      "VIGANÓ, SIMON",
      "BERASATEGUI, FERNANDO",
      "POGGI, JOAQUÍN",
      "BOSCH HOLMBERG, LUCIO",
      "CHEVALLIER BOUTELL, GONZALO",
      "VALLACO, JUAN CRUZ",
    ],
    suplentes: [
      ["16", "RESTUCCI MICHELI, Lucio"],
      ["17", "WAISMAN, Matias"],
      ["18", "PALETTE Pueyrredon, Bautista"],
      ["19", "IBARZABAL, Tomás"],
      ["20", "BELÁUSTEGUI, Isidro"],
      ["21", "NAZAR, Florencio"],
    ],
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
    const c = canonico(raw);
    const previo = previos.get(playerId(c));
    return previo ? { nombre: previo, nuevo: false } : { nombre: c, nuevo: true };
  };

  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");
  const batch = adminDb.batch();
  const nuevos: string[] = [];
  const cambiados: string[] = [];

  for (const equipo of EQUIPOS) {
    const q = await adminDb.collection("partidos").where("categoriaId", "==", equipo.categoriaId).where("fecha", "==", FECHA).get();
    if (q.size !== 1) {
      console.warn(`SALTEADO ${equipo.categoriaId}: ${q.size} partidos el ${FECHA}.`);
      continue;
    }
    const partidoRef = q.docs[0].ref;
    const pid = partidoRef.id;
    const d = q.docs[0].data() as { estado?: string; rival?: string; hora?: string; esLocal?: boolean; cancha?: string };
    if (d.estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado="${d.estado}".`);
      continue;
    }

    const jugadores: JugadorPartido[] = [];
    equipo.titulares.forEach((raw, i) => {
      const { nombre, nuevo } = nombreFinal(raw);
      if (nuevo) nuevos.push(`${pid} #${i + 1}: ${nombre}`);
      else if (nombre !== canonico(raw)) cambiados.push(`${pid} #${i + 1}: "${raw}" -> usa guardado "${nombre}"`);
      jugadores.push({ nombre, dorsal: String(i + 1), titular: true, enCancha: true });
    });
    equipo.suplentes.forEach(([dorsal, raw]) => {
      const { nombre, nuevo } = nombreFinal(raw);
      if (nuevo) nuevos.push(`${pid} #${dorsal}: ${nombre}`);
      else if (nombre !== canonico(raw)) cambiados.push(`${pid} #${dorsal}: "${raw}" -> usa guardado "${nombre}"`);
      jugadores.push({ nombre, dorsal, titular: false, enCancha: false });
    });

    if (equipo.titulares.length !== 15) throw new Error(`${pid}: ${equipo.titulares.length} titulares`);
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" -> mismo id "${id}".`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));

    console.log(
      `${pid} vs ${d.rival} (${d.esLocal ? "local" : "visitante"}, ${d.cancha ?? "-"}) ${d.hora ?? "-"}: ${jugadores.length} jug (${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl)` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );

    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, { formacionPublicada: false, enCanchaIds: titularesIds, formacionActualizadaEn: new Date(), updatedAt: new Date() });
  }

  if (cambiados.length) console.log("\nNombre guardado distinto al de la placa:\n  " + cambiados.join("\n  "));
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
