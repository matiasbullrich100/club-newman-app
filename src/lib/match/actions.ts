"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { getSession, puedeOperarCategoria } from "@/lib/auth/session";
import { elapsedSeconds, minutoActual } from "./clock";
import { calcularMinutos, type CambioEvento, type JugadorInput } from "./minutes";
import { calcularBonus } from "./bonus";
import { DURACION_SANCION_SEGUNDOS, FAMILIA_PUNTOS, FAMILIA_TARJETA, requierePlayerSelection } from "@/lib/incidentes";
import { EDADES, grupoDeCategoria, partidoIdsDeGrupo } from "@/lib/categorias";
import { PARTIDOS_DEMO_IDS } from "@/lib/partidosPrueba";
import {
  PUNTOS_POR_TIPO,
  type Equipo,
  type FilaHistorialTarjeta,
  type Incidente,
  type JugadorPartido,
  type LiveState,
  type Partido,
  type Periodo,
  type TipoIncidente,
} from "@/types/firestore";

function refs(partidoId: string) {
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  return { partidoRef, liveStateRef: partidoRef.collection("liveState").doc("state") };
}

// Campo en jugadores/{id} que acumula cada tipo de tarjeta -- compartido entre publicarIncidente
// y corregirTipoIncidente (corregir un try por un drop, o una amarilla por una roja, etc.).
const CAMPO_TARJETA: Partial<Record<TipoIncidente, string>> = {
  tarjeta_amarilla: "tarjetasAmarillas",
  tarjeta_doble_amarilla: "tarjetasDobleAmarilla",
  tarjeta_roja: "tarjetasRojas",
  tarjeta_roja_20: "tarjetasRojas20",
  tarjeta_azul: "tarjetasAzules",
};

// Campo en jugadores/{id} con el historial fecha-por-fecha de cada tipo de tarjeta -- parejo con
// CAMPO_TARJETA de arriba, mantenido en los mismos tres call sites (publicarIncidente,
// corregirTipoIncidente, eliminarIncidente) para que /estadisticas/[grupoId] pueda leerlo directo
// de jugadores/ sin volver a escanear partidos.
const CAMPO_HISTORIAL_TARJETA: Partial<Record<TipoIncidente, string>> = {
  tarjeta_amarilla: "fechasAmarillas",
  tarjeta_doble_amarilla: "fechasDobleAmarilla",
  tarjeta_roja: "fechasRojas",
  tarjeta_roja_20: "fechasRojas20",
  tarjeta_azul: "fechasAzules",
};


// ---- Máquina de estados del partido -------------------------------------------------

export async function iniciarPartido(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const partidoSnap = await tx.get(partidoRef);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "programado") throw new Error("El partido ya fue iniciado");

    // Salvaguarda: si quien cargo el plantel (ej. una carga masiva desde Excel) se olvido de
    // completar este campo, se deriva de los titulares en vez de arrancar el partido sin nadie
    // "en cancha" -- eso rompe la seleccion de jugador en Cargar Jugada/Cambio (bug real, Fecha 18).
    let enCanchaIds = partido.enCanchaIds;
    if (enCanchaIds.length === 0) {
      const plantelSnap = await tx.get(partidoRef.collection("plantel").where("titular", "==", true));
      enCanchaIds = plantelSnap.docs.map((d) => d.id);
    }

    tx.update(partidoRef, { estado: "en_juego", enCanchaIds, updatedAt: FieldValue.serverTimestamp() });
    tx.set(liveStateRef, {
      periodo: "1T",
      clockRunning: true,
      clockAnchor: Timestamp.now(),
      accumulatedSeconds: 0,
    });
  });

  revalidatePath("/");
  revalidatePath(`/partido/${partidoId}`);
}

export async function cortar1T(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef)]);
    if (!partidoSnap.exists || !liveSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego" || liveState.periodo !== "1T") {
      throw new Error("El partido no está en el 1er tiempo");
    }

    const accumulated = elapsedSeconds(liveState);
    tx.update(partidoRef, { estado: "entretiempo", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, {
      clockRunning: false,
      clockAnchor: null,
      accumulatedSeconds: accumulated,
      period1DurationSeconds: accumulated,
    });

    const incidente: Incidente = {
      tipo: "fin_1t",
      periodo: "1T",
      minuto: Math.round(accumulated / 60),
      segundoAbsoluto: Math.floor(accumulated),
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    tx.set(incidenteRef, incidente);
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function iniciar2T(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const partidoSnap = await tx.get(partidoRef);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "entretiempo") throw new Error("El partido no está en el entretiempo");

    tx.update(partidoRef, { estado: "en_juego", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, {
      periodo: "2T",
      clockRunning: true,
      clockAnchor: Timestamp.now(),
      accumulatedSeconds: 0,
    });
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function suspender(partidoId: string, motivo: "medico" | "clima"): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef)]);
    if (!partidoSnap.exists || !liveSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego") throw new Error("Solo se puede interrumpir un partido en juego");
    if (!liveState.periodo) throw new Error("El partido no está en juego");

    const accumulated = elapsedSeconds(liveState);
    tx.update(partidoRef, { estado: "suspendido", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, { clockRunning: false, clockAnchor: null, accumulatedSeconds: accumulated, motivoInterrupcion: motivo });

    const incidente: Incidente = {
      tipo: motivo === "medico" ? "interrupcion_medica" : "interrupcion_clima",
      periodo: liveState.periodo,
      minuto: Math.floor(accumulated / 60) + 1,
      segundoAbsoluto: Math.floor(accumulated),
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    tx.set(incidenteRef, incidente);
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function reanudar(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const partidoSnap = await tx.get(partidoRef);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "suspendido") throw new Error("El partido no está suspendido");

    tx.update(partidoRef, { estado: "en_juego", updatedAt: FieldValue.serverTimestamp() });
    tx.update(liveStateRef, { clockRunning: true, clockAnchor: Timestamp.now(), motivoInterrupcion: null });
  });

  revalidatePath(`/partido/${partidoId}`);
}

