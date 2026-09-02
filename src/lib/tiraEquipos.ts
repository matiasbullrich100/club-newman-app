import { CATEGORIAS_SUPERIOR, equiposDeEdad, grupoDeCategoria } from "@/lib/categorias";

// Lista de equipos hermanos para la barra <TiraEquipos> (saltar de un equipo a otro sin volver
// atrás). Devuelve null si no tiene sentido mostrar la barra (queda 1 solo equipo).
//
// - Juveniles: los equipos de la misma edad (M15 A/B/C/D, M19 A..F, etc.).
// - Plantel Superior: las 11 categorías (Primera, Inter, Pre A … Pre H).
//
// `hrefDe` se llama server-side para armar cada href (la barra recibe strings, no funciones).
// `incluir` (opcional) filtra qué hermanos entran -- para pantallas que no existen para todos
// (ej. Fixt División o Tabla no está para toda categoría). El equipo actual siempre queda,
// aunque el filtro lo dejaría afuera.
export function equiposParaTira(
  categoriaId: string,
  hrefDe: (id: string) => string,
  incluir?: (id: string) => boolean
): { id: string; nombre: string; href: string }[] | null {
  const { grupo, edadId } = grupoDeCategoria(categoriaId);
  const base = grupo === "juveniles" && edadId ? equiposDeEdad(edadId) : CATEGORIAS_SUPERIOR;
  const equipos = incluir ? base.filter((e) => e.id === categoriaId || incluir(e.id)) : base;
  if (equipos.length <= 1) return null;
  return equipos.map((e) => ({ id: e.id, nombre: e.nombre, href: hrefDe(e.id) }));
}
