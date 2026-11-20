// Torneo Veco Villegas (M19), sabado 2026-11-21 en Tucuman: 10:00 vs Jockey Club Salta y 17:00 vs Universitario de Tucuman.
// Newman va con una lista cerrada de 30 jugadores ("Jugadores_Newman_2026.xlsx"). Crea los dos partidos (categoria m19-a,
// Fecha 12 y 13: fuera del fixture de URBA, no cuentan para sus tablas) y carga una formacion TENTATIVA (BORRADOR) para
// cada uno, armada por puesto habitual y por el equipo (A/B/C/D) donde mas jugo cada uno; el Manager la cambia y publica.
// Los 15 titulares de un partido no se repiten en el otro (los 30 juegan); los suplentes 16-23 de cada partido salen de
// los titulares del otro. Nombres: el ya guardado en la base si el id coincide; si no, el de ALIAS / la planilla.
// Idempotente; solo actua si el partido no existe o sigue "programado". Correr con: npx tsx src/scripts/cargar-veco-villegas-m19.ts
// (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const CATEGORIA = "m19-a";
const TORNEO = "Torneo Veco Villegas";

const POOL = [
  "Aberg Cobo, Juan José", "Achaval Rodriguez, Felix José", "Altgelt, James", "Anchorena, Zenón María De", "Barisic, Iván",
  "Belaustegui, Vicente", "Blaquier, Simon", "Bosch, Emilio", "Bosch, Lucas", "Bourdieu, Carlos Maria", "Cardoni, Beltran",
  "Castro Lacroze, Benjamin", "Chiappe, Mateo", "Chute, Benjamin", "Diaz De Vivar, Joaquin", "Galice Naon, Rodrigo",
  "Golletti, Sebastian José", "Gonzalez Calderon, Isidro", "Gonzalez Hughes, Marcos", "Goti, Enzo", "Lagos Marmol, Maximo",
  "Lanusse, Silvestre", "Lascombes, Facundo Juan", "Llerena, Froilan", "Lynch, Bautista", "Parrondo, Simon", "Sola, Santiago",
  "Ulloa, Ramón", "Uranga, Felipe", "Von Grolman Solá, Juan Pablo",
];
// Como figuran ya guardados en la base (los de la planilla traen un segundo nombre / apellido de mas).
const ALIAS: Record<string, string> = {
  "Achaval Rodriguez, Felix José": "Achaval Rodriguez, Felix",
  "Golletti, Sebastian José": "Golletti, Sebastian",
  "Lascombes, Facundo Juan": "Lascombes, Facundo",
  "Lynch, Bautista": "Lynch, Bautista Santiago",
  "Von Grolman Solá, Juan Pablo": "Von Grolman, Juan Pablo",
};

