import { NextRequest, NextResponse } from "next/server";
import { actualizarPosiciones } from "@/lib/posiciones/actualizar";

// Disparado 1 vez por semana por Vercel Cron (ver vercel.json). Vercel manda automaticamente
// "Authorization: Bearer $CRON_SECRET" en cada invocacion programada si esa env var esta seteada
// en el proyecto -- sin CRON_SECRET configurado, el endpoint queda abierto (util en local).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultados = await actualizarPosiciones();
  return NextResponse.json({ resultados });
}
