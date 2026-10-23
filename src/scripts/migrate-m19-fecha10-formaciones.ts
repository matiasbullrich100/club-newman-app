// M19 A / B / C / D vs Hindu (Fecha 10, domingo 2026-10-25, de visitante), formaciones pasadas por el club
// ("Equipos M19 20261025.xlsx", hoja ResumenEquipos: titulares dorsal 1-15 + suplentes con el dorsal de la planilla,
// hay saltos). Se cargan como BORRADOR (formacionPublicada: false) -- se publican cuando el club lo pida.
// NO se carga M19 E: la planilla trae solo 12 titulares (faltan los dorsales 8, 11 y 14) -- se espera la lista completa.
// M19 F no trae equipo (fecha libre).
// Correcciones: en M19 A el jugador "ITURBE, Jeronimo" figura titular (#9) Y suplente (#21): se deja solo como titular.
// Idempotente; solo actua sobre partidos "programado". Correr con: npx tsx src/scripts/migrate-m19-fecha10-formaciones.ts
// (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 10;
const FECHA = "2026-10-25";

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
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "m19-a",
    titulares: ["BOURDIEU, Carlos Maria", "WALKER, Cruz", "VON GROLMAN, Juan Pablo", "GALICE NAON, Rodrigo", "CHUTE, Benjamin", "DOMINGUEZ OLIVERA, Ramon", "CARDONI, Beltran", "LASCOMBES, Facundo", "ITURBE, Jeronimo", "ULLOA, Ramon", "BARISIC, Ivan", "ABERG COBO, Juan Jose", "LAGOS MARMOL, Maximo", "RIVAS, Jeronimo", "LANUSSE, Silvestre"],
    suplentes: [["16", "BLAQUIER, Simon"], ["17", "SOLA, Geronimo"], ["18", "GONZALEZ CALDERON, Isidro"], ["19", "GOTI, Enzo"], ["20", "IBARBIA, Benito"], ["22", "URANGA, Felipe"], ["23", "GONZALEZ HUGHES, Marcos"]],
  },
  {
    categoriaId: "m19-b",
    titulares: ["BLAQUIER, Simon", "LYNCH, Bautista Santiago", "GONZALEZ CALDERON, Isidro", "CZAR, Felix", "FEENEY, Vicente", "CASTRO LACROZE, Benjamin", "IBARBIA, Benito", "BOSCH, Emilio", "BOSCH, Lucas", "LLERENA, Froilan", "ACHAVAL RODRIGUEZ, Felix", "ALTGELT, James", "URANGA, Felipe", "HOFFMANN, Amancio", "GOLLETTI, Sebastian"],
    suplentes: [["16", "ALEGRE, Dalmiro"], ["17", "VIALE, Ramon"], ["18", "DIAZ DE VIVAR, Joaquin"], ["19", "COLL, Romulo"], ["20", "GALARRAGA, Francisco"], ["21", "SOLA, Santiago"], ["22", "BOSCH, Simon"], ["23", "LOPEZ OLACIREGUI, Cruz"]],
  },
  {
    categoriaId: "m19-c",
    titulares: ["THAYS, Agustin", "VIALE, Ramon", "VELARDE PENNELLA, Tomas", "CACERES, Marcos", "COLL, Romulo", "RODRIGUEZ RIBAS, Simon", "LEONARD, Lucas", "SANTAMARINA, Miguel", "MCCORMICK, Colin Francis", "FELLNER OTOOLE, Benjamin", "ELIAS, Cristobal", "HOUSSAY, Tomas", "VALLS, Gregorio", "CORNEJO, Rufino Cruz", "LOPEZ OLACIREGUI, Cruz"],
    suplentes: [["16", "ALEGRE, Dalmiro"], ["17", "BARBEITO, Pedro"], ["18", "BUCHANAN, Felipe Boyd"], ["19", "HERNANDEZ SERRANO, Benjamin"], ["21", "VIGANO, Martin"], ["22", "DOMINGUEZ ROVIRALTA, Tobias"], ["23", "ITHURALDE, Felix"]],
  },
  {
    categoriaId: "m19-d",
    titulares: ["BROWNE, Ignacio", "BARBEITO, Pedro", "BUCHANAN, Felipe Boyd", "MACHADO MALBRAN, Santiago", "SARAVIA, Silvestre", "ORDOÑEZ, Bautista", "AUGIER, Tomas", "BALLESTER, Justo", "REYNA, Santos", "LACASE, Manuel", "ALONSO, Tadeo", "URANGA, Jeronimo", "OTERO MONSEGUR, Ramon", "VALVERDE LYONS, Bautista", "MONTOVIO, Manuel"],
    suplentes: [["16", "THAYS, Agustin"], ["17", "ROSNER, Rufino"], ["19", "CASTELLI, Bautista"], ["22", "DOMINGUEZ ROVIRALTA, Tobias"], ["23", "ITHURALDE, Felix"]],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const d = snap.data() as { estado?: string; fecha?: string; rival?: string; hora?: string };
    if (d.fecha !== FECHA) throw new Error(`${pid}: fecha "${d.fecha}" (esperaba ${FECHA})`);
    if (d.estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado "${d.estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...eq.titulares.map((n, i) => ({ nombre: titleCase(n), dorsal: String(i + 1), titular: true, enCancha: true })),
      ...eq.suplentes.map(([dorsal, n]) => ({ nombre: titleCase(n), dorsal, titular: false, enCancha: false })),
    ];
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((x) => !ids.has(x.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
    console.log(
      `${pid} vs ${d.rival} ${d.hora}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: false,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones cargadas como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
