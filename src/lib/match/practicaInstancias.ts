import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { playerId } from "@/lib/players";
import type { JugadorPartido, LiveState, Partido } from "@/types/firestore";

// Copia privada de los 2 partidos de prueba para UNA sesion de la cuenta "demo" (ver
// auth/actions.ts, que genera `demoInstanceId` en el login). Cada instancia vive
// "<base>-<instanceId>" -- distinta de los ids fijos que sigue usando el administrador
// (pre-a-test-beromama / m15-c-test-cambio, sin sufijo, seedeados por los scripts
// seed-test-beromama.ts / seed-test-cambio-juveniles.ts y sin vencimiento).

const DURACION_INSTANCIA_MS = 2 * 60 * 60 * 1000; // 2 horas

// Mismo plantel que seed-test-beromama.ts (Pre A vs Belgrano Athletic, 22-6 de local, 09-08).
const PLANTEL_BEROMAMA: { nombre: string; dorsal: string; titular: boolean }[] = [
  { nombre: "Wright James", dorsal: "1", titular: true },
  { nombre: "Pueyrredón Rodrigo", dorsal: "2", titular: true },
  { nombre: "Roggero Francisco", dorsal: "3", titular: true },
  { nombre: "Ureta Jerónimo", dorsal: "4", titular: true },
  { nombre: "Shaw Francisco", dorsal: "5", titular: true },
  { nombre: "Bruzzone Justo", dorsal: "6", titular: true },
  { nombre: "Salinas Juan", dorsal: "7", titular: true },
  { nombre: "Russo Rufino", dorsal: "8", titular: true },
  { nombre: "Bullrich Simón", dorsal: "9", titular: true },
  { nombre: "Jaca Otaño Iñaki", dorsal: "10", titular: true },
  { nombre: "Pereyra Cruz", dorsal: "11", titular: true },
  { nombre: "Butler Bautista", dorsal: "12", titular: true },
  { nombre: "Iribarren Marcos", dorsal: "13", titular: true },
  { nombre: "Silva Alfonso", dorsal: "14", titular: true },
  { nombre: "Gutierrez Taboada Santiago", dorsal: "15", titular: true },
  { nombre: "Walker Bautista", dorsal: "16", titular: false },
  { nombre: "Ureta Tomas", dorsal: "17", titular: false },
];

// Mismo plantel que seed-test-cambio-juveniles.ts (M15 C real de Newman, vs Casi).
const PLANTEL_CAMBIO: { id: string; nombre: string; dorsal: string; titular: boolean }[] = [
  { id: "matias waisman", nombre: "Waisman, Matias", dorsal: "1", titular: true },
  { id: "juan kaufmann", nombre: "Kaufmann, Juan", dorsal: "2", titular: true },
  { id: "facundo marino", nombre: "Marino, Facundo", dorsal: "3", titular: true },
  { id: "bergada jeronimo santamarina", nombre: "Santamarina Bergadá, Jerónimo", dorsal: "4", titular: true },
  { id: "beccar chiappe pedro varela", nombre: "Chiappe Beccar Varela, Pedro", dorsal: "5", titular: true },
  { id: "aldo morando", nombre: "Morando, Aldo", dorsal: "6", titular: true },
  { id: "cruz juan lopez saubidet", nombre: "Lopez Saubidet, Juan Cruz", dorsal: "7", titular: true },
  { id: "estrada jose maria", nombre: "Estrada, José María", dorsal: "8", titular: true },
  { id: "alegre baldomero", nombre: "Alegre, Baldomero", dorsal: "9", titular: true },
  { id: "barisic milo", nombre: "Barisic, Milo", dorsal: "10", titular: true },
  { id: "berasategui fernando", nombre: "Berasategui, Fernando", dorsal: "11", titular: true },
  { id: "francisco zimmermann", nombre: "Zimmermann, Francisco", dorsal: "12", titular: true },
  { id: "preneste simon", nombre: "Preneste, Simon", dorsal: "13", titular: true },
  { id: "boutell chevallier gonzalo", nombre: "Chevallier Boutell, Gonzalo", dorsal: "14", titular: true },
  { id: "anzorreguy rufino", nombre: "Anzorreguy, Rufino", dorsal: "15", titular: true },
  { id: "lucio micheli restucci", nombre: "Restucci Micheli, Lucio", dorsal: "16", titular: false },
  { id: "bautista palette pueyrredon", nombre: "Palette Pueyrredon, Bautista", dorsal: "17", titular: false },
];

async function sembrarLiveStateYPlantel(
  partidoId: string,
  jugadores: { id: string; nombre: string; dorsal: string; titular: boolean }[]
): Promise<void> {
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  const liveState: LiveState = { periodo: null, clockRunning: false, clockAnchor: null, accumulatedSeconds: 0 };
  const batch = adminDb.batch();
  batch.set(partidoRef.collection("liveState").doc("state"), liveState);
  for (const j of jugadores) {
    const doc: JugadorPartido = { nombre: j.nombre, dorsal: j.dorsal, titular: j.titular, enCancha: j.titular };
    batch.set(partidoRef.collection("plantel").doc(j.id), doc);
  }
  await batch.commit();
}

