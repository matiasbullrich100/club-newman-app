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

// Firestore no garantiza el orden de lectura de una subcoleccion (ver Formaciones.tsx) -- sin
// esto, los botones de "elegir jugador" (incidencias/cambios) salen en orden aleatorio.
export function ordenarPorDorsal<T extends { dorsal: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => Number(a.dorsal) - Number(b.dorsal));
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

/**
 * Que apellidos se repiten en una lista de nombres -- ej. "Bullrich" puede ser Simón (Plantel
 * Superior), Marcos o José (Juveniles). Pensado para calcularse UNA vez server-side sobre todo el
 * club (Plantel + las 4 edades de Juveniles, no solo el plantel de un partido puntual -- dos
 * jugadores con el mismo apellido en divisiones distintas siguen siendo ambiguos para quien lee
 * el feed) y pasarse como prop liviana (array de apellidos, no la lista entera de jugadores) a
 * crearNombreCorto().
 */
export function apellidosAmbiguos(nombres: string[]): string[] {
  const conteo = new Map<string, number>();
  for (const n of nombres) {
    const { apellido } = splitNombre(n);
    conteo.set(apellido, (conteo.get(apellido) ?? 0) + 1);
  }
  return [...conteo.entries()].filter(([, c]) => c > 1).map(([apellido]) => apellido);
}

// Prefijos/particulas que NO se abrevian aunque sean la primera palabra de un apellido compuesto
// ("Mc Grech" no es "M. Grech", "de la Cruz" no es "d. la Cruz").
const PARTICULAS_APELLIDO = new Set(["mc", "mac", "de", "del", "la", "las", "los", "van", "von", "di", "da", "san", "santa", "o", "y"]);

/**
 * Nombre corto para el feed de incidencias. Apellido no repetido en el club -> solo el apellido.
 * Apellido repetido (ver apellidosAmbiguos) -> se agrega la inicial del nombre, y si el apellido
 * es compuesto se abrevia la primera palabra: "Bullrich S." / "G. Taboada G.". Las formaciones
 * NO usan esto -- ahi va el nombre completo.
 */
export function crearNombreCorto(ambiguos: string[]): (nombreCompleto: string) => string {
  const set = new Set(ambiguos);
  return (nombreCompleto: string) => {
    const { apellido, nombre } = splitNombre(nombreCompleto);
    if (!set.has(apellido)) return apellido;

    const palabras = apellido.split(/\s+/).filter(Boolean);
    let apellidoCorto = apellido;
    if (palabras.length > 1) {
      const primera = palabras[0];
      const abreviable =
        primera.length >= 3 &&
        !PARTICULAS_APELLIDO.has(primera.toLowerCase()) &&
        primera[0] === primera[0].toUpperCase();
      if (abreviable) apellidoCorto = `${primera[0].toUpperCase()}. ${palabras.slice(1).join(" ")}`;
    }

    const inicialNombre = nombre.trim().charAt(0).toUpperCase();
    return inicialNombre ? `${apellidoCorto} ${inicialNombre}.` : apellidoCorto;
  };
}
