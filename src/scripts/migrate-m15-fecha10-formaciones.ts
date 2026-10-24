// Formaciones de M15 (A/B/C/D) del domingo 2026-10-25 (Fecha 10), PUBLICADAS (formacionPublicada: true).
// Transcriptas de las 4 placas que paso el club. OJO: la fecha/hora escrita en las placas es la VIEJA (la plantilla no
// se actualizo: dicen 9, 11 y 16 de octubre); el partido se busca por dia 2026-10-25 y coinciden los rivales (Olivos A/B/C).
// M15 D tiene Fecha libre en el fixture y la placa dice "M15D vs MOLINOS C": se carga como AMISTOSO vs Molinos C en
// Newman (mismo criterio que el amistoso vs SIC de la Fecha 8); la hora del fixture no se toca.
// Titulares 1-15; suplentes con el dorsal de la placa (16+). Reynal Abbott va sin "Juan" (nombre unificado).
//
// Nombres: la placa viene "APELLIDO, NOMBRE". Se usa el nombre ya guardado en la base para ese
// jugador (jugadores/ o plantel de cualquier fecha) si el id coincide; si es nuevo, Title Case y se lista al correr.
// Correr con: npx tsx src/scripts/migrate-m15-fecha10-formaciones.ts   (DRY_RUN=1 para solo mirar)
// Idempotente; solo actua sobre partidos "programado".


import { config } from "dotenv";
import { resolve } from "path";
import { FieldValue } from "firebase-admin/firestore";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const FECHA = "2026-10-25";
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
      "ORDOÑEZ, PABLO",
      "ARNAUDO LOSADA, IGNACIO JAVIER",
      "BENVENUTI, VITO",
      "LOPEZ SAUBIDET, JUAN CRUZ",
      "LUNA ALURRALDE, IGNACIO",
      "MIGUENS, FAUSTINO",
      "PECHAR, JOSE",
      "BULLRICH, JOSÉ",
      "LLAVALLOL, MARCOS",
      "GARCÍA IGARZA, JOAQUÍN",
      "REYNAL, ABBOTT", // la placa dice "REYNAL, ABBOTT JUAN"; el nombre es Reynal Abbott
      "ARAMBURU, IÑAKI",
      "LOPEZ AUFRANC, HILARIO",
    ],
    suplentes: [],
  },
  {
    categoriaId: "m15-b",
    titulares: [
      "MARINO, FACUNDO",
      "BARROS OCAMPO, BARTOLOME",
      "AYERZA, IVÁN FEDERICO",
      "CHIAPPE BECCAR VARELA, PEDRO",
      "PEREZ SARTORI, RAMIRO",
      "FIORITO, JAIME",
      "DIAZ MATHE, CRUZ",
      "CZAR, CRISTÓBAL",
      "ALEGRE, BALDOMERO",
      "DORMAL, SANTIAGO",
      "GARAT NÖLTING, JAIME",
      "RODRIGUEZ RIBAS, HILARIO",
      "LEYBA, FERMÍN GABRIEL",
      "TRIGO DE LA BALZE, HONORIO",
      "MENDIZABAL, FELIPE",
    ],
    suplentes: [["16", "TISCORNIA, Félix"]],
  },
  {
    categoriaId: "m15-c",
    titulares: [
      "QUIGLEY, MATHEW",
      "KAUFMANN, JUAN",
      "RICHARDS, PATRICIO JUAN",
      "ESCALANTE, IGNACIO",
      "STODDART, MARCOS",
      "SERANTES, MATEO",
      "ESTRADA, JOSÉ MARÍA",
      "VILLAMIL, SIMÓN",
      "VINENT FERNANDEZ SPERONI, BENJAMÍN", // la placa corta el nombre de pila (BEN...)
      "BARISIC, MILO",
      "BERASATEGUI, FERNANDO",
      "BELL, KENETH",
      "TREVISÁN, PEDRO",
      "CHEVALLIER BOUTELL, GONZALO",
      "BONADEO, SANTOS",
    ],
    suplentes: [["16", "ANZORREGUY, Rufino"]],
  },
  {
    categoriaId: "m15-d",
    titulares: [
      "MATTA Y TREJO, ALFONSO",
      "GRETHER, EMILIO",
      "NAZAR, FLORENCIO",
      "ZIMMERMANN, FRANCISCO",
      "ONETO GAONA, ALEJANDRO BLAS",
      "IGLESIAS ARRIETA, BELTRÁN",
      "PRENESTE, SIMON",
      "RESTUCCI MICHELI, LUCIO",
      "PALETTE PUEYRREDON, BAUTISTA",
      "POGGI, JOAQUÍN",
      "IBARZABAL, TOMÁS",
      "BELÁUSTEGUI, ISIDRO",
      "BOSCH HOLMBERG, LUCIO",
      "VALLACO, JUAN CRUZ",
      "PALMA CANE, LUCAS",
    ],
    suplentes: [["16", "MORANDO, Aldo"]],
  },
];

// Fecha libre del fixture que la placa convierte en amistoso (categoriaId -> rival de la placa).
const AMISTOSOS: Record<string, string> = { "m15-d": "Molinos C" };

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
    const d = q.docs[0].data() as { estado?: string; rival?: string; hora?: string; esLocal?: boolean; cancha?: string; notaEspecial?: string };
    if (d.estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado="${d.estado}".`);
      continue;
    }

    const amistosoRival = AMISTOSOS[equipo.categoriaId];
    const cambiaAAmistoso = !!amistosoRival && d.notaEspecial === "Fecha libre";

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
    if (cambiaAAmistoso) {
      batch.update(partidoRef, { rival: amistosoRival, esLocal: true, cancha: "Newman", amistoso: true, notaEspecial: FieldValue.delete() });
    }
    batch.update(partidoRef, { formacionPublicada: true, enCanchaIds: titularesIds, formacionActualizadaEn: new Date(), updatedAt: new Date() });
  }

  if (cambiados.length) console.log("\nNombre guardado distinto al de la placa:\n  " + cambiados.join("\n  "));
  console.log(nuevos.length ? "\nJugadores NUEVOS (revisar nombre):\n  " + nuevos.join("\n  ") : "\nSin jugadores nuevos.");
  if (dryRun) return console.log("\n(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("\nListo. Formaciones PUBLICADAS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
