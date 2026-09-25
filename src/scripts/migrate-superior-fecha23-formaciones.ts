// Carga las formaciones de la Fecha 23 de Plantel Superior (sabado 2026-09-26, vs Atl. del Rosario;
// Pre F vs Los Tilos G) como BORRADOR (formacionPublicada: false) -- transcriptas de
// "FECHA 23 - VS. ATLETICO DEL ROSARIO v.final.xlsx" que paso el club.
// Correr con: npx tsx src/scripts/migrate-superior-fecha23-formaciones.ts
// Con DRY_RUN=1 solo muestra lo que haria:
//   DRY_RUN=1 npx tsx src/scripts/migrate-superior-fecha23-formaciones.ts
//
// Reglas de esta carga (pedido explicito, standing):
//   - Primera, Intermedia y Pre A -> SOLO titulares (sin suplentes)
//   - Pre B, Pre C, Pre D, Pre F  -> titulares + suplentes
//   - M-22: la planilla vino incompleta (11 de 15 titulares) -> NO se carga todavia
//   - Pre E / Pre G / Pre H: ya jugaron el jueves (cargadas aparte)
// Los suplentes "no directos" de la planilla (Deane en Pre B; Shaw Santiago y Naveiro Joaquin en
// Pre C) van como suplentes con el dorsal de la planilla (24/25).
// Correcciones sobre el texto crudo: Pre F #3 decia "Muñoz Tomás x" -> sin la "x" suelta; los
// nombres con nombre compuesto van con coma ("Dewey, Juan Pablo", "Autillio, Juan Cruz") para que
// se lean bien en la app.
//
// Idempotente: pisa el plantel si ya existe y borra jugadores que hayan quedado de una corrida
// anterior. Solo actua sobre partidos en estado "programado".

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 23;

type Supl = string | [string, string]; // nombre, o [dorsal, nombre]

