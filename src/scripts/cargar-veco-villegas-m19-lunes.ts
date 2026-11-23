// Torneo Veco Villegas (M19), lunes 2026-11-23, Copa de Plata, en Tucuman:
//  - 16:30 Newman vs Universitario (Fecha 2), cancha 3 (Campo Norte / Anexo). Formacion de la placa del club, PUBLICADA.
//  - 19:00 Los Tordos RC vs Newman (Fecha 3), cancha 1 (Sede). Se crea el partido; la formacion se carga cuando llegue.
// Son m19-a Fecha 14 y 15 (fuera del fixture de URBA, no cuentan para sus tablas), igual que los del sabado
// (ver cargar-veco-villegas-m19.ts). Nombres: el ya guardado en la base si el id coincide.
// Idempotente; solo actua si el partido no existe o sigue "programado". Correr con:
// npx tsx src/scripts/cargar-veco-villegas-m19-lunes.ts   (DRY_RUN=1 para solo mirar)

import { config } from "dotenv";
import { resolve } from "path";
import { partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { JugadorPartido } from "../types/firestore";

const CATEGORIA = "m19-a";
const TORNEO = "Torneo Veco Villegas";

const PARTIDOS: { numeroFecha: number; hora: string; rival: string; esLocal: boolean; numeroCancha: string; titulares: string[]; suplentes: string[] }[] = [
  {
    numeroFecha: 14, hora: "16:30", rival: "Universitario", esLocal: true, numeroCancha: "3",
    titulares: ["Diaz De Vivar, Joaquin", "Parrondo, Simon", "Bourdieu, Carlos Maria", "Anchorena, Zenon", "Chiappe, Mateo", "Castro Lacroze, Benjamin", "Cardoni, Beltran", "Lascombes, Facundo", "Sola, Santiago", "Lagos Marmol, Maximo", "Barisic, Ivan", "Aberg Cobo, Juan Jose", "Altgelt, James", "Golletti, Sebastian", "Ulloa, Ramon"],
    suplentes: ["Von Grolman, Juan Pablo", "Lynch, Bautista Santiago", "Blaquier, Simon", "Goti, Enzo", "Galice Naon, Rodrigo", "Bosch, Lucas", "Gonzalez Hughes, Marcos", "Uranga, Felipe"],
  },
  { numeroFecha: 15, hora: "19:00", rival: "Los Tordos RC", esLocal: false, numeroCancha: "1", titulares: [], suplentes: [] },
];

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const dryRun = process.env.DRY_RUN === "1";
  const { adminDb } = await import("../lib/firebase-admin");
  if (dryRun) console.log("== DRY RUN: no se escribe nada ==\n");

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
  const nombreFinal = (raw: string) => previos.get(playerId(raw)) ?? raw;

  for (const p of PARTIDOS) {
    const id = partidoId(CATEGORIA, p.numeroFecha);
    const ref = adminDb.collection("partidos").doc(id);
    const snap = await ref.get();
    if (snap.exists && (snap.data() as { estado?: string }).estado !== "programado") {
      console.warn(`SALTEADO ${id}: estado "${(snap.data() as { estado?: string }).estado}"`);
      continue;
    }
    const conFormacion = p.titulares.length > 0;
    const jugadores: JugadorPartido[] = [
      ...p.titulares.map((n, i) => ({ nombre: nombreFinal(n), dorsal: String(i + 1), titular: true, enCancha: true }) as JugadorPartido),
      ...p.suplentes.map((n, i) => ({ nombre: nombreFinal(n), dorsal: String(16 + i), titular: false, enCancha: false }) as JugadorPartido),
    ];
    const ids = jugadores.map((j) => playerId(j.nombre));
    if (new Set(ids).size !== jugadores.length) throw new Error(`${id}: ids repetidos`);
    const nuevos = p.titulares.concat(p.suplentes).filter((n) => !previos.has(playerId(n)));
    console.log(`${id}: ${snap.exists ? "ya existe" : "SE CREA"} | 23/11 ${p.hora} ${p.esLocal ? "Newman vs " + p.rival : p.rival + " vs Newman"} | ${conFormacion ? `15 tit + ${p.suplentes.length} supl${nuevos.length ? ` | NUEVOS: ${nuevos.join(", ")}` : ""}` : "sin formacion todavia"}`);
    if (dryRun) continue;

    if (!snap.exists) {
      await ref.set({
        categoriaId: CATEGORIA, numeroFecha: p.numeroFecha, torneo: TORNEO, fecha: "2026-11-23", hora: p.hora, rival: p.rival,
        esLocal: p.esLocal, cancha: "Tucumán", numeroCancha: p.numeroCancha, estado: "programado", resultado: { newman: 0, rival: 0 },
        enCanchaIds: [], formacionPublicada: false, createdAt: new Date(), updatedAt: new Date(),
      });
    }
    if (!conFormacion) continue;
    const plantelSnap = await ref.collection("plantel").get();
    const batch = adminDb.batch();
    for (const d of plantelSnap.docs) if (!ids.includes(d.id)) batch.delete(d.ref);
    jugadores.forEach((j, i) => batch.set(ref.collection("plantel").doc(ids[i]), j));
    batch.update(ref, { formacionPublicada: true, enCanchaIds: ids.slice(0, 15), formacionActualizadaEn: new Date(), updatedAt: new Date() });
    await batch.commit();
  }
  console.log(dryRun ? "\n(DRY RUN) nada escrito." : "\nListo.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
