import { equiposDeEdad, grupoDeCategoria } from "@/lib/categorias";

// Lista de equipos hermanos para la barra <TiraEquipos> (saltar de un equipo a otro sin volver
// atrás). Por ahora SOLO M15 -- es una prueba del patrón antes de sumarlo al resto de las edades
// y a Plantel Superior. Devuelve null cuando no corresponde mostrar la barra.
//
// `hrefDe` se llama server-side para armar cada href (la barra recibe strings, no funciones).
export function equiposParaTira(
  categoriaId: string,
  hrefDe: (id: string) => string
): { id: string; nombre: string; href: string }[] | null {
  const { grupo, edadId } = grupoDeCategoria(categoriaId);
  if (grupo !== "juveniles" || edadId !== "m15") return null;
  return equiposDeEdad(edadId).map((e) => ({ id: e.id, nombre: e.nombre, href: hrefDe(e.id) }));
}
