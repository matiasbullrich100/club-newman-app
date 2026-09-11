import { NextRequest, NextResponse } from "next/server";
import { limpiarInstanciasVencidas } from "@/lib/match/practicaInstancias";
import { checkCronAuth } from "@/lib/cronAuth";

// Borra las instancias de practica de la cuenta "demo" que ya vencieron (ver
// lib/match/practicaInstancias.ts) -- pura limpieza de almacenamiento, no afecta la correctitud:
// una instancia vencida que nadie borro todavia se recrea fresca sola la proxima vez que alguien
// la visita. Disparado por el workflow de GitHub Actions
// (.github/workflows/limpiar-practicas-demo.yml), una vez por dia (alcanza de sobra).
export async function GET(request: NextRequest) {
  const noAutorizado = checkCronAuth(request);
  if (noAutorizado) return noAutorizado;

  const resultado = await limpiarInstanciasVencidas();
  return NextResponse.json(resultado);
}
