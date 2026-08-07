// Las 11 categorías son fijas (no cambian entre temporadas) — ids deterministas en vez de
// queries, así home/vista-de-fecha resuelven con un solo adminDb.getAll() y ya en orden.
export const CATEGORIAS = [
  { id: "primera", nombre: "Primera", orden: 0 },
  { id: "intermedia", nombre: "Intermedia", orden: 1 },
  { id: "pre-a", nombre: "Pre A", orden: 2 },
  { id: "pre-b", nombre: "Pre B", orden: 3 },
  { id: "m-22", nombre: "M-22", orden: 4 },
  { id: "pre-c", nombre: "Pre C", orden: 5 },
  { id: "pre-d", nombre: "Pre D", orden: 6 },
  { id: "pre-e", nombre: "Pre E", orden: 7 },
  { id: "pre-f", nombre: "Pre F", orden: 8 },
  { id: "pre-g", nombre: "Pre G", orden: 9 },
  { id: "pre-h", nombre: "Pre H", orden: 10 },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]["id"];

export function partidoId(categoriaId: string, numeroFecha: number | string): string {
  return `${categoriaId}-f${numeroFecha}`;
}

const NOMBRE_A_ID = new Map<string, string>(CATEGORIAS.map((c) => [c.nombre, c.id]));

export function categoriaIdPorNombre(nombre: string): string {
  const id = NOMBRE_A_ID.get(nombre);
  if (!id) throw new Error(`Categoria desconocida: "${nombre}"`);
  return id;
}