export async function terminarPartido(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);

  const partidoSnap = await partidoRef.get();
  if (!partidoSnap.exists) throw new Error("Partido no encontrado");
  const partido = partidoSnap.data() as Partido;
  if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
  if (partido.estado !== "en_juego" && partido.estado !== "entretiempo") {
    throw new Error("El partido no se puede terminar desde este estado");
  }

  const liveSnap = await liveStateRef.get();
  const liveState = liveSnap.data() as LiveState;
  const accumulated = liveState.clockRunning ? elapsedSeconds(liveState) : liveState.accumulatedSeconds;
  const period1DurationSeconds =
    liveState.periodo === "1T" ? accumulated : liveState.period1DurationSeconds ?? 0;
  const period2DurationSeconds =
    liveState.periodo === "2T" ? accumulated : liveState.period2DurationSeconds ?? 0;

  const [plantelSnap, incidentesSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").get(),
  ]);
  const incidentes = incidentesSnap.docs.map((d) => d.data() as Incidente);

  const plantel: JugadorInput[] = plantelSnap.docs.map((d) => ({
    jugadorId: d.id,
    titular: (d.data() as JugadorPartido).titular,
  }));
  const cambios: CambioEvento[] = incidentes
    .filter((data) => data.tipo === "cambio")
    .map((data) => ({
      periodo: data.periodo,
      minuto: data.minuto,
      jugadorSaleId: data.jugadorSaleId,
      jugadorEntraId: data.jugadorEntraId,
    }));

  const minutos = calcularMinutos(plantel, cambios, period1DurationSeconds / 60, period2DurationSeconds / 60);
  const { bonusNewman, bonusRival } = calcularBonus(incidentes, partido.resultado);

  const batch = adminDb.batch();
  batch.update(partidoRef, {
    estado: "terminado",
    "resultado.bonusNewman": bonusNewman,
    "resultado.bonusRival": bonusRival,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.update(liveStateRef, {
    clockRunning: false,
    clockAnchor: null,
    accumulatedSeconds: accumulated,
    period1DurationSeconds,
    period2DurationSeconds,
  });

  if (liveState.periodo) {
    const finIncidente: Incidente = {
      tipo: liveState.periodo === "1T" ? "fin_1t" : "fin_2t",
      periodo: liveState.periodo,
      minuto: Math.round(accumulated / 60),
      segundoAbsoluto: Math.floor(accumulated),
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    batch.set(partidoRef.collection("incidentes").doc(), finIncidente);
  }

  // Los partidos de prueba (whitelist mas abajo) nunca deben sumar minutos reales a jugadores/,
  // incluso si se cargan con nombres de jugadores reales para simular cambios de forma realista.
  const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
  for (const jugador of plantel) {
    const m = minutos[jugador.jugadorId];
    batch.update(partidoRef.collection("plantel").doc(jugador.jugadorId), {
      minutosJugados1T: m.minutos1T,
      minutosJugados2T: m.minutos2T,
    });

    if (!esPartidoDePrueba) {
      const nombre = plantelSnap.docs.find((d) => d.id === jugador.jugadorId)?.data().nombre ?? "";
      batch.set(
        adminDb.collection("jugadores").doc(jugador.jugadorId),
        { nombre, ...grupoDeCategoria(partido.categoriaId), minutosJugadosTotal: FieldValue.increment(m.minutos1T + m.minutos2T) },
        { merge: true }
      );
    }
  }

  await batch.commit();
  revalidatePath(`/partido/${partidoId}`);
  revalidatePath("/");
}

/**
 * Walkover: el equipo indicado no presento primera linea (3 jugadores entrenados para el
 * scrum -- pilar, hooker, pilar) y pierde el partido por default 0-8. Termina el partido en el
 * acto, sea cual sea su estado previo (incluso "programado", si todavia no arranco). No calcula
 * minutos jugados -- un partido dado por walkover no se llego a jugar.
 */
export async function registrarWalkover(partidoId: string, equipoSinPrimeraLinea: Equipo): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef)]);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado === "terminado") throw new Error("El partido ya está terminado");

    const resultado = equipoSinPrimeraLinea === "newman" ? { newman: 0, rival: 8 } : { newman: 8, rival: 0 };

    let periodo: Periodo = "1T";
    let minuto = 0;
    let segundoAbsoluto = 0;
    const liveState = liveSnap.exists ? (liveSnap.data() as LiveState) : null;
    if (liveState?.periodo) {
      periodo = liveState.periodo;
      minuto = minutoActual(liveState);
      segundoAbsoluto = Math.floor(elapsedSeconds(liveState));
    }

    tx.update(partidoRef, { estado: "terminado", resultado, updatedAt: FieldValue.serverTimestamp() });
    if (liveSnap.exists) {
      tx.update(liveStateRef, { clockRunning: false, clockAnchor: null });
    }

    const incidente: Incidente = {
      tipo: "walkover",
      equipo: equipoSinPrimeraLinea,
      periodo,
      minuto,
      segundoAbsoluto,
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    tx.set(incidenteRef, incidente);
  });

  revalidatePath(`/partido/${partidoId}`);
  revalidatePath("/");
}

// ---- Incidencias ----------------------------------------------------------------------

export interface PublicarIncidenteInput {
  tipo: Exclude<TipoIncidente, "cambio">;
  equipo: Equipo;
  jugadorId?: string;
  // Solo para corregir un partido terminado: el reloj ya esta congelado, asi que el momento de
  // la jugada lo elige quien la carga (para que quede ordenada cronologicamente entre las demas).
  periodoManual?: Periodo;
  minutoManual?: number;
}

