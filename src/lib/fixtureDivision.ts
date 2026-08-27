import fixtureDatos from "@/data/fixture-division-superior.json";
import resultadosDatos from "@/data/resultados-division-superior.json";
import fixtureJuvenilesDatos from "@/data/fixture-division-juveniles.json";
import resultadosJuvenilesDatos from "@/data/resultados-division-juveniles.json";
import { normalizarNombreEquipo } from "./urba";
import { grupoDeCategoria, NUMERO_FECHAS_JUVENILES, NUMERO_FECHAS_SUPERIOR } from "./categorias";

// Fixture completo (todas las fechas, los ~7 partidos de cada fecha) de la zona de URBA de cada
// categoria -- calendario y resultados vienen de fixture.urba.org.ar (scrapeado a mano, no hay
// endpoint publico de resultados/partidos -- ver src/lib/urba.ts, que solo cubre posiciones).
//
// Plantel Superior: 9 divisiones en formato "TOP 14" (26 fechas) -- pre-g y pre-h no estan en ese
// formato, asi que no tienen datos aca.
//
// Juveniles: cada letra (m15-a, m15-b, ...) juega en SU PROPIA zona de URBA (a diferencia de
// Plantel Superior, las letras de una misma edad no comparten division) -- 11 fechas, un solo
// round robin (Segunda Rueda). m19-f no tiene zona propia en URBA esta temporada.
export const CATEGORIAS_CON_FIXTURE_DIVISION = [
  "primera",
  "intermedia",
  "pre-a",
  "pre-b",
  "pre-c",
  "pre-d",
  "pre-e",
  "pre-f",
  "m-22",
  "m15-a",
  "m15-b",
  "m15-c",
  "m15-d",
  "m16-a",
  "m16-b",
  "m16-c",
  "m16-d",
  "m17-a",
  "m17-b",
  "m17-c",
  "m19-a",
  "m19-b",
  "m19-c",
  "m19-d",
  "m19-e",
] as const;

export type CategoriaConFixtureDivision = (typeof CATEGORIAS_CON_FIXTURE_DIVISION)[number];

export function tieneFixtureDivision(categoriaId: string): categoriaId is CategoriaConFixtureDivision {
  return (CATEGORIAS_CON_FIXTURE_DIVISION as readonly string[]).includes(categoriaId);
}

// Nombre del equipo propio de Newman en una división de Plantel Superior cuando NO es solo "Newman"
// -- de Preintermedia B a H el club mete varios planteles ("Newman B" … "Newman H"). Primera,
// Intermedia, Pre A y M-22 son "Newman" a secas → undefined. Se usa en el resumen de partidos
// internos (ej. Newman F vs Newman G), donde el rival también empieza con "Newman ".
export function nombrePropioDivision(categoriaId: string): string | undefined {
  const m = /^pre-([b-h])$/.exec(categoriaId);
  return m ? `Newman ${m[1].toUpperCase()}` : undefined;
}

// Cuantas fechas tiene el picker/paginador de Fixture Division de esta categoria -- 26 en Plantel
// Superior (TOP 14), 11 en Juveniles (un solo round robin de Segunda Rueda).
export function numeroFechasDivisionDe(categoriaId: string): number {
  return grupoDeCategoria(categoriaId).grupo === "juveniles" ? NUMERO_FECHAS_JUVENILES : NUMERO_FECHAS_SUPERIOR;
}

export interface PartidoDivision {
  local: string;
  visitante: string;
  esNewman: boolean;
  jugado: boolean;
  golesLocal?: number;
  golesVisitante?: number;
  bonusLocal?: boolean;
  bonusVisitante?: boolean;
  // "sin_info" (URBA todavia no cargo ese cruce) o "postergado" (partido postergado/suspendido) --
  // en cualquiera de los dos casos no hay resultado que mostrar aunque la fecha ya haya pasado.
  especial?: "sin_info" | "postergado";
}

export interface FechaDivision {
  fecha: string; // ISO yyyy-mm-dd
  partidos: PartidoDivision[];
}

