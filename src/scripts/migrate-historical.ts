// Migra la temporada real (11 categorias x 26 fechas) desde los JSON curados en la sesion
// anterior de Claude.ai. Fuente por defecto: C:\Users\Matias\Downloads\handoff\ (override con
// el primer argumento). Correr con: npm run migrate-historical
//
// No toca los Excel de "app club newman" -- esos datos ya estan procesados en estos JSON.

import { config } from "dotenv";
import { resolve, join } from "path";
import { readFileSync } from "fs";
import { CATEGORIAS, partidoId } from "../lib/categorias";
import { playerId } from "../lib/players";
import type { Incidente, JugadorPartido, Partido, TipoIncidente } from "../types/firestore";

const NUMERO_FECHAS = 26;

// Caso puntual que no esta en ningun JSON (ver pendientes.docx) -- no reusar el estado
// "suspendido" del motor en vivo, que implica "en curso, puede reanudarse".
const NOTAS_ESPECIALES_HARDCODEADAS: Record<string, Record<number, string>> = {
  "M-22": { 17: "Suspendido por tormenta eléctrica" },
};

interface FixtureBaseEntry {
  numeroFecha: string;
  fecha: string;
  rival: string;
  esLocal: boolean;
  cancha: string;
}

interface ResultadoHist {
  newman: number;
  rival: number;
  bonusNewman?: boolean;
  bonusRival?: boolean;
}

interface FormacionJugador {
  dorsal: string;
  name: string;
  capitan?: boolean;
  debut?: boolean;
}

interface IncidenteHist {
  tipo: "amarilla" | "roja";
  tiempo: "1T" | "2T";
  minuto: number;
  jugador: string;
  dorsal: string;
}

interface TarjetaAgregada {
  amarillas: number;
  rojas: number;
  nombre: string;
}

function loadJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), "utf8")) as T;
}

class Lote {
  private batch;
  private ops = 0;
  private pendientes: Promise<unknown>[] = [];
  constructor(private db: FirebaseFirestore.Firestore) {
    this.batch = db.batch();
  }
  set(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) {
    this.batch.set(ref, data);
    this.ops++;
    if (this.ops >= 450) this.flush();
  }
  delete(ref: FirebaseFirestore.DocumentReference) {
    this.batch.delete(ref);
    this.ops++;
    if (this.ops >= 450) this.flush();
  }
  private flush() {
    this.pendientes.push(this.batch.commit());
    this.batch = this.db.batch();
    this.ops = 0;
  }
  async commitAll() {
    if (this.ops > 0) this.flush();
    await Promise.all(this.pendientes);
  }
}