export async function publicarIncidente(partidoId: string, input: PublicarIncidenteInput): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef)]);
    if (!partidoSnap.exists || !liveSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    // Correccion post-partido: el Designado/Manager puede agregar una jugada que se olvido
    // cargar en su momento (ej. un try que el arbitro convalido y no se anoto). El minuto queda
    // como aproximado (el reloj ya esta congelado) y no exige que el jugador siga "en cancha".
    const esCorreccionPostPartido = partido.estado === "terminado";
    if (!esCorreccionPostPartido && (partido.estado !== "en_juego" || !liveState.periodo)) {
      throw new Error("El partido no está en juego");
    }

    let jugadorNombre: string | undefined;
    let dorsal: string | undefined;
    if (input.equipo === "newman" && requierePlayerSelection(input.tipo)) {
      if (!input.jugadorId) throw new Error("Falta el jugador");
      if (!esCorreccionPostPartido && !partido.enCanchaIds.includes(input.jugadorId)) {
        throw new Error("El jugador no está en cancha");
      }
      const jugadorSnap = await tx.get(partidoRef.collection("plantel").doc(input.jugadorId));
      if (!jugadorSnap.exists) throw new Error("Jugador no encontrado en el plantel");
      const jugador = jugadorSnap.data() as JugadorPartido;
      jugadorNombre = jugador.nombre;
      dorsal = jugador.dorsal;
    }

    let periodo: Periodo;
    let minuto: number;
    let segundoAbsoluto: number;
    if (esCorreccionPostPartido) {
      if (!input.periodoManual || !input.minutoManual || input.minutoManual < 1) {
        throw new Error("Falta el tiempo y el minuto de la jugada");
      }
      periodo = input.periodoManual;
      minuto = input.minutoManual;
      segundoAbsoluto = (minuto - 1) * 60;
    } else {
      // Correccion post-partido con un liveState viejo que nunca llego a tener periodo (no
      // deberia pasar en la practica -- terminarPartido() siempre lo deja seteado -- pero el
      // tipo es nullable).
      if (!liveState.periodo) throw new Error("El partido no tiene periodo registrado");
      periodo = liveState.periodo;
      minuto = minutoActual(liveState);
      segundoAbsoluto = Math.floor(elapsedSeconds(liveState));
    }
    const puntos = (PUNTOS_POR_TIPO as Record<string, number>)[input.tipo];

    const incidente: Incidente = {
      tipo: input.tipo,
      equipo: input.equipo,
      periodo,
      minuto,
      segundoAbsoluto,
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
      ...(puntos !== undefined ? { puntos } : {}),
      ...(input.jugadorId ? { jugadorId: input.jugadorId } : {}),
      ...(jugadorNombre ? { jugadorNombre } : {}),
      ...(dorsal ? { dorsal } : {}),
    };
    tx.set(incidenteRef, incidente);

    if (puntos !== undefined) {
      const campo = input.equipo === "newman" ? "resultado.newman" : "resultado.rival";
      tx.update(partidoRef, { [campo]: FieldValue.increment(puntos), updatedAt: FieldValue.serverTimestamp() });
    }

    // Amarilla/roja de 20 sacan al jugador de la cancha en el momento (10'/20' de sancion) -- se
    // registra como un "cambio" sin entra (solo jugadorSaleId) para que calcularMinutos() le corte
    // los minutos ahi mismo, y para que vuelva a aparecer en el banco de Cambios/reingresarSancion.
    if (
      DURACION_SANCION_SEGUNDOS[input.tipo] !== undefined &&
      input.equipo === "newman" &&
      input.jugadorId &&
      !esCorreccionPostPartido &&
      partido.enCanchaIds.includes(input.jugadorId)
    ) {
      const jugadorRef = partidoRef.collection("plantel").doc(input.jugadorId);
      tx.update(jugadorRef, { enCancha: false });
      tx.update(partidoRef, {
        enCanchaIds: partido.enCanchaIds.filter((id) => id !== input.jugadorId),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const salidaRef = partidoRef.collection("incidentes").doc();
      const salida: Incidente = {
        tipo: "cambio",
        equipo: "newman",
        jugadorSaleId: input.jugadorId,
        jugadorSaleNombre: jugadorNombre,
        periodo,
        minuto,
        segundoAbsoluto,
        publicadoPorCuentaId: session!.cuentaId,
        createdAt: Timestamp.now(),
      };
      tx.set(salidaRef, salida);
    }

    // Las tarjetas de partidos de prueba no se contabilizan en las estadisticas reales, aunque
    // se hayan cargado con nombres de jugadores reales para simular una formacion realista.
    const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
    if (CAMPO_TARJETA[input.tipo] && input.equipo === "newman" && input.jugadorId && !esPartidoDePrueba) {
      const campoHistorial = CAMPO_HISTORIAL_TARJETA[input.tipo];
      tx.set(
        adminDb.collection("jugadores").doc(input.jugadorId),
        {
          nombre: jugadorNombre,
          ...grupoDeCategoria(partido.categoriaId),
          [CAMPO_TARJETA[input.tipo]!]: FieldValue.increment(1),
          ...(campoHistorial
            ? {
                [campoHistorial]: FieldValue.arrayUnion({
                  numeroFecha: partido.numeroFecha,
                  rival: partido.rival,
                  incidenteId: incidenteRef.id,
                } satisfies FilaHistorialTarjeta),
              }
            : {}),
        },
        { merge: true }
      );
    }
  });

  revalidatePath(`/partido/${partidoId}`);
}

/**
 * Corrige el tipo de una incidencia ya publicada (ej. cargaron Try y era Drop) sin tocar
 * equipo/jugador. Solo permite moverse dentro de la misma familia -- puntos<->puntos o
 * tarjeta<->tarjeta -- para no dejar una incidencia en un estado inconsistente (ej. una
 * tarjeta no tiene puntos, un cambio no tiene jugadorId de esta forma). Funciona con el
 * partido en juego o ya terminado (la correccion tipica llega despues, revisando el resultado).
 */
