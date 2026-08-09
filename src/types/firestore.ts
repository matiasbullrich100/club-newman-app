// Shapes of every document this app reads/writes in Firestore.
// See C:\Users\Matias\.claude\plans\jaunty-toasting-narwhal.md for the data-model rationale.
//
// `Timestamp` is imported type-only from firebase-admin — erased at build time, so importing
// this file from client components (for the LiveState/Cronometro shape) never pulls in Node code.
import type { Timestamp } from "firebase-admin/firestore";

export type Rol = "designado" | "entrenador" | "manager";

export interface Categoria {
  nombre: string;
  orden: number;
  isTest?: boolean;
}

// Collection `cuentas` — Firestore rules deny ALL client read/write. Only touched server-side.
export interface Cuenta {
  rol: Rol;
  username: string;
  passwordHash: string;
  categoriaId?: string; // only rol === "designado"
  createdAt: Timestamp | Date;
}

export type EstadoPartido =
  | "programado"
  | "en_juego"
  | "entretiempo"
  | "suspendido"
  | "terminado";

export interface Resultado {
  newman: number;
  rival: number;
  bonusNewman?: boolean;
  bonusRival?: boolean;
}

export interface Partido {
  categoriaId: string;
  numeroFecha: number | string;
  fecha?: string; // ISO "YYYY-MM-DD", fecha calendario del fixture — no siempre disponible (partido de prueba)
  rival: string;
  esLocal: boolean;
  cancha: string;
  hora?: string; // "HH:MM", solo si se conoce el horario (ej. juveniles)
  estado: EstadoPartido;
  resultado: Resultado;
  enCanchaIds: string[];
  // Se muestra en vez del resultado/"vs", sea cual sea el estado — ej. "Fecha libre" o
  // "Suspendido por tormenta eléctrica". No confundir con estado "suspendido", que es
  // exclusivamente para un partido EN CURSO pausado por el Designado (ver match/actions.ts).
  notaEspecial?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type Periodo = "1T" | "2T";

// Subcollection `partidos/{id}/liveState`, single doc with id "state".
export interface LiveState {
  periodo: Periodo | null;
  clockRunning: boolean;
  clockAnchor: Timestamp | Date | null;
  accumulatedSeconds: number;
  period1DurationSeconds?: number;
  period2DurationSeconds?: number;
}

// Subcollection `partidos/{id}/plantel/{jugadorId}`.
export interface JugadorPartido {
  nombre: string;
  dorsal: string;
  titular: boolean;
  enCancha: boolean;
  capitan?: boolean;
  debut?: boolean;
  minutosJugados1T?: number;
  minutosJugados2T?: number;
}

export type TipoIncidente =
  | "try"
  | "try_scrum"
  | "conversion"
  | "penal"
  | "drop"
  | "try_penal"
  | "tarjeta_amarilla"
  | "tarjeta_doble_amarilla"
  | "tarjeta_roja"
  | "tarjeta_roja_20"
  | "tarjeta_azul"
  | "cambio"
  | "lesion"
  | "fin_1t"
  | "fin_2t";

export type Equipo = "newman" | "rival";

// Subcollection `partidos/{id}/incidentes/{id}` — append-only.
export interface Incidente {
  tipo: TipoIncidente;
  // No aplica a fin_1t/fin_2t (marcan el cierre de un tiempo, no son de ningun equipo).
  equipo?: Equipo;
  puntos?: number;
  jugadorId?: string;
  jugadorNombre?: string;
  dorsal?: string;
  jugadorSaleId?: string;
  jugadorSaleNombre?: string;
  jugadorEntraId?: string;
  jugadorEntraNombre?: string;
  periodo: Periodo;
  minuto: number;
  segundoAbsoluto: number;
  publicadoPorCuentaId: string;
  createdAt: Timestamp | Date;
}

// Top-level collection `jugadores/{jugadorId}` — cross-match aggregate.
export interface JugadorAgregado {
  nombre: string;
  tarjetasAmarillas: number;
  tarjetasDobleAmarilla: number;
  tarjetasRojas: number;
  tarjetasRojas20: number;
  tarjetasAzules: number;
  minutosJugadosTotal: number;
}

export const PUNTOS_POR_TIPO: Record<
  "try" | "try_scrum" | "conversion" | "penal" | "drop" | "try_penal",
  number
> = {
  try: 5,
  try_scrum: 5,
  conversion: 2,
  penal: 3,
  drop: 3,
  try_penal: 7,
};
