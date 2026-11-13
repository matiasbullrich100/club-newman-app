// Formaciones de las FINALES de playoff del sabado 2026-11-14 (Fecha 28, fase "final") de Pre A (vs Hindu, 14:00),
// Pre E (vs SIC, 12:00) y Pre F (vs Los Tilos, 10:00), transcriptas de la planilla del club (foto "Pre E vs SIC /
// Pre F vs Los Tilos / Pre A vs Hindu"). Se cargan como BORRADOR (formacionPublicada: false): el club las publica.
// Reglas de esta carga:
//  - Los jugadores en CELESTE al pie de cada lista son las "reservas": no se cargan (pedido explicito, por ahora).
//  - Suplentes con el dorsal de la planilla (hay saltos). Pre A va solo con titulares (regla fija: Primera, Inter y
//    Pre A no llevan suplentes, aunque la planilla los traiga).
//  - "Muñoz Tomás x" -> sin la "x". "Sluzewski Monto, Santiago" -> "Sluzewski, Santiago" (el club lo corrigio: es
//    solo Santiago Sluzewski; el nombre viejo de la planilla ya no existe en la base).
//  - "Gassibayle Ramón" (planilla) -> "Gassiebayle Ramón" (como esta guardado, 32 partidos): una sola ficha.
//  - Nombres: se usa el ya guardado en la base para ese jugador (jugadores/ o plantel de cualquier fecha) si el id
//    coincide; si es nuevo se lista al correr, junto con los nombres CASI IGUALES a uno ya guardado (por si es una
//    errata de la planilla). No se toca rival/hora/cancha del fixture: se imprimen para comparar.
// Idempotente; solo actua sobre partidos "programado" de la Fecha 28 con fase "final".
// Correr con: npx tsx src/scripts/migrate-finales-formaciones.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const NUMERO_FECHA = 28;