export async function corregirTipoIncidente(partidoId: string, incidenteId: string, nuevoTipo: TipoIncidente): Promise<void> {
  const session = await getSession();
  const { partidoRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc(incidenteId);

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, incSnap, incidentesSnap] = await Promise.all([
      tx.get(partidoRef),
      tx.get(incidenteRef),
      tx.get(partidoRef.collection("incidentes")),
    ]);
    if (!partidoSnap.exists || !incSnap.exists) throw new Error("No encontrado");
    const partido = partidoSnap.data() as Partido;
    const inc = incSnap.data() as Incidente;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego" && partido.estado !== "terminado") {
      throw new Error("El partido tiene que estar en juego o terminado para corregir una jugada");
    }
    if (inc.tipo === nuevoTipo) return;

    const esPuntos = FAMILIA_PUNTOS.includes(inc.tipo) && FAMILIA_PUNTOS.includes(nuevoTipo);
    const esTarjeta = FAMILIA_TARJETA.includes(inc.tipo) && FAMILIA_TARJETA.includes(nuevoTipo);
    if (!esPuntos && !esTarjeta) {
      throw new Error("Solo se puede corregir entre jugadas de puntos o entre tarjetas, no entre las dos");
    }

    if (esPuntos) {
      const puntosViejos = (PUNTOS_POR_TIPO as Record<string, number>)[inc.tipo] ?? 0;
      const puntosNuevos = (PUNTOS_POR_TIPO as Record<string, number>)[nuevoTipo] ?? 0;
      const delta = puntosNuevos - puntosViejos;
      const nuevoResultado = {
        newman: partido.resultado.newman + (inc.equipo === "newman" ? delta : 0),
        rival: partido.resultado.rival + (inc.equipo === "rival" ? delta : 0),
      };

      const cambiosPartido: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      if (delta !== 0) {
        const campo = inc.equipo === "newman" ? "resultado.newman" : "resultado.rival";
        cambiosPartido[campo] = inc.equipo === "newman" ? nuevoResultado.newman : nuevoResultado.rival;
      }
      // Corregir un try (agregarlo o sacarlo) despues de terminado puede cambiar el bonus --
      // recalcular con el tipo ya corregido, no hace falta esperar a un nuevo terminarPartido.
      if (partido.estado === "terminado") {
        const incidentesActualizados = incidentesSnap.docs.map((d) =>
          d.id === incidenteId ? { ...(d.data() as Incidente), tipo: nuevoTipo } : (d.data() as Incidente)
        );
        const { bonusNewman, bonusRival } = calcularBonus(incidentesActualizados, nuevoResultado);
        cambiosPartido["resultado.bonusNewman"] = bonusNewman;
        cambiosPartido["resultado.bonusRival"] = bonusRival;
      }
      tx.update(partidoRef, cambiosPartido);
      tx.update(incidenteRef, { tipo: nuevoTipo, puntos: puntosNuevos });
    } else {
      const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
      if (inc.equipo === "newman" && inc.jugadorId && !esPartidoDePrueba) {
        const campoViejo = CAMPO_TARJETA[inc.tipo];
        const campoNuevo = CAMPO_TARJETA[nuevoTipo];
        const historialViejo = CAMPO_HISTORIAL_TARJETA[inc.tipo];
        const historialNuevo = CAMPO_HISTORIAL_TARJETA[nuevoTipo];
        const jugadorRef = adminDb.collection("jugadores").doc(inc.jugadorId);
        const grupo = grupoDeCategoria(partido.categoriaId);
        // Solo cambia el tipo, no el partido en el que paso -- misma numeroFecha/rival/incidenteId
        // en la entrada que se saca del campo viejo y en la que se agrega al campo nuevo.
        const entrada: FilaHistorialTarjeta = { numeroFecha: partido.numeroFecha, rival: partido.rival, incidenteId };
        if (campoViejo) {
          tx.set(
            jugadorRef,
            { ...grupo, [campoViejo]: FieldValue.increment(-1), ...(historialViejo ? { [historialViejo]: FieldValue.arrayRemove(entrada) } : {}) },
            { merge: true }
          );
        }
        if (campoNuevo) {
          tx.set(
            jugadorRef,
            { ...grupo, [campoNuevo]: FieldValue.increment(1), ...(historialNuevo ? { [historialNuevo]: FieldValue.arrayUnion(entrada) } : {}) },
            { merge: true }
          );
        }
      }
      tx.update(incidenteRef, { tipo: nuevoTipo });
    }
  });

  revalidatePath(`/partido/${partidoId}`);
}

/**
 * Reasigna el jugador de una jugada de Newman ya publicada (ej. cargaron el Penal sin elegir
 * quien lo pateo, o eligieron al jugador equivocado). A diferencia de corregirTipoIncidente, esto
 * no cambia el tipo -- solo a quien esta asignada. Si es una tarjeta, revierte el acumulado del
 * jugador viejo (si tenia uno) y se lo suma al nuevo; si es una jugada de puntos, nadie lleva un
 * acumulado por jugador asi que solo cambia el nombre que se muestra en el feed.
 */
export async function corregirJugadorIncidente(partidoId: string, incidenteId: string, nuevoJugadorId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc(incidenteId);

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, incSnap, nuevoJugadorSnap] = await Promise.all([
      tx.get(partidoRef),
      tx.get(incidenteRef),
      tx.get(partidoRef.collection("plantel").doc(nuevoJugadorId)),
    ]);
    if (!partidoSnap.exists || !incSnap.exists) throw new Error("No encontrado");
    if (!nuevoJugadorSnap.exists) throw new Error("Jugador no encontrado en el plantel");
    const partido = partidoSnap.data() as Partido;
    const inc = incSnap.data() as Incidente;
    const nuevoJugador = nuevoJugadorSnap.data() as JugadorPartido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego" && partido.estado !== "terminado") {
      throw new Error("El partido tiene que estar en juego o terminado para corregir una jugada");
    }
    if (inc.equipo !== "newman" || !requierePlayerSelection(inc.tipo)) {
      throw new Error("Esta jugada no tiene un jugador asociado");
    }
    if (inc.jugadorId === nuevoJugadorId) return;

    tx.update(incidenteRef, { jugadorId: nuevoJugadorId, jugadorNombre: nuevoJugador.nombre, dorsal: nuevoJugador.dorsal });

    const campo = CAMPO_TARJETA[inc.tipo];
    const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
    if (campo && !esPartidoDePrueba) {
      const campoHistorial = CAMPO_HISTORIAL_TARJETA[inc.tipo];
      const grupo = grupoDeCategoria(partido.categoriaId);
      const entrada: FilaHistorialTarjeta = { numeroFecha: partido.numeroFecha, rival: partido.rival, incidenteId };
      if (inc.jugadorId) {
        tx.set(
          adminDb.collection("jugadores").doc(inc.jugadorId),
          { [campo]: FieldValue.increment(-1), ...(campoHistorial ? { [campoHistorial]: FieldValue.arrayRemove(entrada) } : {}) },
          { merge: true }
        );
      }
      tx.set(
        adminDb.collection("jugadores").doc(nuevoJugadorId),
        {
          nombre: nuevoJugador.nombre,
          ...grupo,
          [campo]: FieldValue.increment(1),
          ...(campoHistorial ? { [campoHistorial]: FieldValue.arrayUnion(entrada) } : {}),
        },
        { merge: true }
      );
    }
  });

  revalidatePath(`/partido/${partidoId}`);
}

