// "T00:00:00" fuerza que el Date se parsee en hora LOCAL, no UTC medianoche -- sin esto,
// en Argentina (UTC-3) una fecha ISO "2026-03-14" se corre un dia para atras.
export function formatFecha(iso: string, weekday: "short" | "long" = "short"): string {
  const d = new Date(`${iso}T00:00:00`);
  const diaSemana = d.toLocaleDateString("es-AR", { weekday });
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${diaSemana} ${dia}-${mes}`;
}

// "28/03", sin dia de la semana -- para la ficha de un partido puntual (ej. "Fecha #3 · 28/03"),
// donde ya se sabe de que fecha del fixture se trata y el dia de la semana no aporta nada.
export function formatFechaCorta(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

export function capitalizarPrimera(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Compara por dia calendario en Argentina, sin importar en que huso horario corre el server
// (Vercel corre en UTC) -- "en_CA" da "YYYY-MM-DD" listo para comparar como string.
export function esHoyEnArgentina(fecha: Date): boolean {
  const diaDe = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  return diaDe(fecha) === diaDe(new Date());
}

// "YYYY-MM-DD" de hoy en Argentina, comparable como string contra el campo `fecha` de un partido.
export function hoyIsoEnArgentina(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

// Una fecha del fixture se pinta "en negro" (ya pasó) recién cuando el partido de esa jornada ya
// se jugó a esta altura: Plantel Superior juega el sábado, así que desde las 18:00 de ese sábado;
// Juveniles juega el domingo, desde las 16:00. Antes de esa hora el mismo día la fecha sigue "por
// jugar" (dorada). Días anteriores: siempre pasada. Días posteriores: siempre por jugar.
export function fechaFixtureYaPaso(fechaIso: string | undefined, grupo: "superior" | "juveniles"): boolean {
  if (!fechaIso) return false;
  const hoy = hoyIsoEnArgentina();
  if (fechaIso < hoy) return true;
  if (fechaIso > hoy) return false;
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const horas = (Number(partes.hour) % 24) + Number(partes.minute) / 60;
  return horas >= (grupo === "juveniles" ? 16 : 18);
}

// "YYYY-MM-DD" de mañana en Argentina -- para el resumen de "Partidos de Mañana" en /superior.
export function mananaIsoEnArgentina(): string {
  const hoy = new Date(`${hoyIsoEnArgentina()}T00:00:00Z`);
  hoy.setUTCDate(hoy.getUTCDate() + 1);
  return hoy.toISOString().slice(0, 10);
}

// Dias de calendario (no horas) entre una fecha ISO "YYYY-MM-DD" y hoy en Argentina -- para saber
// si el ultimo resultado terminado todavia es "de esta semana" o ya quedo viejo (ver
// debeMostrarProximaFechaEnArgentina, mas abajo, y su uso en /superior y /juveniles).
export function diasDesdeEnArgentina(fechaIso: string): number {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const msPorDia = 24 * 60 * 60 * 1000;
  const diff = (new Date(`${hoy}T00:00:00Z`).getTime() - new Date(`${fechaIso}T00:00:00Z`).getTime()) / msPorDia;
  return Math.round(diff);
}

// Plantel Superior juega el sabado, Juveniles el domingo -- desde el jueves a las 06:00 (pedido
// explicito, es cuando el club arranca a armar la previa del fin de semana) hasta el domingo, el
// resumen de /superior y /juveniles deja de mostrar el resultado de la fecha pasada (ya viejo a esa
// altura) y muestra la Proxima Fecha en su lugar, hasta que haya un partido en vivo o recien
// terminado que lo reemplace (ver el chequeo de "terminados" en cada pagina, no solo esta funcion).
export function debeMostrarProximaFechaEnArgentina(): boolean {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  const dia = partes.weekday;
  if (dia === "Fri" || dia === "Sat" || dia === "Sun") return true;
  if (dia === "Thu") {
    const horas = Number(partes.hour) % 24 + Number(partes.minute) / 60;
    return horas >= 6;
  }
  return false;
}

// Para un ISO "YYYY-MM-DD" (la fecha calendario del partido, no de la ultima edicion) -- una
// correccion cargada dias despues no debe hacer que el partido "reaparezca" como si fuera hoy.
export function fechaIsoEsHoyEnArgentina(fechaIso: string): boolean {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  return fechaIso === hoy;
}
