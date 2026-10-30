// M19 Fecha 11, domingo 2026-11-01 vs Belgrano Athletic (de local, en Newman): A 14:00, B 12:30, C 12:30, D 11:00 (en la
// base figuraba 12:30 -> se corrige), E 12:30. M19 F tiene fecha libre (sin formacion). Formaciones de la planilla del club
// ("M19 · Fecha 11 · todos los equipos"): titulares 1-15 y suplentes con el dorsal de la planilla (hay saltos).
// "BOSCH PELUFFO, Justo" (M19 E) ya viene con la grafia correcta (distinto del Bosch, Justo de M17).
// Se cargan y PUBLICAN (pedido explicito). Idempotente; solo "programado".
// Correr con: npx tsx src/scripts/migrate-m19-fecha11-formaciones.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface EquipoFormacion {
  partidoId: string;
  hora: string;
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    partidoId: "m19-a-f11",
    hora: "14:00",
    titulares: ["WALKER, Cruz", "SOLA, Geronimo", "VON GROLMAN, Juan Pablo", "GALICE NAON, Rodrigo", "GOTI, Enzo", "DOMINGUEZ OLIVERA, Ramon", "CARDONI, Beltran", "LASCOMBES, Facundo", "BOSCH, Lucas", "LAGOS MARMOL, Maximo", "GONZALEZ HUGHES, Marcos", "ABERG COBO, Juan Jose", "LANUSSE, Faustino", "RIVAS, Jeronimo", "LANUSSE, Silvestre"],
    suplentes: [["16", "BOURDIEU, Carlos Maria"], ["17", "LYNCH, Bautista Santiago"], ["18", "DIAZ DE VIVAR, Joaquin"], ["19", "ANCHORENA, Zenon"], ["20", "CHUTE, Benjamin"], ["21", "ITURBE, Jeronimo"], ["22", "ULLOA, Ramon"], ["23", "BARISIC, Ivan"]],
  },
  {
    partidoId: "m19-b-f11",
    hora: "12:30",
    titulares: ["BLAQUIER, Simon", "LYNCH, Bautista Santiago", "DIAZ DE VIVAR, Joaquin", "CZAR, Felix", "ANCHORENA, Zenon", "IBARBIA, Benito", "BOSCH, Emilio", "GALARRAGA, Francisco", "SOLA, Santiago", "LLERENA, Froilan", "ACHAVAL RODRIGUEZ, Felix", "ALTGELT, James", "URANGA, Felipe", "CORNEJO, Rufino Cruz", "GOLLETTI, Sebastian"],
    suplentes: [["16", "ALEGRE, Dalmiro"], ["17", "VIALE, Ramon"], ["18", "GONZALEZ CALDERON, Isidro"], ["19", "FEENEY, Vicente"], ["20", "CASTRO LACROZE, Benjamin"], ["21", "FELLNER OTOOLE, Benjamin"], ["22", "BOSCH, Simon"], ["23", "LOPEZ OLACIREGUI, Cruz"]],
  },
  {
    partidoId: "m19-c-f11",
    hora: "12:30",
    titulares: ["ALEGRE, Dalmiro", "VIALE, Ramon", "VELARDE PENNELLA, Tomas", "CACERES, Marcos", "COLL, Romulo", "RODRIGUEZ RIBAS, Simon", "AUGIER, Tomas", "SANTAMARINA, Miguel", "REYNA, Santos", "FELLNER OTOOLE, Benjamin", "ELIAS, Cristobal", "BOSCH, Simon", "DOMINGUEZ ROVIRALTA, Tobias", "HOFFMANN, Amancio", "LOPEZ OLACIREGUI, Cruz"],
    suplentes: [["16", "THAYS, Agustin"], ["17", "BARBEITO, Pedro"], ["18", "ROSNER, Rufino"], ["19", "LASCOMBES, Santiago"], ["20", "LEONARD, Lucas"], ["21", "LACASE, Manuel"], ["22", "VALLS, Gregorio"], ["23", "HOUSSAY, Tomas"]],
  },
  {
    partidoId: "m19-d-f11",
    hora: "11:00",
    titulares: ["BROWNE, Ignacio", "BARBEITO, Pedro", "BUCHANAN, Felipe Boyd", "SARAVIA, Silvestre", "MACHADO MALBRAN, Santiago", "ORDOÑEZ, Bautista", "CASTELLI, Bautista", "BALLESTER, Justo", "MCCORMICK, Colin Francis", "VIGANO, Martin", "ALONSO, Tadeo", "URANGA, Jeronimo", "OTERO MONSEGUR, Ramon", "ITHURALDE, Felix", "MONTOVIO, Manuel"],
    suplentes: [["18", "ROSNER, Rufino"], ["19", "LASCOMBES, Santiago"], ["20", "VALVERDE LYONS, Bautista"], ["21", "HOUSSAY, Tomas"], ["22", "VALLS, Gregorio"], ["23", "TERRADO, Indalecio"]],
  },
  {
    partidoId: "m19-e-f11",
    hora: "12:30",
    titulares: ["VILA ECHAGUE, Ramon", "MORESCO, Salvador", "ALVARADO, Santos", "SANTAMARINA BERGADA, Eduardo", "ARENAZA, Justo", "LOPEZ SAUBIDET, Felipe", "KAPLUN, Francisco", "SALESE, Silvestre Jose", "LIMPENNY, Nicolas", "MARINO, Sebastian", "BOSCH PELUFFO, Justo", "SUNDBLAD, Simon", "NIELSEN, Pedro Antonio", "PRENESTE, Americo", "GARAT NOLTING, Iñaki"],
    suplentes: [["16", "RICHELET, Lucas"], ["17", "VELA, Marcial"], ["18", "MENDILAHARZU, Jose"], ["19", "GOWLAND, Pedro"], ["20", "LOUREIRO, Benjamin"], ["21", "BERTON MORENO, Gonzalo"], ["23", "COLL URIBURU, Bautista"], ["24", "BARBEITO ORTELLI, Federico"], ["25", "SEGURA, Indalecio"], ["27", "SLUZEWSKI MONTI, Ramon"], ["28", "ASENJO, Nicolas"]],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.partidoId}: ${eq.titulares.length} titulares`);
    const partidoRef = adminDb.collection("partidos").doc(eq.partidoId);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${eq.partidoId} no existe`);
    const d = snap.data() as { estado?: string; fecha?: string; hora?: string; rival?: string };
    if (d.fecha !== "2026-11-01") throw new Error(`${eq.partidoId}: fecha "${d.fecha}" (esperaba 2026-11-01)`);
    if (d.estado !== "programado") {
      console.warn(`SALTEADO ${eq.partidoId}: estado "${d.estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((n, i) => ({ nombre: titleCase(n), dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, n]) => ({ nombre: titleCase(n), dorsal, titular: false, enCancha: false })),
    ];
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${eq.partidoId}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
    console.log(
      `${eq.partidoId} vs ${d.rival} (hora ${d.hora} -> ${eq.hora}): ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      hora: eq.hora,
      formacionPublicada: true,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones cargadas y PUBLICADAS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