/**
 * Elimina una incidencia publicada por error (ej. el arbitro anulo un try despues de cargado).
 * Deshace su efecto en el resultado o en el acumulado de tarjetas segun corresponda. Solo
 * puntos y tarjetas -- cambios/fin de tiempo/interrupciones no se pueden borrar desde aca (tocan
 * el reloj o quien esta en cancha, no son "una jugada" suelta).
 */
export async function eliminarIncidente(partidoId: string, incidenteId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef } = refs(partidoId);
  const incidenteRef = partidoRef.collection("incidentes").doc(incidenteId);

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, incSnap, incidentesSnap] = await Promise.all([
      tx.get(partidoRef),
      tx.get(incidenteRef),
      tx.get(partidoRef.collection("incidentes")),
    ]);
    if (!partidoSnap.exists || !incSnap.exists) throw new Error("No encontrado");
    const partido = partidoSnap.data() as Partido;
    const inc = incSnap.data() as Incidente;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "en_juego" && partido.estado !== "terminado") {
      throw new Error("El partido tiene que estar en juego o terminado para eliminar una jugada");
    }

    if (FAMILIA_PUNTOS.includes(inc.tipo)) {
      const puntos = (PUNTOS_POR_TIPO as Record<string, number>)[inc.tipo] ?? 0;
      const nuevoResultado = {
        newman: partido.resultado.newman - (inc.equipo === "newman" ? puntos : 0),
        rival: partido.resultado.rival - (inc.equipo === "rival" ? puntos : 0),
      };

      const cambiosPartido: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      if (puntos !== 0) {
        const campo = inc.equipo === "newman" ? "resultado.newman" : "resultado.rival";
        cambiosPartido[campo] = inc.equipo === "newman" ? nuevoResultado.newman : nuevoResultado.rival;
      }
      // Borrar un try despues de terminado puede cambiar el bonus -- ver el mismo comentario en
      // corregirTipoIncidente.
      if (partido.estado === "terminado") {
        const incidentesActualizados = incidentesSnap.docs.filter((d) => d.id !== incidenteId).map((d) => d.data() as Incidente);
        const { bonusNewman, bonusRival } = calcularBonus(incidentesActualizados, nuevoResultado);
        cambiosPartido["resultado.bonusNewman"] = bonusNewman;
        cambiosPartido["resultado.bonusRival"] = bonusRival;
      }
      tx.update(partidoRef, cambiosPartido);
    } else if (FAMILIA_TARJETA.includes(inc.tipo)) {
      const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
      if (inc.equipo === "newman" && inc.jugadorId && !esPartidoDePrueba) {
        const campo = CAMPO_TARJETA[inc.tipo];
        const campoHistorial = CAMPO_HISTORIAL_TARJETA[inc.tipo];
        tx.set(
          adminDb.collection("jugadores").doc(inc.jugadorId),
          {
            ...(campo ? { [campo]: FieldValue.increment(-1) } : {}),
            ...(campoHistorial
              ? {
                  [campoHistorial]: FieldValue.arrayRemove({
                    numeroFecha: partido.numeroFecha,
                    rival: partido.rival,
                    incidenteId,
                  } satisfies FilaHistorialTarjeta),
                }
              : {}),
          },
          { merge: true }
        );
      }
    } else {
      throw new Error("Este tipo de incidencia no se puede eliminar");
    }

    tx.delete(incidenteRef);
  });

  revalidatePath(`/partido/${partidoId}`);
}

export interface PublicarCambioInput {
  jugadorSaleId: string;
  jugadorEntraId: string;
  // Solo si el que entra no estaba en la formacion inicial subida para este partido (banco
  // improvisado con alguien de otro equipo de la misma edad/plantel) -- ver CargaCambio.tsx.
  // Con esto, publicarCambio crea su doc en plantel/ sobre la marcha en vez de exigir que exista.
  jugadorEntraNombre?: string;
  // Solo para corregir un partido terminado: el reloj ya esta congelado, asi que el momento del
  // cambio lo elige quien lo carga (mismo patron que PublicarIncidenteInput).
  periodoManual?: Periodo;
  minutoManual?: number;
}