type DatosFixtureCategoria = Record<string, { fecha: string; partidos: string[][] }>;
type PartidoResultadoRaw = {
  local: string;
  visitante: string;
  golesLocal?: number;
  golesVisitante?: number;
  bonusLocal?: boolean;
  bonusVisitante?: boolean;
  especial?: "sin_info" | "postergado";
};
type DatosResultadosCategoria = Record<string, { fecha: string | null; partidos: PartidoResultadoRaw[] }>;

const FIXTURE = {
  ...(fixtureDatos as unknown as Record<CategoriaConFixtureDivision, DatosFixtureCategoria>),
  ...(fixtureJuvenilesDatos as unknown as Record<CategoriaConFixtureDivision, DatosFixtureCategoria>),
};
const RESULTADOS = {
  ...(resultadosDatos as unknown as Record<CategoriaConFixtureDivision, DatosResultadosCategoria>),
  ...(resultadosJuvenilesDatos as unknown as Record<CategoriaConFixtureDivision, DatosResultadosCategoria>),
};

// El nombre EXACTO con el que aparece nuestro propio equipo en el sitio de URBA para cada
// categoria -- no siempre es "Newman" a secas. En Preintermedia B a E, el propio equipo aparece
// como "Newman B"/"Newman C"/etc. Preintermedia F es un caso particular: el club mete 3 planteles
// (Newman F, G y H) en la MISMA zona de 14 equipos -- el nuestro (categoria "pre-f") es "Newman
// F"; G y H son otros planteles del club que juegan en esa misma zona, no nosotros. En Juveniles
// cada letra tiene su propia zona (no comparten con otras letras de Newman), asi que la letra de
// la categoria coincide siempre con la del equipo propio en la zona.
const NOMBRE_PROPIO: Record<CategoriaConFixtureDivision, string> = {
  primera: "Newman",
  intermedia: "Newman",
  "pre-a": "Newman",
  "pre-b": "Newman B",
  "pre-c": "Newman C",
  "pre-d": "Newman D",
  "pre-e": "Newman E",
  "pre-f": "Newman F",
  "m-22": "Newman",
  "m15-a": "Newman A",
  "m15-b": "Newman B",
  "m15-c": "Newman C",
  "m15-d": "Newman D",
  "m16-a": "Newman A",
  "m16-b": "Newman B",
  "m16-c": "Newman C",
  "m16-d": "Newman D",
  "m17-a": "Newman A",
  "m17-b": "Newman B",
  "m17-c": "Newman C",
  "m19-a": "Newman A",
  "m19-b": "Newman B",
  "m19-c": "Newman C",
  "m19-d": "Newman D",
  "m19-e": "Newman E",
};

function nombreCorto(nombre: string, propio: string): string {
  return nombre === propio ? "Newman" : normalizarNombreEquipo(nombre);
}

export function fixtureDivisionDe(categoriaId: CategoriaConFixtureDivision, numeroFecha: number): FechaDivision | null {
  const propio = NOMBRE_PROPIO[categoriaId];
  const resultado = RESULTADOS[categoriaId]?.[String(numeroFecha)];

  if (resultado) {
    return {
      fecha: resultado.fecha ?? "",
      partidos: resultado.partidos.map((p) => ({
        local: nombreCorto(p.local, propio),
        visitante: nombreCorto(p.visitante, propio),
        esNewman: p.local === propio || p.visitante === propio,
        jugado: true,
        golesLocal: p.golesLocal,
        golesVisitante: p.golesVisitante,
        bonusLocal: p.bonusLocal,
        bonusVisitante: p.bonusVisitante,
        especial: p.especial,
      })),
    };
  }

  const fecha = FIXTURE[categoriaId]?.[String(numeroFecha)];
  if (!fecha) return null;
  return {
    fecha: fecha.fecha,
    partidos: fecha.partidos.map(([local, visitante]) => ({
      local: nombreCorto(local, propio),
      visitante: nombreCorto(visitante, propio),
      esNewman: local === propio || visitante === propio,
      jugado: false,
    })),
  };
}