async function borrarSubcolecciones(partidoId: string): Promise<void> {
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  const [plantelSnap, incidentesSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").get(),
  ]);
  if (plantelSnap.empty && incidentesSnap.empty) return;
  const batch = adminDb.batch();
  for (const d of plantelSnap.docs) batch.delete(d.ref);
  for (const d of incidentesSnap.docs) batch.delete(d.ref);
  await batch.commit();
}

async function sembrarBeromama(partidoId: string): Promise<void> {
  await borrarSubcolecciones(partidoId);
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  const partido: Partido = {
    categoriaId: "pre-a",
    numeroFecha: "test",
    rival: "Beromama",
    esLocal: true,
    cancha: "Cancha 1",
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: PLANTEL_BEROMAMA.filter((j) => j.titular).map((j) => playerId(j.nombre)),
    esInstanciaPractica: true,
    expiraEn: new Date(Date.now() + DURACION_INSTANCIA_MS),
  };
  await partidoRef.set({ ...partido, createdAt: new Date(), updatedAt: new Date() });
  await sembrarLiveStateYPlantel(
    partidoId,
    PLANTEL_BEROMAMA.map((j) => ({ ...j, id: playerId(j.nombre) }))
  );
}

async function sembrarCambio(partidoId: string): Promise<void> {
  await borrarSubcolecciones(partidoId);
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  const partido: Partido = {
    categoriaId: "m15-c",
    numeroFecha: "test",
    rival: "Rival Test",
    esLocal: true,
    cancha: "Newman",
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: PLANTEL_CAMBIO.filter((j) => j.titular).map((j) => j.id),
    esInstanciaPractica: true,
    expiraEn: new Date(Date.now() + DURACION_INSTANCIA_MS),
  };
  await partidoRef.set({ ...partido, createdAt: new Date(), updatedAt: new Date() });
  await sembrarLiveStateYPlantel(partidoId, PLANTEL_CAMBIO);
}

function expiro(expiraEn: Partido["expiraEn"]): boolean {
  if (!expiraEn) return true;
  const fecha = expiraEn instanceof Date ? expiraEn : expiraEn.toDate();
  return fecha.getTime() <= Date.now();
}

async function asegurarUna(partidoId: string, sembrar: (id: string) => Promise<void>): Promise<void> {
  const snap = await adminDb.collection("partidos").doc(partidoId).get();
  if (snap.exists && !expiro((snap.data() as Partido).expiraEn)) return; // sigue vigente, no tocar
  await sembrar(partidoId);
}

export interface InstanciaPractica {
  preAId: string;
  m15Id: string;
}

// Crea (o renueva, si ya vencio) la copia privada de los 2 partidos de prueba para `instanceId`.
// Idempotente y barata cuando la instancia ya esta vigente (un solo .get() por partido, sin
// escritura). Llamar desde /pruebas antes de armar los links -- asi la practica SIEMPRE esta
// fresca cuando alguien la abre, sin depender de que haya corrido el cron de limpieza.
export async function asegurarInstanciaPractica(instanceId: string): Promise<InstanciaPractica> {
  const preAId = `pre-a-test-beromama-${instanceId}`;
  const m15Id = `m15-c-test-cambio-${instanceId}`;
  await Promise.all([asegurarUna(preAId, sembrarBeromama), asegurarUna(m15Id, sembrarCambio)]);
  return { preAId, m15Id };
}

// Borra del todo (doc + subcolecciones) las instancias de practica VENCIDAS -- pura limpieza de
// almacenamiento, no hace falta para que la app funcione bien: una instancia vencida que nadie
// borro todavia se recrea fresca sola la proxima vez que alguien la visita (ver asegurarUna). Para
// el cron de limpieza (ver /api/cron/limpiar-practicas-demo) y el script de mano homonimo.
export async function limpiarInstanciasVencidas(): Promise<{ borrados: number }> {
  const snap = await adminDb.collection("partidos").where("esInstanciaPractica", "==", true).get();
  const vencidas = snap.docs.filter((d) => expiro((d.data() as Partido).expiraEn));

  let borrados = 0;
  for (const doc of vencidas) {
    const ref = doc.ref;
    const [plantelSnap, incidentesSnap, liveStateSnap] = await Promise.all([
      ref.collection("plantel").get(),
      ref.collection("incidentes").get(),
      ref.collection("liveState").get(),
    ]);
    const batch = adminDb.batch();
    for (const d of plantelSnap.docs) batch.delete(d.ref);
    for (const d of incidentesSnap.docs) batch.delete(d.ref);
    for (const d of liveStateSnap.docs) batch.delete(d.ref);
    batch.delete(ref);
    await batch.commit();
    borrados++;
  }
  return { borrados };
}