export async function publicarCambio(partidoId: string, input: PublicarCambioInput): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const saleRef = partidoRef.collection("plantel").doc(input.jugadorSaleId);
  const entraRef = partidoRef.collection("plantel").doc(input.jugadorEntraId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap, saleSnap, entraSnap, cambiosPreviosSnap] = await Promise.all([
      tx.get(partidoRef),
      tx.get(liveStateRef),
      tx.get(saleRef),
      tx.get(entraRef),
      tx.get(partidoRef.collection("incidentes").where("tipo", "==", "cambio")),
    ]);
    const entraEsNuevo = !entraSnap.exists;
    if (!partidoSnap.exists || !liveSnap.exists || !saleSnap.exists) {
      throw new Error("Datos del partido incompletos");
    }
    if (entraEsNuevo && !input.jugadorEntraNombre) {
      throw new Error("Jugador no encontrado en el plantel");
    }
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    const sale = saleSnap.data() as JugadorPartido;
    const entra: JugadorPartido = entraEsNuevo
      ? { nombre: input.jugadorEntraNombre!, dorsal: "-", titular: false, enCancha: false, agregadoEnVivo: true }
      : (entraSnap.data() as JugadorPartido);

    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");

    // Correccion post-partido: el Designado/Manager puede agregar un cambio que se olvido cargar
    // en su momento (mismo patron que publicarIncidente). El minuto queda aproximado (el reloj ya
    // esta congelado) y no exige que sale/entra reflejen el enCanchaIds real de ese momento --
    // "quien estaba en cancha" ya no se puede saber con certeza despues del hecho.
    const esCorreccionPostPartido = partido.estado === "terminado";
    let periodo: Periodo;
    let minuto: number;
    let segundoAbsoluto: number;
    if (esCorreccionPostPartido) {
      if (!input.periodoManual || !input.minutoManual || input.minutoManual < 1) {
        throw new Error("Falta el tiempo y el minuto del cambio");
      }
      periodo = input.periodoManual;
      minuto = input.minutoManual;
      segundoAbsoluto = (minuto - 1) * 60;
    } else {
      // Se permite tambien en el entretiempo -- es cuando mas cambios tacticos se hacen en la
      // practica, y el reloj ya esta frenado (elapsedSeconds/minutoActual usan accumulatedSeconds
      // congelado, no hace falta nada especial para que el minuto quede bien registrado).
      if ((partido.estado !== "en_juego" && partido.estado !== "entretiempo") || !liveState.periodo) {
        throw new Error("El partido no está en juego");
      }
      if (!sale.enCancha) throw new Error("Ese jugador no está en cancha");
      if (entra.enCancha) throw new Error("Ese jugador ya está en cancha");
      periodo = liveState.periodo;
      minuto = minutoActual(liveState);
      segundoAbsoluto = Math.floor(elapsedSeconds(liveState));
    }

    const nuevoEnCancha = partido.enCanchaIds
      .filter((id) => id !== input.jugadorSaleId)
      .concat(input.jugadorEntraId);

    tx.update(saleRef, { enCancha: false });
    tx.set(entraRef, { ...entra, enCancha: true }, { merge: true });
    tx.update(partidoRef, { enCanchaIds: nuevoEnCancha, updatedAt: FieldValue.serverTimestamp() });

    const incidente: Incidente = {
      tipo: "cambio",
      equipo: "newman",
      jugadorSaleId: input.jugadorSaleId,
      jugadorSaleNombre: sale.nombre,
      jugadorEntraId: input.jugadorEntraId,
      jugadorEntraNombre: entra.nombre,
      periodo,
      minuto,
      segundoAbsoluto,
      ...(partido.estado === "entretiempo" ? { enEntretiempo: true } : {}),
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    tx.set(incidenteRef, incidente);

    // terminarPartido() ya calculo y guardo minutosJugados1T/2T (por partido) y sumo al total
    // acumulado en jugadores/{id} -- si se corrige un cambio despues, hay que recalcular esos dos
    // jugadores puntuales con el historial de cambios actualizado y ajustar el total por la
    // diferencia (no pisarlo, porque ese campo acumula OTROS partidos tambien).
    if (esCorreccionPostPartido) {
      const cambiosExistentes: CambioEvento[] = cambiosPreviosSnap.docs.map((d) => {
        const data = d.data() as Incidente;
        return { periodo: data.periodo, minuto: data.minuto, jugadorSaleId: data.jugadorSaleId, jugadorEntraId: data.jugadorEntraId };
      });
      const todosLosCambios = [...cambiosExistentes, { periodo, minuto, jugadorSaleId: input.jugadorSaleId, jugadorEntraId: input.jugadorEntraId }];
      const duracion1T = (liveState.period1DurationSeconds ?? 0) / 60;
      const duracion2T = (liveState.period2DurationSeconds ?? 0) / 60;
      const nuevosMinutos = calcularMinutos(
        [
          { jugadorId: input.jugadorSaleId, titular: sale.titular },
          { jugadorId: input.jugadorEntraId, titular: entra.titular },
        ],
        todosLosCambios,
        duracion1T,
        duracion2T
      );
      const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);
      for (const [jugadorId, jugadorRef, datosViejos, nombre] of [
        [input.jugadorSaleId, saleRef, sale, sale.nombre],
        [input.jugadorEntraId, entraRef, entra, entra.nombre],
      ] as const) {
        const nm = nuevosMinutos[jugadorId];
        const minutosViejos = (datosViejos.minutosJugados1T ?? 0) + (datosViejos.minutosJugados2T ?? 0);
        const delta = nm.minutos1T + nm.minutos2T - minutosViejos;
        tx.update(jugadorRef, { minutosJugados1T: nm.minutos1T, minutosJugados2T: nm.minutos2T });
        if (!esPartidoDePrueba && delta !== 0) {
          tx.set(
            adminDb.collection("jugadores").doc(jugadorId),
            { nombre, ...grupoDeCategoria(partido.categoriaId), minutosJugadosTotal: FieldValue.increment(delta) },
            { merge: true }
          );
        }
      }
    }
  });

  revalidatePath(`/partido/${partidoId}`);
}

export interface ReingresarSancionInput {
  jugadorEntraId: string;
  // Solo si el que entra no estaba en el plantel de este partido (mismo patron que publicarCambio).
  jugadorEntraNombre?: string;
}

/**
 * Llena el puesto que dejo vacante una amarilla/roja de 20 -- a diferencia de un cambio comun no
 * hay "sale" (ya salio con la tarjeta, ver DURACION_SANCION_SEGUNDOS en publicarIncidente): puede
 * reingresar el mismo jugador sancionado o cualquier otro (banco, alguien que ya salio antes, o
 * del plantel completo via el buscador).
 */
export async function reingresarSancion(partidoId: string, input: ReingresarSancionInput): Promise<void> {
  const session = await getSession();
  const { partidoRef, liveStateRef } = refs(partidoId);
  const entraRef = partidoRef.collection("plantel").doc(input.jugadorEntraId);
  const incidenteRef = partidoRef.collection("incidentes").doc();

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, liveSnap, entraSnap] = await Promise.all([tx.get(partidoRef), tx.get(liveStateRef), tx.get(entraRef)]);
    if (!partidoSnap.exists || !liveSnap.exists) throw new Error("Datos del partido incompletos");
    const entraEsNuevo = !entraSnap.exists;
    if (entraEsNuevo && !input.jugadorEntraNombre) throw new Error("Jugador no encontrado en el plantel");
    const partido = partidoSnap.data() as Partido;
    const liveState = liveSnap.data() as LiveState;
    const entra: JugadorPartido = entraEsNuevo
      ? { nombre: input.jugadorEntraNombre!, dorsal: "-", titular: false, enCancha: false, agregadoEnVivo: true }
      : (entraSnap.data() as JugadorPartido);

    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if ((partido.estado !== "en_juego" && partido.estado !== "entretiempo") || !liveState.periodo) {
      throw new Error("El partido no está en juego");
    }
    if (entra.enCancha) throw new Error("Ese jugador ya está en cancha");
    if (partido.enCanchaIds.length >= 15) throw new Error("Ya hay 15 jugadores en cancha");

    const minuto = minutoActual(liveState);
    const segundoAbsoluto = Math.floor(elapsedSeconds(liveState));

    tx.set(entraRef, { ...entra, enCancha: true }, { merge: true });
    tx.update(partidoRef, {
      enCanchaIds: [...partido.enCanchaIds, input.jugadorEntraId],
      updatedAt: FieldValue.serverTimestamp(),
    });

    const incidente: Incidente = {
      tipo: "cambio",
      equipo: "newman",
      jugadorEntraId: input.jugadorEntraId,
      jugadorEntraNombre: entra.nombre,
      periodo: liveState.periodo,
      minuto,
      segundoAbsoluto,
      ...(partido.estado === "entretiempo" ? { enEntretiempo: true } : {}),
      publicadoPorCuentaId: session!.cuentaId,
      createdAt: Timestamp.now(),
    };
    tx.set(incidenteRef, incidente);
  });

  revalidatePath(`/partido/${partidoId}`);
}

