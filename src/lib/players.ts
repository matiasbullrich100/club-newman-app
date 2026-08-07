// Identidad unica de jugador -- ver ESPECIFICACION.md seccion 8. El dorsal NO sirve como id
// (un jugador cambia de dorsal entre semanas y categorias); el id es el nombre normalizado.

const COMBINING_DIACRITICS_RANGE_START = 0x0300;
const COMBINING_DIACRITICS_RANGE_END = 0x036f;

function stripDiacritics(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code >= COMBINING_DIACRITICS_RANGE_START && code <= COMBINING_DIACRITICS_RANGE_END) {
      continue;
    }
    out += ch;
  }
  return out;
}

export function norm(s: string): string {
  return stripDiacritics(s.toLowerCase().normalize("NFD"))
    .replace(/\s+/g, " ")
    .trim();
}

export function playerId(name: string): string {
  return norm(name).replace(",", " ").split(" ").filter(Boolean).sort().join(" ");
}

// Heuristica ya validada por el club (portada del HTML de referencia de la sesion anterior):
// si el nombre tiene coma, separa por coma; si no, la ultima palabra es el nombre de pila y
// el resto el apellido (soporta apellidos compuestos como "De la Vega Joaquin").
export function splitNombre(nombreCompleto: string): { apellido: string; nombre: string } {
  const raw = nombreCompleto.trim();
  if (raw.includes(",")) {
    const [apellido, nombre] = raw.split(",").map((s) => s.trim());
    return { apellido: apellido ?? "", nombre: nombre ?? "" };
  }
  const partes = raw.split(/\s+/);
  if (partes.length <= 1) return { apellido: raw, nombre: "" };
  return { apellido: partes.slice(0, -1).join(" "), nombre: partes[partes.length - 1] };
}