// Titulares 1-15 y suplentes 16-23 (apellido, nombre de la lista).
const PARTIDOS = [
  {
    numeroFecha: 12, hora: "10:00", rival: "Jockey Club Salta",
    titulares: ["Bourdieu, Carlos Maria", "Lynch, Bautista", "Von Grolman Solá, Juan Pablo", "Galice Naon, Rodrigo", "Chute, Benjamin", "Goti, Enzo", "Cardoni, Beltran", "Lascombes, Facundo Juan", "Bosch, Lucas", "Lanusse, Silvestre", "Barisic, Iván", "Aberg Cobo, Juan José", "Lagos Marmol, Maximo", "Gonzalez Hughes, Marcos", "Ulloa, Ramón"],
    suplentes: ["Parrondo, Simon", "Blaquier, Simon", "Diaz De Vivar, Joaquin", "Chiappe, Mateo", "Castro Lacroze, Benjamin", "Sola, Santiago", "Llerena, Froilan", "Belaustegui, Vicente"],
  },
  {
    numeroFecha: 13, hora: "17:00", rival: "Universitario de Tucumán",
    titulares: ["Blaquier, Simon", "Parrondo, Simon", "Diaz De Vivar, Joaquin", "Chiappe, Mateo", "Gonzalez Calderon, Isidro", "Bosch, Emilio", "Anchorena, Zenón María De", "Castro Lacroze, Benjamin", "Sola, Santiago", "Llerena, Froilan", "Achaval Rodriguez, Felix José", "Altgelt, James", "Uranga, Felipe", "Golletti, Sebastian José", "Belaustegui, Vicente"],
    suplentes: ["Lynch, Bautista", "Bourdieu, Carlos Maria", "Von Grolman Solá, Juan Pablo", "Galice Naon, Rodrigo", "Lascombes, Facundo Juan", "Bosch, Lucas", "Lagos Marmol, Maximo", "Ulloa, Ramón"],
  },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");

  // Chequeos de la lista: 30 distintos y cada titular/suplente sale de ellos.
  if (new Set(POOL).size !== 30) throw new Error("la lista no tiene 30 jugadores distintos");
  const titularesTodos = PARTIDOS.flatMap((p) => p.titulares);
  if (new Set(titularesTodos).size !== 30 || !titularesTodos.every((n) => POOL.includes(n))) throw new Error("los titulares de los 2 partidos tienen que ser los 30 sin repetir");
  for (const p of PARTIDOS) if (!p.suplentes.every((n) => POOL.includes(n)) || p.suplentes.some((n) => p.titulares.includes(n))) throw new Error("suplentes mal armados");

  // Nombres ya guardados: id -> nombre exacto (jugadores/ y el plantel de M19 A-E).
  const previos = new Map<string, string>();
  (await adminDb.collection("jugadores").get()).docs.forEach((d) => {
    const n = (d.data() as { nombre?: string }).nombre;
    if (n) previos.set(d.id, n);
  });
  const refs = ["a", "b", "c", "d", "e"].flatMap((l) => Array.from({ length: 11 }, (_, i) => adminDb.collection("partidos").doc(partidoId(`m19-${l}`, i + 1))));
  await Promise.all(
    refs.map(async (r) =>
      (await r.collection("plantel").get()).docs.forEach((d) => {
        const n = (d.data() as { nombre?: string }).nombre;
        if (n && !previos.has(d.id)) previos.set(d.id, n);
      })
    )
  );

  const nombreFinal = (raw: string) => {
    const base = ALIAS[raw] ?? raw;
    return previos.get(playerId(base)) ?? previos.get(playerId(raw)) ?? base;
  };
  const nuevos = POOL.filter((n) => !previos.has(playerId(ALIAS[n] ?? n)) && !previos.has(playerId(n)));
  console.log(nuevos.length ? `Jugadores NUEVOS (sin ficha previa): ${nuevos.join(" | ")}` : "Todos tienen ficha previa.");

  for (const p of PARTIDOS) {
    const id = partidoId(CATEGORIA, p.numeroFecha);
    const ref = adminDb.collection("partidos").doc(id);
    const snap = await ref.get();
    if (snap.exists && (snap.data() as { estado?: string }).estado !== "programado") {
      console.warn(`SALTEADO ${id}: estado "${(snap.data() as { estado?: string }).estado}"`);
      continue;
    }
    const jugadores: JugadorPartido[] = [
      ...p.titulares.map((n, i) => ({ nombre: nombreFinal(n), dorsal: String(i + 1), titular: true, enCancha: true }) as JugadorPartido),
      ...p.suplentes.map((n, i) => ({ nombre: nombreFinal(n), dorsal: String(16 + i), titular: false, enCancha: false }) as JugadorPartido),
    ];
    const ids = jugadores.map((j) => playerId(j.nombre));
    if (new Set(ids).size !== jugadores.length) throw new Error(`${id}: ids repetidos`);
    const titularesIds = ids.slice(0, 15);
    console.log(`${id}: ${snap.exists ? "ya existe" : "SE CREA"} | 21/11 ${p.hora} vs ${p.rival} (Tucumán) | 15 tit + ${p.suplentes.length} supl`);
    if (dryRun) continue;

    if (!snap.exists) {
      await ref.set({
        categoriaId: CATEGORIA, numeroFecha: p.numeroFecha, torneo: TORNEO, fecha: "2026-11-21", hora: p.hora, rival: p.rival,
        esLocal: false, cancha: "Tucumán", estado: "programado", resultado: { newman: 0, rival: 0 }, enCanchaIds: [],
        formacionPublicada: false, createdAt: new Date(), updatedAt: new Date(),
      });
    }
    const plantelSnap = await ref.collection("plantel").get();
    const batch = adminDb.batch();
    for (const d of plantelSnap.docs) if (!ids.includes(d.id)) batch.delete(d.ref);
    jugadores.forEach((j, i) => batch.set(ref.collection("plantel").doc(ids[i]), j));
    batch.update(ref, { formacionPublicada: false, enCanchaIds: titularesIds, formacionActualizadaEn: new Date(), updatedAt: new Date() });
    await batch.commit();
  }
  console.log(dryRun ? "\n(DRY RUN) nada escrito." : "\nListo. Partidos creados y formaciones tentativas cargadas como BORRADOR.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
