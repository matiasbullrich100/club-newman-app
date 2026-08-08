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
