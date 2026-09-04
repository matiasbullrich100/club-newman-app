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
  alcance?: string; // only rol === "manager" -- edadId de Juveniles; ausente = sin restriccion
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
  // Tries de cada equipo (try + try_scrum + try_penal). Se lleva un contador incremental en vivo
  // (publicarIncidente/corregir/eliminar) y se recalcula exacto desde las incidencias en
  // terminarPartido. Se muestra "(4T)" al lado del marcador, en vivo y al terminar.
  triesNewman?: number;
  triesRival?: number;
}

export interface Partido {
  categoriaId: string;
  numeroFecha: number | string;
  fecha?: string; // ISO "YYYY-MM-DD", fecha calendario del fixture — no siempre disponible (partido de prueba)
  rival: string;
  esLocal: boolean;
  cancha: string;
  // Numero/nombre de cancha PUNTUAL dentro del predio (ej. "3") -- lo confirma el club rival
  // (o el propio Newman si es local) recien el dia antes, distinto de `cancha` que es el predio/
  // club entero (ej. "Champagnat"). Sin dato hasta que avisen.
  numeroCancha?: string;
  hora?: string; // "HH:MM", solo si se conoce el horario (ej. juveniles)
  estado: EstadoPartido;
  resultado: Resultado;
  enCanchaIds: string[];
  // Se muestra en vez del resultado/"vs", sea cual sea el estado — ej. "Fecha libre" o
  // "Suspendido por tormenta eléctrica". No confundir con estado "suspendido", que es
  // exclusivamente para un partido EN CURSO pausado por el Designado (ver match/actions.ts).
  notaEspecial?: string;
  // true si es un amistoso arreglado por el club para llenar una fecha libre del fixture oficial
  // (no cuenta para la tabla de posiciones) -- se aclara junto al resultado/matchup, a diferencia
  // de notaEspecial que reemplaza el matchup entero.
  amistoso?: boolean;
  // Solo aplica a un partido "programado" -- ausente o true = la formacion es publica (default,
  // asi ningun partido historico/ya migrado se ve afectado). false = alguien ya cargo la
  // formacion pero el club todavia no la comunico; solo quien puede operar esta categoria la ve,
  // el resto ve "aun no publicada" hasta que se aprieta "Publicar formacion" (ver
  // publicarFormacion en match/actions.ts).
  formacionPublicada?: boolean;
  // Cuándo se cargó/tocó por última vez la formación de este partido (un script de migración, o
  // reemplazarJugadorFormacion). Sirve para que en /formaciones se vea de un vistazo si lo que
  // estás por publicar es lo que se subió recién o algo viejo -- no confundir con `updatedAt`,
  // que también lo tocan el motor en vivo, /programar, etc.
  formacionActualizadaEn?: Timestamp | Date;
  // jugadorId del pateador habitual de ESTE partido (conversiones/penales -- drop queda afuera,
  // menos repetible). Se pregunta una sola vez, apenas arranca el partido (ver PateadorHabitual.tsx
  // y sugerirPateador() en match/pateador.ts para la sugerencia automatica). undefined = todavia no
  // se preguntó; null = el designado eligió explícitamente "sin pateador fijo" para no volver a
  // preguntar. Habilita el atajo "¿Fue [fulano]?" en CargaIncidencia en vez de buscarlo en la lista.
  pateadorHabitualId?: string | null;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface FilaPosicion {
  posicion: number;
  equipo: string;
  jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  puntosFavor: number;
  puntosContra: number;
  diferencia: number;
  bonusOfensivo: number;
  bonusDefensivo: number;
  puntos: number;
}

// Collection `posiciones/{categoriaId}` -- cache semanal de la tabla de posiciones oficial de
// URBA (ver src/lib/urba.ts y src/scripts/actualizar-posiciones.ts), para no pegarle a la API
// externa en cada visita de un usuario. categoriaId es el mismo id que en categorias.ts.
export interface PosicionesTorneo {
  championshipId: number;
  championshipName: string;
  nuestroEquipo: string;
  filas: FilaPosicion[];
  updatedAt: Timestamp | Date;
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
  motivoInterrupcion?: "medico" | "clima" | "referee" | null;
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
  // true si este jugador no estaba en la formacion subida originalmente y se agrego despues via
  // el buscador de "otro jugador" (en un Cambio en vivo o editando la formacion antes de
  // arrancar) -- resetearPartidoDemo lo usa para saber a quien borrar del todo al resetear un
  // partido de prueba, en vez de solo reiniciarle las banderas.
  agregadoEnVivo?: boolean;
  // true si a este jugador le sacaron roja (directa o por doble amarilla) -- a diferencia de una
  // amarilla/roja de 20 (sin-bin temporal, ver DURACION_SANCION_SEGUNDOS), no vuelve mas a jugar
  // este partido. Se usa para sacarlo de cualquier "banco" de reingreso/cambio (CargaCambio,
  // SancionesActivas), no solo de enCanchaIds -- si no, alguien podria seleccionarlo por error
  // como "quien entra" en un cambio de otro jugador.
  expulsadoDefinitivo?: boolean;
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
  | "fin_2t"
  | "fin_partido"
  | "interrupcion_medica"
  | "interrupcion_clima"
  | "interrupcion_referee"
  | "walkover";

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
  // true si se publicó con el partido en "entretiempo" (ej. un cambio táctico en el descanso) --
  // periodo/minuto igual quedan con el valor del cierre del 1T (para el orden cronológico), pero
  // el feed tiene que mostrar "Entretiempo" en vez de "1T X'", que sería engañoso.
  enEntretiempo?: boolean;
  // Solo para tarjeta_amarilla/tarjeta_roja_20 del RIVAL -- del rival no llevamos plantel, asi que
  // no hay "quien entra" que registrar (a diferencia de una sancion de Newman, que se resuelve
  // sola cuando enCanchaIds vuelve a incluir a alguien en ese puesto). El designado marca a mano
  // que el rival ya volvio a jugar con el sancionado adentro -- ver resolverSancionRival().
  sancionResuelta?: boolean;
  // Solo en el incidente tipo "cambio" que CIERRA una sancion (ver reingresarSancion y
  // resolverSancionRival) -- que tipo de tarjeta se esta cerrando, y si volvio el mismo jugador
  // sancionado o entro otro distinto. describirIncidente usa estos dos campos para mostrar "Fin
  // {tarjeta}: sale X, entra Y" (jugador distinto) o "Reingresó X" (mismo jugador) en vez del
  // texto generico de un cambio tactico comun.
  cierreSancionTipo?: TipoIncidente;
  cierreSancionMismoJugador?: boolean;
  // true solo en el "cambio" automatico que publicarIncidente genera al cargar una amarilla/roja
  // de 20 (saca al jugador de la cancha ahi mismo) -- existe para que calcularMinutos() le corte
  // los minutos en ese momento y para que reingresarSancion lo encuentre en el banco, pero NO se
  // muestra en el feed: la tarjeta ya dice "sale X" con la misma info, mostrar las dos juntas
  // duplica el mensaje.
  ocultoEnFeed?: boolean;
  publicadoPorCuentaId: string;
  createdAt: Timestamp | Date;
}

// Una fila del historial de tarjetas de un jugador -- misma forma que FechaTarjeta en
// tarjetasFormato.ts (numeroFecha + rival), mas incidenteId. Ese id (el del doc en
// partidos/{id}/incidentes/{incidenteId}) es necesario para poder sacar UNA entrada puntual con
// arrayRemove sin arrastrar otras identicas -- ej. 2 amarillas en la misma fecha contra el mismo
// rival tendrian el mismo {numeroFecha, rival} pero distinto incidenteId, y Firestore necesita un
// match exacto (deep-equal) para remover precisamente una del array.
export interface FilaHistorialTarjeta {
  numeroFecha: number | string;
  rival: string;
  incidenteId: string;
}

// Top-level collection `jugadores/{jugadorId}` — cross-match aggregate.
export interface JugadorAgregado {
  nombre: string;
  grupo: "superior" | "juveniles";
  edadId?: string; // solo grupo === "juveniles"
  tarjetasAmarillas: number;
  tarjetasDobleAmarilla: number;
  tarjetasRojas: number;
  tarjetasRojas20: number;
  tarjetasAzules: number;
  minutosJugadosTotal: number;
  // Historial fecha-por-fecha de cada tipo de tarjeta, mantenido incrementalmente en los mismos
  // call sites que los contadores de arriba (ver CAMPO_HISTORIAL_TARJETA en match/actions.ts) --
  // asi /estadisticas/[grupoId] puede armar la tabla de Tarjetas sin volver a escanear Firestore.
  fechasAmarillas?: FilaHistorialTarjeta[];
  fechasDobleAmarilla?: FilaHistorialTarjeta[];
  fechasRojas?: FilaHistorialTarjeta[];
  fechasRojas20?: FilaHistorialTarjeta[];
  fechasAzules?: FilaHistorialTarjeta[];
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