function titleCase(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface EquipoFormacion {
  categoriaId: string;
  hora: string; // la de la planilla, para comparar con el fixture
  titulares: string[];
  suplentes: [string, string][]; // [dorsal, nombre]
}

const EQUIPOS: EquipoFormacion[] = [
  {
    categoriaId: "pre-a", // vs Hindu, 14:00 -- solo titulares
    hora: "14:00",
    titulares: [
      "Wright James",
      "Pueyrredón Rodrigo",
      "Dewey, Juan Pablo",
      "Ezcurra Ramón",
      "Ureta Tomas",
      "Salinas Juan",
      "Benedit, Juan Cruz",
      "Ruso Rufino",
      "Torello, Facundo",
      "Hardoy, José",
      "Mignone Germán",
      "Uranga, Matías",
      "Casa Silvestre",
      "Pereyra, Cruz",
      "Gutierrez Taboada Santiago",
    ],
    suplentes: [],
  },
  {
    categoriaId: "pre-e", // vs SIC, 12:00
    hora: "12:00",
    titulares: [
      "Gassiebayle Ramón", // la planilla dice "Gassibayle"; en la base esta "Gassiebayle" (32 partidos + tarjetas): se mantiene
      "Aramburu Marcos",
      "Shaw Santiago",
      "De Larrechea, Simon",
      "Pavlovsky, José María",
      "Reyna José",
      "Lanusse, Joaquín",
      "Olmos, Silvestre",
      "Davel, Lucas",
      "Garcia Igarza Nicolas",
      "García Zavaleta, Fermín",
      "Reinwick, Federico",
      "Busto, José",
      "Bosch Alfonso",
      "Adrogué Santiago",
    ],
    suplentes: [
      ["16", "Aramburu Bautista"],
      ["17", "Bosch Fermín"],
      ["18", "Alvarado, Juan"],
      ["19", "Martinez Roberto"],
      ["20", "Von Wuthenau Facundo"],
      ["21", "Pernisek Federico"],
      // 23 Gowland Esteban: celeste (reserva), no se carga
    ],
  },
  {
    categoriaId: "pre-f", // vs Los Tilos, 10:00
    hora: "10:00",
    titulares: [
      "Bosch Ramón",
      "Iribas Tomás",
      "Muñoz Tomás",
      "Lanusse Gerónimo",
      "Sbarra Bautista",
      "Ibañez Joaquín",
      "Bosch Vicente",
      "Skinner Ignacio",
      "Tedin Rufino",
      "Otero, Benjamín",
      "Pujato Francisco",
      "Sluzewski, Santiago",
      "Pommer, Felipe",
      "Santurio Pedro",
      "Galarraga, Simón",
    ],
    suplentes: [
      ["16", "Merello Santiago"],
      ["17", "Lanusse, Santiago"],
      ["18", "Cáceres, Wenceslao"],
      ["19", "Terán Joaquín"],
      ["20", "Gibelli, Cruz"],
      ["21", "Tapia Valentín"],
      ["22", "Daireaux, Marcos"],
      ["25", "Aramburu Bautista"],
      // 27 Lopez Saubidet Martín, 28 Renati Mateo, 29 Heidkamp Felipe, 30 Skinner Gonzalo: celestes (reservas), no se cargan
    ],
  },
];

function distancia(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");

  // Nombres ya guardados: id -> nombre exacto (jugadores/ primero, despues el plantel de estas 3 categorias).
  const previos = new Map<string, string>();
  (await adminDb.collection("jugadores").get()).docs.forEach((d) => {
    const n = (d.data() as { nombre?: string }).nombre;
    if (n) previos.set(d.id, n);
  });
  const refs = EQUIPOS.flatMap((e) => Array.from({ length: NUMERO_FECHA }, (_, i) => adminDb.collection("partidos").doc(partidoId(e.categoriaId, i + 1))));
  await Promise.all(
    refs.map(async (r) => {
      (await r.collection("plantel").get()).docs.forEach((d) => {
        const n = (d.data() as { nombre?: string }).nombre;
        if (n && !previos.has(d.id)) previos.set(d.id, n);
      });
    })
  );

  const nombreFinal = (raw: string): { nombre: string; nuevo: boolean } => {
    const previo = previos.get(playerId(raw));
    return previo ? { nombre: previo, nuevo: false } : { nombre: raw, nuevo: true };
  };

  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");
  const batch = adminDb.batch();
  const nuevos: string[] = [];
  const parecidos: string[] = [];

  for (const eq of EQUIPOS) {
    if (eq.titulares.length !== 15) throw new Error(`${eq.categoriaId}: ${eq.titulares.length} titulares`);
    const pid = partidoId(eq.categoriaId, NUMERO_FECHA);
    const partidoRef = adminDb.collection("partidos").doc(pid);
    const snap = await partidoRef.get();
    if (!snap.exists) throw new Error(`${pid} no existe`);
    const d = snap.data() as { estado?: string; fase?: string; rival?: string; fecha?: string; hora?: string; esLocal?: boolean; cancha?: string };
    if (d.fase !== "final") throw new Error(`${pid}: no es una final`);
    if (d.estado !== "programado") {
      console.warn(`SALTEADO ${pid}: estado "${d.estado}"`);
      continue;
    }
    if (d.hora !== eq.hora) console.warn(`  OJO ${pid}: hora del fixture "${d.hora}" vs planilla "${eq.hora}" (no se toca)`);

    const jugadores: JugadorPartido[] = [];
    const agregar = (raw: string, dorsal: string, titular: boolean) => {
      const { nombre, nuevo } = nombreFinal(raw);
      if (nuevo) {
        nuevos.push(`${pid} #${dorsal}: ${nombre}`);
        const id = playerId(nombre);
        const cerca = [...previos.entries()].filter(([pid2]) => distancia(id, pid2) <= 2).map(([, n]) => n);
        if (cerca.length) parecidos.push(`${pid} #${dorsal}: "${nombre}" se parece a guardado: ${cerca.join(" | ")}`);
      }
      jugadores.push({ nombre, dorsal, titular, enCancha: titular });
    };
    eq.titulares.forEach((raw, i) => agregar(raw, String(i + 1), true));
    eq.suplentes.forEach(([dorsal, raw]) => agregar(raw, dorsal, false));

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
      `${pid} vs ${d.rival} (${d.esLocal ? "local" : "visitante"}, ${d.cancha}) ${d.fecha} ${d.hora}: ${titularesIds.length} tit + ${jugadores.length - titularesIds.length} supl` +
        (aBorrar.length ? `, borra ${aBorrar.length} viejos` : "")
    );
    if (dryRun) continue;
    for (const x of aBorrar) batch.delete(x.ref);
    for (const j of jugadores) batch.set(partidoRef.collection("plantel").doc(playerId(j.nombre)), j);
    batch.update(partidoRef, { formacionPublicada: false, enCanchaIds: titularesIds, formacionActualizadaEn: new Date(), updatedAt: new Date() });
  }

  console.log(nuevos.length ? "\nJugadores NUEVOS (revisar nombre):\n  " + nuevos.join("\n  ") : "\nSin jugadores nuevos.");
  if (parecidos.length) console.log("\nPARECIDOS a un nombre ya guardado (posible errata):\n  " + parecidos.join("\n  "));
  if (dryRun) return console.log("\n(DRY RUN) nada escrito.");
  await batch.commit();
  console.log("\nListo. Formaciones de las finales cargadas como BORRADOR (sin publicar).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