async function main() {
  config({ path: resolve(__dirname, "../../.env.local") });
  const { adminDb } = await import("../lib/firebase-admin");

  const sourceDir = process.argv[2] ?? "C:\\Users\\Matias\\Downloads\\handoff";
  console.log("Leyendo datos desde:", sourceDir);

  const fixtureBase = loadJson<FixtureBaseEntry[]>(sourceDir, "fixture_base.json");
  const fixtureOverrides = loadJson<Record<string, Record<string, Partial<FixtureBaseEntry>>>>(
    sourceDir,
    "fixture_overrides.json"
  );
  const resultados = loadJson<Record<string, Record<string, ResultadoHist>>>(
    sourceDir,
    "resultados_historicos.json"
  );
  const formaciones = loadJson<
    Record<string, Record<string, { titulares: FormacionJugador[]; suplentes: FormacionJugador[] }>>
  >(sourceDir, "formaciones_historicas.json");
  const incidentesHist = loadJson<Record<string, IncidenteHist[]>>(sourceDir, "incidentes_historicos.json");
  const tarjetasHist = loadJson<Record<string, TarjetaAgregada>>(sourceDir, "tarjetas_historicas.json");

  const lote = new Lote(adminDb);

  console.log("Escribiendo categorias...");
  for (const cat of CATEGORIAS) {
    lote.set(adminDb.collection("categorias").doc(cat.id), { nombre: cat.nombre, orden: cat.orden });
  }

  console.log("Escribiendo partidos + formaciones + incidencias...");
  let partidosTerminados = 0;
  let plantelDocs = 0;
  let incidenteDocs = 0;

  for (const cat of CATEGORIAS) {
    const fixturePorFecha = new Map(fixtureBase.map((f) => [f.numeroFecha, f]));

    for (let fecha = 1; fecha <= NUMERO_FECHAS; fecha++) {
      const base = fixturePorFecha.get(String(fecha));
      if (!base) continue; // no deberia pasar -- fixture_base cubre las 26 fechas

      const override = fixtureOverrides[cat.nombre]?.[String(fecha)] ?? {};
      const rival = override.rival ?? base.rival;
      const esLocal = override.esLocal ?? base.esLocal;
      const cancha = override.cancha ?? base.cancha;

      let notaEspecial: string | undefined;
      if (rival === "Libre") {
        notaEspecial = "Fecha libre";
      } else if (NOTAS_ESPECIALES_HARDCODEADAS[cat.nombre]?.[fecha]) {
        notaEspecial = NOTAS_ESPECIALES_HARDCODEADAS[cat.nombre][fecha];
      }

      const resultadoHist = resultados[cat.nombre]?.[String(fecha)];
      const estado: Partido["estado"] = resultadoHist ? "terminado" : "programado";
      const resultado = resultadoHist ?? { newman: 0, rival: 0 };

      const partido: Partido = {
        categoriaId: cat.id,
        numeroFecha: fecha,
        fecha: base.fecha,
        rival,
        esLocal,
        cancha,
        estado,
        resultado,
        enCanchaIds: [],
        ...(notaEspecial ? { notaEspecial } : {}),
      };
      const partidoRef = adminDb.collection("partidos").doc(partidoId(cat.id, fecha));
      lote.set(partidoRef, { ...partido, createdAt: new Date(), updatedAt: new Date() });

      if (estado === "terminado") {
        partidosTerminados++;

        const form = formaciones[String(fecha)]?.[cat.nombre];
        if (form) {
          for (const j of [...form.titulares.map((j) => ({ ...j, titular: true })), ...form.suplentes.map((j) => ({ ...j, titular: false }))]) {
            const jugador: JugadorPartido = {
              nombre: j.name,
              dorsal: j.dorsal,
              titular: j.titular,
              enCancha: j.titular,
              ...(j.capitan ? { capitan: true } : {}),
              ...(j.debut ? { debut: true } : {}),
            };
            lote.set(partidoRef.collection("plantel").doc(playerId(j.name)), jugador);
            plantelDocs++;
          }
        }

        // Limpieza defensiva: si una corrida anterior (antes del id deterministico "hist-N")
        // dejo incidencias con id autogenerado, borrarlas para no duplicar.
        const viejasSnap = await partidoRef
          .collection("incidentes")
          .where("publicadoPorCuentaId", "==", "migracion-historica")
          .get();
        for (const doc of viejasSnap.docs) {
          if (!doc.id.startsWith("hist-")) lote.delete(doc.ref);
        }

        const incidentesFecha = incidentesHist[`${cat.nombre}|${fecha}`] ?? [];
        incidentesFecha.forEach((inc, i) => {
          const tipo: TipoIncidente = inc.tipo === "amarilla" ? "tarjeta_amarilla" : "tarjeta_roja";
          const incidente: Incidente = {
            tipo,
            equipo: "newman",
            jugadorId: playerId(inc.jugador),
            jugadorNombre: inc.jugador,
            dorsal: inc.dorsal,
            periodo: inc.tiempo,
            minuto: inc.minuto,
            segundoAbsoluto: Math.max(0, (inc.minuto - 1) * 60),
            publicadoPorCuentaId: "migracion-historica",
            createdAt: new Date(),
          };
          // Id deterministico (no autogenerado) -- correr el script de nuevo debe sobreescribir,
          // no duplicar.
          lote.set(partidoRef.collection("incidentes").doc(`hist-${i}`), incidente);
          incidenteDocs++;
        });
      }
    }
  }

  console.log("Escribiendo acumulado de tarjetas por jugador...");
  let jugadoresDocs = 0;
  for (const entry of Object.values(tarjetasHist)) {
    const id = playerId(entry.nombre);
    lote.set(adminDb.collection("jugadores").doc(id), {
      nombre: entry.nombre,
      tarjetasAmarillas: entry.amarillas,
      tarjetasDobleAmarilla: 0,
      tarjetasRojas: entry.rojas,
      tarjetasRojas20: 0,
      tarjetasAzules: 0,
      minutosJugadosTotal: 0,
    });
    jugadoresDocs++;
  }

  await lote.commitAll();

  console.log("Listo.");
  console.log(`  Categorias: ${CATEGORIAS.length}`);
  console.log(`  Partidos: ${CATEGORIAS.length * NUMERO_FECHAS} (${partidosTerminados} terminados)`);
  console.log(`  Plantel: ${plantelDocs} jugadores-partido`);
  console.log(`  Incidencias (tarjetas): ${incidenteDocs}`);
  console.log(`  Jugadores (acumulado tarjetas): ${jugadoresDocs}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
