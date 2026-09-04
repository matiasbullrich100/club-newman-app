import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import {
  CATEGORIAS_SUPERIOR,
  EDADES,
  equiposDeEdad,
  NUMERO_FECHAS_SUPERIOR,
  NUMERO_FECHAS_JUVENILES,
  partidoId,
  partidoIdsDeGrupo,
} from "@/lib/categorias";
import { hoyIsoEnArgentina } from "@/lib/fecha";
import type { Timestamp } from "firebase-admin/firestore";
import type { Partido } from "@/types/firestore";

export type EstadoSubida = "sin-subir" | "borrador" | "publicada" | "libre" | "sin-fecha";

// Fecha libre / walkover: rival "Libre" o notaEspecial -- no lleva formación.
function esBye(p: Partido): boolean {
  return !!p.notaEspecial || /^libre$/i.test((p.rival ?? "").trim());
}

export interface EstadoFormacion {
  categoriaId: string;
  categoriaNombre: string;
  partidoId: string | null;
  rival: string | null;
  fecha: string | null;
  estadoPartido: Partido["estado"] | null;
  jugadores: number;
  estado: EstadoSubida;
  // Cuándo se cargó/tocó la formación por última vez -- ver Partido.formacionActualizadaEn.
  formacionActualizadaEn: Timestamp | Date | null;
}

export interface GrupoEstadoFormaciones {
  titulo: string;
  numeroFecha: number | null;
  filas: EstadoFormacion[];
}

async function estadoDeGrupo(
  titulo: string,
  grupoKey: string, // "superior" | edadId
  categorias: { id: string; nombre: string }[],
  numFechas: number
): Promise<GrupoEstadoFormaciones> {
  // Traigo todos los partidos del grupo de una (ids deterministicos) para calcular la fecha en curso.
  const ids = partidoIdsDeGrupo(grupoKey);
  const snaps = await adminDb.getAll(...ids.map((id) => adminDb.collection("partidos").doc(id)));
  const porFecha = new Map<number, Partido[]>();
  for (const s of snaps) {
    if (!s.exists) continue;
    const p = s.data() as Partido;
    const n = Number(p.numeroFecha);
    if (!Number.isFinite(n)) continue;
    (porFecha.get(n) ?? porFecha.set(n, []).get(n)!).push(p);
  }

  // "Fecha en curso" = la menor numeroFecha con algún partido cuya fecha calendario sea hoy o
  // posterior (la que se está por jugar). Se usa la fecha del fixture, no el estado
  // "terminado/programado" -- fechas viejas a veces quedaron con algún partido sin cerrar. Si están
  // todas en el pasado, la última con partidos.
  const hoy = hoyIsoEnArgentina();
  let numeroFecha: number | null = null;
  for (let n = 1; n <= numFechas; n++) {
    const ps = porFecha.get(n);
    if (!ps || ps.length === 0) continue;
    numeroFecha = n;
    if (ps.some((p) => p.fecha && p.fecha >= hoy)) break;
  }

  if (numeroFecha === null) {
    return { titulo, numeroFecha: null, filas: categorias.map((c) => vacia(c)) };
  }

  const filas = await Promise.all(
    categorias.map(async (c): Promise<EstadoFormacion> => {
      const pid = partidoId(c.id, numeroFecha!);
      const partido = (porFecha.get(numeroFecha!) ?? []).find((p) => p.categoriaId === c.id) ?? null;
      if (!partido) {
        return { ...vacia(c), partidoId: null, estado: "sin-fecha" as EstadoSubida };
      }
      if (esBye(partido)) {
        return {
          categoriaId: c.id,
          categoriaNombre: c.nombre,
          partidoId: pid,
          rival: partido.rival,
          fecha: partido.fecha ?? null,
          estadoPartido: partido.estado,
          jugadores: 0,
          estado: "libre",
          formacionActualizadaEn: null,
        };
      }
      const plantelSnap = await adminDb.collection("partidos").doc(pid).collection("plantel").get();
      const jugadores = plantelSnap.size;
      // formacionPublicada ausente/true = publicada (default historico); solo false = borrador.
      // Un partido ya jugado con plantel cuenta como publicado.
      const estado: EstadoSubida =
        jugadores === 0
          ? "sin-subir"
          : partido.estado !== "programado"
            ? "publicada"
            : partido.formacionPublicada === false
              ? "borrador"
              : "publicada";
      return {
        categoriaId: c.id,
        categoriaNombre: c.nombre,
        partidoId: pid,
        rival: partido.rival,
        fecha: partido.fecha ?? null,
        estadoPartido: partido.estado,
        jugadores,
        estado,
        formacionActualizadaEn: partido.formacionActualizadaEn ?? null,
      };
    })
  );

  return { titulo, numeroFecha, filas };
}

function vacia(c: { id: string; nombre: string }): EstadoFormacion {
  return {
    categoriaId: c.id,
    categoriaNombre: c.nombre,
    partidoId: null,
    rival: null,
    fecha: null,
    estadoPartido: null,
    jugadores: 0,
    estado: "sin-fecha",
    formacionActualizadaEn: null,
  };
}

/**
 * Para cada grupo (Plantel Superior + las 4 edades de Juveniles): la FECHA en curso (la menor
 * sin terminar) y, para esa fecha, en qué estado está la formación de cada equipo -- Sin subir /
 * Borrador (cargada, no publicada) / Publicada. Sirve para ver de un vistazo qué equipos faltan
 * cargar, sobre todo en Juveniles, que llegan por división.
 */
export async function estadoFormaciones(): Promise<GrupoEstadoFormaciones[]> {
  const grupos = await Promise.all([
    estadoDeGrupo("Plantel Superior", "superior", CATEGORIAS_SUPERIOR.map((c) => ({ id: c.id, nombre: c.nombre })), NUMERO_FECHAS_SUPERIOR),
    ...EDADES.map((edad) =>
      estadoDeGrupo(edad.nombre, edad.id, equiposDeEdad(edad.id).map((c) => ({ id: c.id, nombre: c.nombre })), NUMERO_FECHAS_JUVENILES)
    ),
  ]);
  return grupos;
}