interface EquipoFormacion {
  categoriaId: string;
  titulares: string[];
  suplentes: Supl[];
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "primera",
    titulares: [
      "Prince Miguel",
      "Salese, Beltran",
      "Bosch Bautista",
      "Lascombes, Francisco",
      "Urtubey Alejandro",
      "Montoya Mateo",
      "Ureta Jerónimo",
      "Diaz de Vivar Rodrigo",
      "Marguery Lucas",
      "Gutierrez Taboada Gonzalo",
      "Ortiz Basualdo, Justo",
      "Lanfranco Benjamin",
      "Ulloa Cruz",
      "Marolda, Santiago",
      "Daireaux, Juan Bautista",
    ],
    suplentes: [],
  },
  {
    categoriaId: "intermedia",
    titulares: [
      "Wright James",
      "Mackinlay, Teófilo",
      "Borio Luciano",
      "Cáceres, Tomás",
      "Fortín Pablo",
      "Bonasso Bautista",
      "Garay Teófilo",
      "Irarrázaval, Iñaki",
      "Nava, Lucas",
      "Hardoy, José",
      "Vela, Carlos",
      "Keena Tomas",
      "Prince Simón",
      "Longinotii, Franco",
      "Menendez, Carlos Quinto",
    ],
    suplentes: [],
  },
  {
    categoriaId: "pre-a",
    titulares: [
      "Shaw, Marcos",
      "Pueyrredón Rodrigo",
      "Roggero, Francisco",
      "Cocca Antonio",
      "Ureta Tomas",
      "Bruzone Justo",
      "Benedit, Juan Cruz",
      "Salinas Juan",
      "Torello, Facundo",
      "Jaca Otaño, Iñaki",
      "Silva Alfonso",
      "Uranga, Matías",
      "Iribarren Marcos",
      "Pereyra, Cruz",
      "Gutierrez Taboada Santiago",
    ],
    suplentes: [], // planilla: Ezcurra Ramón, Casa Silvestre -- no se cargan (regla: Pre A sin suplentes)
  },
  {
    categoriaId: "pre-b",
    titulares: [
      "Brandi Facundo",
      "Granato, Belisario",
      "Walker Bautista",
      "Uranga Tomas",
      "Shaw Francisco",
      "Saravia Justo",
      "Demarchi Valentin",
      "Ruso Rufino",
      "Bullrich, Simón",
      "Benedit, Juan",
      "Mignone Germán",
      "Longinotti Tomas",
      "Mc Grech, Juan",
      "Marolda Bautista",
      "Monpelat Lucas",
    ],
    suplentes: [
      "Iribarne Gonzalo",
      "De Elizalde, Iñaki",
      "De Los Heros, Miguel",
      "Dacunto, Juan Pablo",
      "Valls, Tomas",
      "Samilian, Alex",
      "Bertón Moreno, Ignacio",
      ["25", "Deane, Santiago"],
    ],
  },
  {
    categoriaId: "pre-c",
    titulares: [
      "Urtubey Santiago",
      "Herrera, Segundo",
      "Dewey, Juan Pablo",
      "Browne, Benjamin",
      "Sporleder Benicio",
      "Ferreccio, Tomas",
      "Terrado, Marcos",
      "Monpelat, Nicolás",
      "Rauch, Facundo",
      "Vivequin, Cruz",
      "Lanza Juan",
      "Torello, Eduardo",
      "Segura Bautista",
      "Rivas, Bautista",
      "Molina Lucas",
    ],
    suplentes: [
      "Olmos Zenon",
      "Garibaldi Santiago",
      "Frias, Gonzalo",
      "Bollini Marcos",
      "Ruzo Ignacio",
      "Zirolli Marcos",
      ["24", "Shaw Santiago"],
      ["25", "Naveiro Joaquín"],
    ],
  },
  {
    categoriaId: "pre-d",
    titulares: [
      "Naveiro Joaquín",
      "Gaviña, Segundo",
      "Shaw Santiago",
      "Cáceres, Juan Manuel",
      "Monpelat Felipe",
      "Skinner Ignacio",
      "Fellner, Francisco",
      "Lanusse Bautista",
      "Tezanos Pinto, Segundo",
      "Von Wuthenau Facundo",
      "Granato Wenceslao",
      "Iribarne, Bautista",
      "Zirolli Santiago",
      "Uranga Félix",
      "Saubidet, Jerónimo",
    ],
    suplentes: ["Olmos, Silvestre", "Iribarne Ignacio", "Reinwick, Federico", "Adrogué Tomás"],
  },
  {
    categoriaId: "pre-f",
    titulares: [
      "Merello Santiago",
      "Iribas Tomás",
      "Muñoz Tomás", // planilla decia "Muñoz Tomás x"
      "De Larrechea, Simon",
      "Sbarra Bautista",
      "Bosch Vicente",
      "Lanusse Gerónimo",
      "Terán Joaquín",
      "Tedin Rufino",
      "Tapia Valentín",
      "Pujato Francisco",
      "Varela, Simón",
      "Skinner Gonzalo",
      "Santurio Pedro",
      "Adrogué Santiago",
    ],
    suplentes: ["Renati, Mateo", "Cáceres, Wenceslao", "Monpelat Pedro", "Gibelli, Cruz", "Autillio, Juan Cruz", "Daireaux, Marcos"],
  },
];

function jugadoresDe(eq: EquipoFormacion): JugadorPartido[] {
  const out: JugadorPartido[] = eq.titulares.map((nombre, i) => ({
    nombre,
    dorsal: String(i + 1),
    titular: true,
    enCancha: true,
  }));
  eq.suplentes.forEach((s, i) => {
    const [dorsal, nombre] = typeof s === "string" ? [String(16 + i), s] : s;
    out.push({ nombre, dorsal, titular: false, enCancha: false });
  });
  return out;
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");
  const batch = adminDb.batch();

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const estado = (snap.data() as { estado?: string }).estado;
    if (estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado "${estado}"`);
      continue;
    }

    const jugadores = jugadoresDe(eq);
    const ids = new Map<string, string>();
    for (const j of jugadores) {
      const id = playerId(j.nombre);
      if (ids.has(id)) throw new Error(`${pid}: "${j.nombre}" y "${ids.get(id)}" generan el mismo id "${id}"`);
      ids.set(id, j.nombre);
    }
    const plantelSnap = await partidoRef.collection("plantel").get();
    const aBorrar = plantelSnap.docs.filter((d) => !ids.has(d.id));
    const titularesIds = jugadores.filter((j) => j.titular).map((j) => playerId(j.nombre));
    console.log(
      `${pid}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;

    for (const d of aBorrar) batch.delete(d.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, {
      formacionPublicada: false,
      enCanchaIds: titularesIds,
      formacionActualizadaEn: new Date(),
      updatedAt: new Date(),
    });
  }

  if (dryRun) {
    console.log("\n(DRY RUN) nada escrito.");
    return;
  }
  await batch.commit();
  console.log("\nListo. Formaciones cargadas como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