/**
 * Reemplaza a un jugador de la formacion oficial ANTES de que arranque el partido (ej. se
 * enfermo un titular la mañana del partido) -- el que entra hereda el dorsal y el puesto
 * (titular/suplente) del que sale, no arma una jugada nueva ni pasa por el reloj (el partido
 * todavia no empezo). El buscador que llama a esto (EditarFormacion.tsx) ya filtra por el
 * plantel completo correcto (todo Plantel Superior, o solo la division de Juveniles que
 * corresponda) -- ver docs/live-match-engine.md.
 */
export async function reemplazarJugadorFormacion(
  partidoId: string,
  viejoJugadorId: string,
  nuevoJugadorId: string,
  nuevoJugadorNombre: string
): Promise<void> {
  const session = await getSession();
  const { partidoRef } = refs(partidoId);
  const viejoRef = partidoRef.collection("plantel").doc(viejoJugadorId);
  const nuevoRef = partidoRef.collection("plantel").doc(nuevoJugadorId);

  await adminDb.runTransaction(async (tx) => {
    const [partidoSnap, viejoSnap, nuevoSnap] = await Promise.all([tx.get(partidoRef), tx.get(viejoRef), tx.get(nuevoRef)]);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "programado") throw new Error("Solo se puede editar la formación antes de que arranque el partido");
    if (!viejoSnap.exists) throw new Error("Ese jugador no está en la formación");
    if (viejoJugadorId === nuevoJugadorId) throw new Error("Elegí un jugador distinto");

    const viejo = viejoSnap.data() as JugadorPartido;
    // El elegido puede ya estar en esta formacion (ej. de suplente) -- en ese caso su doc se
    // sobreescribe con el puesto/dorsal del que sale, asi que su puesto anterior queda vacio
    // solo (mismo doc, una entrada por jugador). Si ya venia marcado agregadoEnVivo (lo metio el
    // buscador en algun momento) se mantiene esa marca para que el reset lo siga borrando entero.
    const nuevoPrevio = nuevoSnap.exists ? (nuevoSnap.data() as JugadorPartido) : null;
    const nuevo: JugadorPartido = {
      nombre: nuevoJugadorNombre,
      dorsal: viejo.dorsal,
      titular: viejo.titular,
      enCancha: viejo.titular,
      ...(nuevoPrevio ? { ...(nuevoPrevio.agregadoEnVivo ? { agregadoEnVivo: true } : {}) } : { agregadoEnVivo: true }),
    };

    tx.delete(viejoRef);
    tx.set(nuevoRef, nuevo);

    const enCanchaIds = partido.enCanchaIds.filter((id) => id !== viejoJugadorId && id !== nuevoJugadorId);
    if (nuevo.enCancha) enCanchaIds.push(nuevoJugadorId);
    tx.update(partidoRef, { enCanchaIds, updatedAt: FieldValue.serverTimestamp() });
  });

  revalidatePath(`/partido/${partidoId}`);
}

/**
 * Hace publica la formacion de un partido "programado" que se cargo como borrador
 * (`formacionPublicada: false` -- ver el comentario en el tipo Partido). Pensado para el flujo
 * "cargo la formacion el jueves/viernes pero el club recien la comunica mas cerca del partido":
 * hasta que se llama a esto, solo quien puede operar esta categoria ve la formacion real, el
 * resto ve "aun no publicada".
 */
export async function publicarFormacion(partidoId: string): Promise<void> {
  const session = await getSession();
  const { partidoRef } = refs(partidoId);

  await adminDb.runTransaction(async (tx) => {
    const partidoSnap = await tx.get(partidoRef);
    if (!partidoSnap.exists) throw new Error("Partido no encontrado");
    const partido = partidoSnap.data() as Partido;
    if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");
    if (partido.estado !== "programado") throw new Error("Solo se puede publicar la formación de un partido que no arrancó");
    tx.update(partidoRef, { formacionPublicada: true, updatedAt: FieldValue.serverTimestamp() });
  });

  revalidatePath(`/partido/${partidoId}`);
}

/**
 * Publica de una sola vez TODAS las formaciones en borrador de un grupo ("superior", "juveniles"
 * -- las 4 edades juntas -- o un edadId puntual) -- para cuando se cargaron muchos partidos como
 * borrador de punta (ej. toda la temporada via Excel) y no tiene sentido publicarlos uno por uno.
 * Se salta silenciosamente cualquier partido que la sesion no pueda operar (asi un manager de una
 * sola division puede usar el mismo boton "Subir Juveniles" sin publicar de mas) y cualquiera que
 * no este en estado "programado" o que ya este publicado.
 */
export async function publicarFormacionesGrupo(grupo: string): Promise<{ publicados: number }> {
  const session = await getSession();
  if (!session || session.rol !== "manager") throw new Error("No autorizado");

  const idsPartidos = grupo === "juveniles" ? EDADES.flatMap((e) => partidoIdsDeGrupo(e.id)) : partidoIdsDeGrupo(grupo);
  const snaps = await adminDb.getAll(...idsPartidos.map((id) => adminDb.collection("partidos").doc(id)));

  const batch = adminDb.batch();
  let publicados = 0;
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const partido = snap.data() as Partido;
    if (partido.estado !== "programado" || partido.formacionPublicada !== false) continue;
    if (!puedeOperarCategoria(session, partido.categoriaId)) continue;
    batch.update(snap.ref, { formacionPublicada: true, updatedAt: FieldValue.serverTimestamp() });
    publicados++;
  }
  if (publicados > 0) await batch.commit();

  revalidatePath("/");
  return { publicados };
}

