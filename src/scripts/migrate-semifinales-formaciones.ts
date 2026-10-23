// Carga y PUBLICA las formaciones de las SEMIFINALES de playoff (Fecha 27) de Intermedia, Pre A, Pre B, M-22, Pre C,
// Pre D, Pre E y Pre F, transcriptas de la planilla del club (foto "Grupo 1..5"): titulares 1-15 y suplentes con el
// dorsal de la planilla (hay saltos). Pedido explicito de esta semana: se cargan TAMBIEN los suplentes de Inter y Pre A
// (normalmente solo van titulares). No se cargan las listas de Lesionados / De viaje / Largaron / Reservas.
// Correcciones sobre el texto de la planilla: "Muñoz Tomás x" -> sin la "x"; nombres de pila compuestos con coma
// ("Dewey, Juan Pablo", "Von Wuthenau, Juan Cruz", "Pavlovsky, José María", "Benedit, Juan Cruz") para que splitNombre()
// los separe bien; "Gutierrez Taboada S" (cortado en la foto) -> "Gutierrez Taboada Santiago", como en la fecha 26.
// Idempotente; solo actua sobre partidos "programado" de la Fecha 27.
// Correr con: npx tsx src/scripts/migrate-semifinales-formaciones.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 27;

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
    categoriaId: "intermedia", // vs SIC, sab 18:00
    titulares: ["Bosch, Isidro", "Perkins Fermín", "Lozano Manuel", "Cáceres, Tomás", "Fortín Pablo", "Bonasso Bautista", "Ureta Jerónimo", "Garay Teófilo", "Nava, Lucas", "Llerena Florencio", "Vela, Carlos", "Keena Tomás", "Ulloa Cruz", "Longinotii, Franco", "Gutierrez Taboada Santiago"],
    suplentes: [["16", "Mackinlay, Teófilo"], ["17", "Borio Luciano"], ["18", "Cocca Antonio"]],
  },
  {
    categoriaId: "pre-a", // vs CASI, sab 16:00
    titulares: ["Wright James", "Pueyrredón Rodrigo", "Dewey, Juan Pablo", "Ezcurra Ramón", "Ureta Tomas", "Salinas Juan", "Bruzone Justo", "Ruso Rufino", "Torello, Facundo", "Hardoy, José", "Silva Alfonso", "Uranga, Matías", "Casa Silvestre", "Pereyra, Cruz", "Monpelat Lucas"],
    suplentes: [["16", "Benedit, Juan Cruz"], ["17", "Mignone Germán"]],
  },
  {
    categoriaId: "pre-b", // vs SIC, sab 14:00
    titulares: ["Shaw, Marcos", "Granato, Belisario", "Roggero, Francisco", "Uranga Tomas", "Shaw Francisco", "Dacunto, Juan Pablo", "Saravia Justo", "Monpelat, Nicolás", "Bullrich, Simón", "Benedit, Juan", "Lanza Juan", "Iribarren Marcos", "Mc Grech, Juan", "Marolda Bautista", "Von Wuthenau, Juan Cruz"],
    suplentes: [["16", "Valls, Tomas"], ["17", "Jaca Otaño, Iñaki"], ["18", "Longinotti Tomas"]],
  },
  {
    categoriaId: "m-22", // vs Hindu, vie 19:00 en Hindu
    titulares: ["De Elizalde, Iñaki", "Olmos Zenon", "Angelino, Alfonso", "Carey, Lucas", "Lopez Fresco, Diego", "Sola. Agusto", "Espinosa Segundo", "Mendonça, Tomás", "Benitez Cruz Blas", "Samilian, Alex", "Ramos Facundo", "Keena Manuel", "Pujato, Matías", "Socas, Justo", "Molina Lucas"],
    suplentes: [["16", "Deane, Santiago"], ["17", "Garibaldi Santiago"], ["18", "Lanusse Bautista"], ["19", "Martinez Roberto"], ["20", "Dupont, Mateo"], ["22", "Herrera, Segundo"], ["23", "Walker Bautista"], ["24", "Martignone, Saturnino"]],
  },
  {
    categoriaId: "pre-c", // vs SIC, sab 12:00
    titulares: ["Ibarguren Tomás", "Iribarne Gonzalo", "Walker Bautista", "Browne, Benjamin", "Sporleder Benicio", "Terrado, Marcos", "Ferreccio, Tomas", "Ezcurra, Felipe", "Rauch, Facundo", "Vivequin, Cruz", "Uranga Félix", "Zirolli Santiago", "Bertón Moreno, Ignacio", "Zirolli Marcos", "Segura Bautista"],
    suplentes: [["16", "Herrera, Segundo"], ["17", "De Los Heros, Miguel"], ["18", "Irarrázaval, Bautista"], ["19", "Bollini Marcos"], ["20", "Torello Eduardo"]],
  },
  {
    categoriaId: "pre-d", // vs CUBA, sab 10:00
    titulares: ["Urtubey Santiago", "Gaviña, Segundo", "Garay, Delfin", "Frias, Gonzalo", "Monpelat Felipe", "Fellner, Francisco", "Cáceres, Juan Manuel", "Valls, José Quinto", "Iribarne Ignacio", "Von Wuthenau Facundo", "Granato Wenceslao", "Iribarne, Bautista", "Martignone, Saturnino", "Adrogué Tomás", "Saubidet, Jerónimo"],
    suplentes: [["16", "Naveiro Joaquín"], ["17", "Gowland Esteban"], ["18", "Tezanos Pinto, Segundo"], ["19", "Bosch Alfonso"]],
  },
  {
    categoriaId: "pre-e", // vs CUBA, vie 21:00
    titulares: ["Gassiebayle Ramón", "Aramburu Marcos", "Shaw Santiago", "De Larrechea, Simon", "Pavlovsky, José María", "Reyna José", "Lanusse, Joaquín", "Olmos, Silvestre", "Davel, Lucas", "García Igarza Nicolás", "García Zavaleta, Fermín", "Reinwick, Federico", "Busto, José", "Pommer, Felipe", "Massone Ramiro"],
    suplentes: [["16", "Aramburu Bautista"], ["17", "Bosch Fermín"], ["18", "Alvarado, Juan"], ["19", "Gibelli, Cruz"], ["20", "Pernisek Federico"]],
  },
  {
    categoriaId: "pre-f", // vs Alumni, vie 19:00
    titulares: ["Bosch Ramón", "Iribas Tomás", "Muñoz Tomás", "Cáceres, Wenceslao", "Sbarra Bautista", "Ibañez Joaquín", "Skinner Ignacio", "Terán Joaquín", "Tedin Rufino", "Otero, Benjamín", "Pujato Francisco", "Sluzewski Monto, Santiago", "Varela, Simón", "Santurio Pedro", "Galarraga, Simón"],
    suplentes: [["16", "Merello Santiago"], ["17", "Lanusse, Santiago"], ["18", "Lanusse Gerónimo"], ["19", "Bosch Vicente"], ["20", "Lopez Saubidet Martín"], ["21", "Adrogué Santiago"], ["22", "Tapia Valentín"], ["24", "Aramburu Bautista"]],
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
    const d = snap.data() as { estado?: string; fase?: string; rival?: string; fecha?: string; hora?: string };
    if (d.fase !== "semifinal") throw new Error(`${pid}: no es una semifinal`);
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
      `${pid} vs ${d.rival} ${d.fecha} ${d.hora}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` + (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: true,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) return console.log("(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("Listo. Formaciones de semifinales cargadas y PUBLICADAS.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
