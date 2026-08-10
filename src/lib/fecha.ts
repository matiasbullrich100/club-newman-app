// "T00:00:00" fuerza que el Date se parsee en hora LOCAL, no UTC medianoche -- sin esto,
// en Argentina (UTC-3) una fecha ISO "2026-03-14" se corre un dia para atras.
export function formatFecha(iso: string, weekday: "short" | "long" = "short"): string {
  const d = new Date(`${iso}T00:00:00`);
  const diaSemana = d.toLocaleDateString("es-AR", { weekday });
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${diaSemana} ${dia}-${mes}`;
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

// Para un ISO "YYYY-MM-DD" (la fecha calendario del partido, no de la ultima edicion) -- una
// correccion cargada dias despues no debe hacer que el partido "reaparezca" como si fuera hoy.
export function fechaIsoEsHoyEnArgentina(fechaIso: string): boolean {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  return fechaIso === hoy;
}
