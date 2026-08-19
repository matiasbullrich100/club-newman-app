import datos from "@/data/fixture-division-superior.json";
import { normalizarNombreEquipo } from "./urba";

// Fixture completo (las 26 fechas, los 7 partidos de cada fecha) de las 9 divisiones de Plantel
// Superior que se juegan en formato "TOP 14" -- cargado a mano desde el PDF oficial de URBA que
// pasó el club (no hay endpoint publico de fixture, solo de posiciones, ver src/lib/urba.ts).
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
}

export interface FechaDivision {
  fecha: string; // ISO yyyy-mm-dd
  partidos: PartidoDivision[];
}

type DatosCategoria = Record<string, { fecha: string; partidos: string[][] }>;
const DATOS = datos as unknown as Record<CategoriaConFixtureDivision, DatosCategoria>;

// El nombre EXACTO con el que aparece nuestro propio equipo en el PDF de URBA para cada division
// -- no siempre es "Newman" a secas. En Preintermedia B a E, el propio equipo aparece como
// "Newman B"/"Newman C"/etc. Preintermedia F es un caso particular: el club mete 3 planteles
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

export function fixtureDivisionDe(categoriaId: CategoriaConFixtureDivision, numeroFecha: number): FechaDivision | null {
  const fecha = DATOS[categoriaId]?.[String(numeroFecha)];
  if (!fecha) return null;
  const propio = NOMBRE_PROPIO[categoriaId];
  return {
    fecha: fecha.fecha,
    partidos: fecha.partidos.map(([local, visitante]) => ({
      local: local === propio ? "Newman" : normalizarNombreEquipo(local),
      visitante: visitante === propio ? "Newman" : normalizarNombreEquipo(visitante),
      esNewman: local === propio || visitante === propio,
    })),
  };
}
