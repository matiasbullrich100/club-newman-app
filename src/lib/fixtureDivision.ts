import fixtureDatos from "@/data/fixture-division-superior.json";
import resultadosDatos from "@/data/resultados-division-superior.json";
import { normalizarNombreEquipo } from "./urba";

// Fixture completo (las 26 fechas, los 7 partidos de cada fecha) de las 9 divisiones de Plantel
// Superior que se juegan en formato "TOP 14" -- el calendario (quien juega con quien) esta cargado
// a mano desde el PDF oficial de URBA que paso el club, y los resultados de las fechas ya jugadas
// (1 a 18 a esta altura de la temporada) vienen de fixture.urba.org.ar (scrapeado a mano, no hay
// endpoint publico de resultados/partidos -- ver src/lib/urba.ts, que solo cubre posiciones).
// pre-g y pre-h no estan en este formato en el PDF, asi que no tienen datos aca.
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
] as const;

export type CategoriaConFixtureDivision = (typeof CATEGORIAS_CON_FIXTURE_DIVISION)[number];

export function tieneFixtureDivision(categoriaId: string): categoriaId is CategoriaConFixtureDivision {
  return (CATEGORIAS_CON_FIXTURE_DIVISION as readonly string[]).includes(categoriaId);
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

const FIXTURE = fixtureDatos as unknown as Record<CategoriaConFixtureDivision, DatosFixtureCategoria>;
const RESULTADOS = resultadosDatos as unknown as Record<CategoriaConFixtureDivision, DatosResultadosCategoria>;

// El nombre EXACTO con el que aparece nuestro propio equipo en el PDF/sitio de URBA para cada
// division -- no siempre es "Newman" a secas. En Preintermedia B a E, el propio equipo aparece
// como "Newman B"/"Newman C"/etc. Preintermedia F es un caso particular: el club mete 3 planteles
// (Newman F, G y H) en la MISMA zona de 14 equipos -- el nuestro (categoria "pre-f") es "Newman
// F"; G y H son otros planteles del club que juegan en esa misma zona, no nosotros.
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
