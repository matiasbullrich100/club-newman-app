// Las 11 categorías del plantel superior son fijas (no cambian entre temporadas) — ids
// deterministas en vez de queries, así home/vista-de-fecha resuelven con un solo
// adminDb.getAll() y ya en orden. Los equipos de Juveniles siguen el mismo patrón, agrupados
// por edad (M15/M16/M17/M19); cada edad tiene sus propios equipos (letras) y su propio fixture
// de NUMERO_FECHAS_JUVENILES fechas, separado del de plantel superior.
export const CATEGORIAS = [
  { id: "primera", nombre: "Primera", orden: 0, grupo: "superior" },
  { id: "intermedia", nombre: "Intermedia", orden: 1, grupo: "superior" },
  { id: "pre-a", nombre: "Pre A", orden: 2, grupo: "superior" },
  { id: "pre-b", nombre: "Pre B", orden: 3, grupo: "superior" },
  { id: "m-22", nombre: "M-22", orden: 4, grupo: "superior" },
  { id: "pre-c", nombre: "Pre C", orden: 5, grupo: "superior" },
  { id: "pre-d", nombre: "Pre D", orden: 6, grupo: "superior" },
  { id: "pre-e", nombre: "Pre E", orden: 7, grupo: "superior" },
  { id: "pre-f", nombre: "Pre F", orden: 8, grupo: "superior" },
  { id: "pre-g", nombre: "Pre G", orden: 9, grupo: "superior" },
  { id: "pre-h", nombre: "Pre H", orden: 10, grupo: "superior" },
  { id: "m15-a", nombre: "M15 A", orden: 0, grupo: "juveniles", edadId: "m15", destacado: true },
  { id: "m15-b", nombre: "M15 B", orden: 1, grupo: "juveniles", edadId: "m15" },
  { id: "m15-c", nombre: "M15 C", orden: 2, grupo: "juveniles", edadId: "m15" },
  { id: "m15-d", nombre: "M15 D", orden: 3, grupo: "juveniles", edadId: "m15" },
  { id: "m16-a", nombre: "M16 A", orden: 0, grupo: "juveniles", edadId: "m16", destacado: true },
  { id: "m16-b", nombre: "M16 B", orden: 1, grupo: "juveniles", edadId: "m16" },
  { id: "m16-c", nombre: "M16 C", orden: 2, grupo: "juveniles", edadId: "m16" },
  { id: "m16-d", nombre: "M16 D", orden: 3, grupo: "juveniles", edadId: "m16" },
  { id: "m17-a", nombre: "M17 A", orden: 0, grupo: "juveniles", edadId: "m17", destacado: true },
  { id: "m17-b", nombre: "M17 B", orden: 1, grupo: "juveniles", edadId: "m17" },
  { id: "m17-c", nombre: "M17 C", orden: 2, grupo: "juveniles", edadId: "m17" },
  { id: "m19-a", nombre: "M19 A", orden: 0, grupo: "juveniles", edadId: "m19", destacado: true },
  { id: "m19-b", nombre: "M19 B", orden: 1, grupo: "juveniles", edadId: "m19" },
  { id: "m19-c", nombre: "M19 C", orden: 2, grupo: "juveniles", edadId: "m19" },
  { id: "m19-d", nombre: "M19 D", orden: 3, grupo: "juveniles", edadId: "m19" },
  { id: "m19-e", nombre: "M19 E", orden: 4, grupo: "juveniles", edadId: "m19" },
  { id: "m19-f", nombre: "M19 F", orden: 5, grupo: "juveniles", edadId: "m19" },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]["id"];

export const CATEGORIAS_SUPERIOR = CATEGORIAS.filter((c) => c.grupo === "superior");

export const EDADES = [
  { id: "m15", nombre: "M15" },
  { id: "m16", nombre: "M16" },
  { id: "m17", nombre: "M17" },
  { id: "m19", nombre: "M19" },
] as const;

export type EdadId = (typeof EDADES)[number]["id"];

export function equiposDeEdad(edadId: string) {
  return CATEGORIAS.filter((c) => c.grupo === "juveniles" && c.edadId === edadId);
}

// En Juveniles, "Newman" solo no alcanza -- hay 4 equipos de la misma edad jugando la misma
// fecha. Se pide aclarar "Newman A/B/C/D" en los resumenes/incidencias; en Plantel Superior
// (una sola categoria = un solo equipo) no aplica.
export function nombreNewmanDe(categoriaId: string): string {
  const cat = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!cat || cat.grupo !== "juveniles") return "Newman";
  const letra = cat.nombre.split(" ").pop();
  return letra ? `Newman ${letra}` : "Newman";
}

// Con que plantel se etiqueta cada jugador en la coleccion global `jugadores/` -- para poder
// separar Plantel Superior de cada division de Juveniles en /estadisticas y en el buscador de
// cambios (ver src/lib/match/actions.ts).
export function grupoDeCategoria(categoriaId: string): { grupo: "superior" | "juveniles"; edadId?: string } {
  const cat = CATEGORIAS.find((c) => c.id === categoriaId);
  if (cat?.grupo === "juveniles") return { grupo: "juveniles", edadId: cat.edadId };
  return { grupo: "superior" };
}

export const NUMERO_FECHAS_SUPERIOR = 26;
export const NUMERO_FECHAS_JUVENILES = 11;

export function partidoId(categoriaId: string, numeroFecha: number | string): string {
  return `${categoriaId}-f${numeroFecha}`;
}

const NOMBRE_A_ID = new Map<string, string>(CATEGORIAS.map((c) => [c.nombre, c.id]));

export function categoriaIdPorNombre(nombre: string): string {
  const id = NOMBRE_A_ID.get(nombre);
  if (!id) throw new Error(`Categoria desconocida: "${nombre}"`);
  return id;
}