// ---- Solo para los partidos de prueba (Fase 1) ------------------------------------------

/**
 * Vuelve un partido de prueba a "programado" (0-0, sin incidencias) para poder simularlo
 * de nuevo (mismo efecto que scripts/reset-demo.ts, pero disparable desde la UI por el Manager).
 */
export async function resetearPartidoDemo(partidoDemoId: string): Promise<void> {
  const session = await getSession();
  if (!session || session.rol !== "manager") throw new Error("No autorizado");
  if (!PARTIDOS_DEMO_IDS.includes(partidoDemoId)) throw new Error("Ese partido no se puede resetear");

  const partidoRef = adminDb.collection("partidos").doc(partidoDemoId);
  const partidoSnap = await partidoRef.get();
  if (!partidoSnap.exists) throw new Error("El partido de prueba no existe");

  const [plantelSnap, incidentesSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").get(),
  ]);

  const batch = adminDb.batch();

  // Los jugadores agregados en vivo (buscador de "otro jugador", en un Cambio o editando la
  // formacion) no forman parte de la formacion original -- resetear tiene que borrarlos del
  // todo, no solo reiniciarles las banderas, o quedan pegados para siempre en el partido de
  // prueba (bug real: se acumulaban entre sesiones de prueba distintas).
  const originales = plantelSnap.docs.filter((d) => !d.data().agregadoEnVivo);
  const agregados = plantelSnap.docs.filter((d) => d.data().agregadoEnVivo);

  const titularesIds = originales.filter((d) => d.data().titular).map((d) => d.id);
  batch.update(partidoRef, {
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: titularesIds,
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(partidoRef.collection("liveState").doc("state"), {
    periodo: null,
    clockRunning: false,
    clockAnchor: null,
    accumulatedSeconds: 0,
  });

  for (const doc of originales) {
    const titular = doc.data().titular as boolean;
    batch.update(doc.ref, { enCancha: titular, minutosJugados1T: 0, minutosJugados2T: 0 });
  }
  for (const doc of agregados) {
    batch.delete(doc.ref);
  }

  for (const doc of incidentesSnap.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
  revalidatePath(`/partido/${partidoDemoId}`);
  revalidatePath("/");
}

// ---- Reinicio de un partido real (por error de operación) --------------------------------

/**
 * Vuelve CUALQUIER partido a "programado" desde cero -- mismo efecto que resetearPartidoDemo,
 * pero pensado para un partido real que se inició/terminó por error (ej. se apretó "Iniciar" en
 * la categoría equivocada). A diferencia de los partidos de prueba, un partido real puede haber
 * sumado tarjetas o minutos jugados a jugadores/ -- este reinicio los revierte antes de borrar
 * las incidencias, para no dejar estadísticas fantasma pegadas en el jugador.
 */
export async function reiniciarPartido(partidoId: string): Promise<void> {
  const session = await getSession();
  const partidoRef = adminDb.collection("partidos").doc(partidoId);
  const partidoSnap = await partidoRef.get();
  if (!partidoSnap.exists) throw new Error("Partido no encontrado");
  const partido = partidoSnap.data() as Partido;
  if (!puedeOperarCategoria(session, partido.categoriaId)) throw new Error("No autorizado");

  const [plantelSnap, incidentesSnap] = await Promise.all([
    partidoRef.collection("plantel").get(),
    partidoRef.collection("incidentes").get(),
  ]);

  const batch = adminDb.batch();
  const esPartidoDePrueba = PARTIDOS_DEMO_IDS.includes(partidoId);

  const originales = plantelSnap.docs.filter((d) => !d.data().agregadoEnVivo);
  const agregados = plantelSnap.docs.filter((d) => d.data().agregadoEnVivo);

  const titularesIds = originales.filter((d) => d.data().titular).map((d) => d.id);
  batch.update(partidoRef, {
    estado: "programado",
    resultado: { newman: 0, rival: 0 },
    enCanchaIds: titularesIds,
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(partidoRef.collection("liveState").doc("state"), {
    periodo: null,
    clockRunning: false,
    clockAnchor: null,
    accumulatedSeconds: 0,
  });

  for (const doc of originales) {
    const data = doc.data() as JugadorPartido;
    // terminarPartido ya sumo estos minutos a jugadores/{id}.minutosJugadosTotal -- revertirlo
    // antes de poner los campos del plantel en 0 de nuevo.
    const totalMinutos = (data.minutosJugados1T ?? 0) + (data.minutosJugados2T ?? 0);
    if (!esPartidoDePrueba && totalMinutos > 0) {
      batch.set(
        adminDb.collection("jugadores").doc(doc.id),
        { minutosJugadosTotal: FieldValue.increment(-totalMinutos) },
        { merge: true }
      );
    }
    batch.update(doc.ref, { enCancha: data.titular, minutosJugados1T: 0, minutosJugados2T: 0 });
  }
  for (const doc of agregados) {
    batch.delete(doc.ref);
  }

  // Revertir las tarjetas ya sumadas a jugadores/ (mismo campo/historial que publicarIncidente),
  // usando el tipo ACTUAL de cada incidencia -- si alguna fue corregida con corregirTipoIncidente,
  // jugadores/ ya refleja el tipo corregido, no el original.
  if (!esPartidoDePrueba) {
    for (const doc of incidentesSnap.docs) {
      const inc = doc.data() as Incidente;
      const campo = CAMPO_TARJETA[inc.tipo];
      const campoHistorial = CAMPO_HISTORIAL_TARJETA[inc.tipo];
      if (campo && inc.equipo === "newman" && inc.jugadorId) {
        batch.set(
          adminDb.collection("jugadores").doc(inc.jugadorId),
          {
            [campo]: FieldValue.increment(-1),
            ...(campoHistorial
              ? {
                  [campoHistorial]: FieldValue.arrayRemove({
                    numeroFecha: partido.numeroFecha,
                    rival: partido.rival,
                    incidenteId: doc.id,
                  } satisfies FilaHistorialTarjeta),
                }
              : {}),
          },
          { merge: true }
        );
      }
    }
  }

  for (const doc of incidentesSnap.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
  revalidatePath(`/partido/${partidoId}`);
  revalidatePath("/");
}
