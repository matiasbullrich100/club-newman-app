import { NextRequest, NextResponse } from "next/server";
import { actualizarPosiciones } from "@/lib/posiciones/actualizar";
import { actualizarResultadosDivision } from "@/lib/resultadosDivision/actualizar";

// Disparado por el workflow de GitHub Actions (.github/workflows/actualizar-posiciones.yml),
// que maneja el cronograma real (sabados por hora para Plantel Superior, domingos por minuto
// para Juveniles -- Vercel Cron en el plan gratis no permite mas de 1 corrida por dia). Ese
// workflow manda "Authorization: Bearer $CRON_SECRET" -- sin esa env var configurada, el
// endpoint queda abierto (util en local).

// Los fetches a URBA (sobre todo /championship/{id}, ~400KB c/u) pueden sumar varios segundos --
// se le da margen para que no lo corte el timeout por defecto del serverless.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const grupoParam = request.nextUrl.searchParams.get("grupo");
  const grupo = grupoParam === "superior" || grupoParam === "juveniles" ? grupoParam : undefined;

  // Tabla de posiciones + resultados del Fixt. Division (misma fuente URBA, misma cadencia).
  // allSettled: si los resultados de division fallan/tardan, la tabla de posiciones se actualiza
  // igual (y al reves) -- son independientes.
  const [posiciones, division] = await Promise.allSettled([
    actualizarPosiciones(grupo),
    actualizarResultadosDivision(grupo),
  ]);
  return NextResponse.json({
    resultados: posiciones.status === "fulfilled" ? posiciones.value : { error: String(posiciones.reason) },
    resultadosDivision: division.status === "fulfilled" ? division.value : { error: String(division.reason) },
  });
}
