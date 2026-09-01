// Parseo del texto que el Manager pega o escribe en /formaciones/cargar/[partidoId].
//
// Formato "canónico" (el mismo que arman los scripts migrate-*-formaciones, e igual para Plantel
// Superior y Juveniles): un jugador por línea, los primeros 15 son titulares (camiseta 1..15) y
// del 16 en adelante, suplentes.
//
// Pero se acepta lo que llega por WhatsApp con menos prolijidad, para poder tanto ESCRIBIR
// mirando una foto como PEGAR desde el Excel o desde una imagen ya formateada:
//   - número de camiseta adelante ("1. Pérez", "16 Gómez", "10) Díaz", "8 - López")  -> se ignora
//   - una línea separadora ("SUPLENTES:", "Banco", "Reservas")  -> lo que sigue son suplentes
//     aunque haya menos de 15 titulares
//   - suplentes en una sola línea separados por ";"  ("16. Pérez, Juan; 17. Gómez, Luis")
//   - líneas vacías  -> se saltan
//   - comillas que a veces deja el copiar/pegar de una celda de Excel  -> se sacan

const SEPARADOR_RE = /^\s*(?:suplentes?|banco|reservas?)\b\s*:?\s*(.*)$/i;
const DORSAL_PREFIJO_RE = /^\s*\d{1,3}\s*(?:[.)\-–—:]\s*|\s+)/;
const SOLO_DORSAL_RE = /^\s*\d{1,3}\s*[.)\-–—:]?\s*$/;

const TITULARES_ESPERADOS = 15;

export interface FormacionParseada {
  /** Nombres en orden -> camiseta 1..N. */
  titulares: string[];
  /** Nombres en orden -> camiseta 16..N. */
  suplentes: string[];
  /** Cosas raras que no bloquean guardar, pero conviene revisar antes. */
  avisos: string[];
}

function limpiarNombre(segmento: string): string {
  let s = segmento.trim().replace(/\s+/g, " ");
  if (!s || SOLO_DORSAL_RE.test(s)) return "";
  s = s.replace(DORSAL_PREFIJO_RE, "").trim();
  s = s.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return s;
}

export function parsearFormacion(texto: string): FormacionParseada {
  const titulares: string[] = [];
  const suplentes: string[] = [];
  let modo: "titulares" | "suplentes" = "titulares";
  let vioSeparador = false;

  const agregar = (nombre: string) => {
    if (!nombre) return;
    (modo === "titulares" ? titulares : suplentes).push(nombre);
  };

  for (const linea of (texto ?? "").split(/\r?\n/)) {
    const sep = linea.match(SEPARADOR_RE);
    let contenido = linea;
    if (sep) {
      modo = "suplentes";
      vioSeparador = true;
      contenido = sep[1] ?? ""; // "SUPLENTES: 16. X; 17. Y" -> procesa lo que sigue en la misma línea
      if (!contenido.trim()) continue;
    }
    for (const segmento of contenido.split(";")) agregar(limpiarNombre(segmento));
  }

  // Sin línea "SUPLENTES": los primeros 15 son titulares y el resto pasa al banco.
  if (!vioSeparador && titulares.length > TITULARES_ESPERADOS) {
    suplentes.unshift(...titulares.splice(TITULARES_ESPERADOS));
  }

  const avisos: string[] = [];
  if (titulares.length === 0) {
    avisos.push("No se reconoció ningún titular.");
  } else if (titulares.length !== TITULARES_ESPERADOS) {
    avisos.push(`Hay ${titulares.length} titulares (normalmente son ${TITULARES_ESPERADOS}).`);
  }
  if (suplentes.length > 15) {
    avisos.push(`Hay ${suplentes.length} suplentes — ¿se coló algún titular?`);
  }
  return { titulares, suplentes, avisos };
}
