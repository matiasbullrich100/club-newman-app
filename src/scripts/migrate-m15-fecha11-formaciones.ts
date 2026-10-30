// M15 A / B / D del domingo 2026-11-01 (Fecha 11, de visitante): A vs Deportiva Francesa A 11:00, B vs Deportiva
// Francesa B 09:30, D vs BACRC 11:00 (la placa dice 11:00; en la base figuraba 09:30 -> se corrige). M15 C: Fecha libre.
// Formaciones de las placas del club: titulares 1-15 y suplentes con el dorsal de la placa. M15 A no trae suplentes.
// M15 D: ademas de los 8 suplentes de la placa (16-23) el club paso 5 mas por mensaje ("Tomi Ibarzabal, Fran Zimmerman,
// Bauti Palette, Ale Oneto, Lucio Restucci"), que se resolvieron contra los jugadores de M15 ya cargados (Ibarzabal,
// Tomás / Zimmermann, Francisco / Palette Pueyrredon, Bautista / Oneto Gaona, Alejandro Blas / Restucci Micheli, Lucio)
// y llevan los dorsales 24 a 28. Se cargan como BORRADOR (formacionPublicada: false); se publican cuando el club lo pida.
// Idempotente; solo "programado". Correr con: npx tsx src/scripts/migrate-m15-fecha11-formaciones.ts   (DRY_RUN=1 para mirar)

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
    partidoId: "m15-a-f11",
    hora: "11:00",
    titulares: ["LLAMBI BOVINO, Felipe", "SOLA, Benicio", "ORDOÑEZ, Pablo", "ARNAUDO LOSADA, Ignacio Javier", "BENVENUTI, Vito", "LOPEZ SAUBIDET, Juan Cruz", "LUNA ALURRALDE, Ignacio", "MIGUENS, Faustino", "PECHAR, Jose", "BULLRICH, José", "LLAVALLOL, Marcos", "GARCÍA IGARZA, Joaquín", "REYNAL, Abbott Juan", "ARAMBURU, Iñaki", "LOPEZ AUFRANC, Hilario"],
    suplentes: [],
  },
  {
    partidoId: "m15-b-f11",
    hora: "09:30",
    titulares: ["AYERZA, Iván Federico", "BARROS OCAMPO, Bartolome", "RICHARDS, Patricio Juan", "CHIAPPE BECCAR VARELA, Pedro", "PEREZ SARTORI, Ramiro", "FIORITO, Jaime", "DIAZ MATHE, Cruz", "CZAR, Cristóbal", "VINENT FERNANDEZ SPERONI, Benjamín", "DORMAL, Santiago", "GARAT NÖLTING, Jaime", "RODRIGUEZ RIBAS, Hilario", "TISCORNIA, Félix", "LEYBA, Fermín Gabriel", "MENDIZABAL, Felipe"],
    suplentes: [["16", "VALVERDE, Manuel"], ["17", "WAISMAN, Matias"], ["18", "KAUFMANN, Juan"], ["19", "VILLAMIL, Simón"], ["20", "TRIGO DE LA BALZE, Honorio"], ["21", "BELL, Keneth"], ["22", "TREVISÁN, Pedro"]],
  },
  {
    partidoId: "m15-d-f11",
    hora: "11:00",
    titulares: ["QUIGLEY, Mathew", "GRETHER, Emilio", "MATTA Y TREJO, Alfonso", "ESCALANTE, Ignacio", "STODDART, Marcos", "SERANTES, Mateo", "SANTAMARINA BERGADÁ, Jerónimo", "ESTRADA, José María", "BELÁUSTEGUI, Isidro", "BARISIC, Milo", "CHEVALLIER BOUTELL, Gonzalo", "POGGI, Joaquín", "PRENESTE, Simon", "VALLACO, Juan Cruz", "PALMA CANE, Lucas"],
    suplentes: [
      ["16", "MORANDO, Aldo"],
      ["17", "ANZORREGUY, Rufino"],
      ["18", "POLIZZA, Vicente"],
      ["19", "ALEGRE, Baldomero"],
      ["20", "BOSCH HOLMBERG, Lucio"],
      ["21", "BERASATEGUI, Fernando"],
      ["22", "BONADEO, Santos"],
      ["23", "NAZAR, Florencio"],
      ["24", "IBARZABAL, Tomás"],
      ["25", "ZIMMERMANN, Francisco"],
      ["26", "PALETTE PUEYRREDON, Bautista"],
      ["27", "ONETO GAONA, Alejandro Blas"],
      ["28", "RESTUCCI MICHELI, Lucio"],
    ],
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
