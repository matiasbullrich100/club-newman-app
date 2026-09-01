// Lee un .xlsx de formaciones (el que manda el club por WhatsApp) y saca la lista de cada equipo,
// para no tener que tipear a mano en /formaciones/cargar/[partidoId].
//
// El formato observado (planilla "ResumenEquipos" del club): una fila de encabezado con la letra
// del equipo ("A", "B", "C"...) y, debajo, una columna angosta con el número de camiseta (1, 2,
// 3...) y al lado el nombre. Varios equipos, uno al lado del otro. Del 1 al 15 son titulares y del
// 16 en adelante, suplentes. Más abajo suele haber bloques auxiliares (LESIONADOS / NO DISPONIBLES)
// que repiten la numeración: se ignoran quedándose sólo con la PRIMERA corrida de números por
// columna.
//
// No dependemos de que los equipos estén en columnas fijas: se detecta cualquier columna que tenga
// una corrida 1,2,3,... y se toma la columna de texto inmediatamente a la derecha como los nombres.

import { unzipSync, strFromU8 } from "fflate";

export interface EquipoExcel {
  /** "A", "B", ... o "Equipo 1" si no se pudo leer la etiqueta. */
  etiqueta: string;
  titulares: string[];
  suplentes: string[];
}

const MIN_CORRIDA = 10; // una columna cuenta como "equipo" si numera al menos 1..10 seguido
const TITULARES = 15;
const MAX_JUGADORES = 30;

function desescaparXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parsearSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    const partes = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => desescaparXml(m[1]));
    out.push(partes.join(""));
  }
  return out;
}

function colALetraNumero(col: string): number {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

type Celdas = Map<string, Map<number, string | number>>; // colLetra -> (fila -> valor)

function parsearHoja(xml: string, shared: string[]): Celdas {
  const celdas: Celdas = new Map();
  for (const m of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, filaStr, attrs, inner] = m;
    if (inner == null) continue;
    const tipo = attrs.match(/\bt="([^"]+)"/)?.[1];
    let valor: string | number | null = null;
    if (tipo === "inlineStr") {
      const t = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      if (t) valor = desescaparXml(t[1]);
    } else {
      const v = inner.match(/<v>([\s\S]*?)<\/v>/);
      if (!v) continue;
      const raw = v[1];
      if (tipo === "s") valor = shared[Number(raw)] ?? "";
      else if (tipo === "str" || tipo === "b") valor = desescaparXml(raw);
      else valor = raw.trim() === "" ? null : Number(raw);
    }
    if (valor == null || valor === "") continue;
    const fila = Number(filaStr);
    if (!celdas.has(col)) celdas.set(col, new Map());
    celdas.get(col)!.set(fila, valor);
  }
  return celdas;
}

function esEntero(v: string | number | undefined): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^\d{1,2}$/.test(v.trim())) return Number(v.trim());
  return null;
}

function nombreValido(v: string | number | undefined): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  if (!s || s === "0") return null;
  return s;
}

/** Primera corrida 1,2,3,... (filas y valores consecutivos) en una columna. */
function corridaDeDorsales(filas: Map<number, string | number>): { filaInicio: number; largo: number } | null {
  const ordenadas = [...filas.keys()].sort((a, b) => a - b);
  for (const inicio of ordenadas) {
    if (esEntero(filas.get(inicio)) !== 1) continue;
    let largo = 1;
    while (esEntero(filas.get(inicio + largo)) === largo + 1) largo++;
    if (largo >= MIN_CORRIDA) return { filaInicio: inicio, largo };
  }
  return null;
}

export function parsearExcelFormaciones(datos: ArrayBuffer | Uint8Array): EquipoExcel[] {
  const zip = unzipSync(datos instanceof Uint8Array ? datos : new Uint8Array(datos));
  const nombreHoja =
    Object.keys(zip)
      .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
      .sort()[0] ?? "xl/worksheets/sheet1.xml";
  const sheetXml = zip[nombreHoja] ? strFromU8(zip[nombreHoja]) : "";
  const shared = zip["xl/sharedStrings.xml"] ? parsearSharedStrings(strFromU8(zip["xl/sharedStrings.xml"])) : [];
  if (!sheetXml) throw new Error("El archivo no parece un Excel válido.");

  const celdas = parsearHoja(sheetXml, shared);
  const columnasOrdenadas = [...celdas.keys()].sort((a, b) => colALetraNumero(a) - colALetraNumero(b));

  const equipos: EquipoExcel[] = [];
  for (const col of columnasOrdenadas) {
    const corrida = corridaDeDorsales(celdas.get(col)!);
    if (!corrida) continue;
    const { filaInicio, largo } = corrida;

    // Columna de nombres = la primera a la derecha con texto en varias filas de la corrida.
    const colNum = colALetraNumero(col);
    let colNombres: string | null = null;
    for (const otra of columnasOrdenadas) {
      if (colALetraNumero(otra) <= colNum) continue;
      const filas = celdas.get(otra)!;
      let hits = 0;
      for (let i = 0; i < Math.min(largo, TITULARES); i++) if (nombreValido(filas.get(filaInicio + i))) hits++;
      if (hits >= 5) {
        colNombres = otra;
        break;
      }
    }
    if (!colNombres) continue;
    const nombres = celdas.get(colNombres)!;

    const etiquetaCruda = nombres.get(filaInicio - 1);
    const etiqueta =
      typeof etiquetaCruda === "string" && etiquetaCruda.trim().length <= 12 && !/,/.test(etiquetaCruda)
        ? etiquetaCruda.trim()
        : `Equipo ${equipos.length + 1}`;

    const titulares: string[] = [];
    const suplentes: string[] = [];
    for (let d = 1; d <= Math.min(largo, MAX_JUGADORES); d++) {
      const nombre = nombreValido(nombres.get(filaInicio + d - 1));
      if (d <= TITULARES) {
        if (nombre) titulares.push(nombre);
      } else {
        if (!nombre) break; // primer hueco después del 15 => se terminaron los suplentes
        suplentes.push(nombre);
      }
    }
    if (titulares.length === 0) continue; // equipo vacío (columna reservada sin cargar)
    equipos.push({ etiqueta, titulares, suplentes });
  }

  return equipos;
}
