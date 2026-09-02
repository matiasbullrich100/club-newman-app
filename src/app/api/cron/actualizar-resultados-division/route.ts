import { NextRequest, NextResponse } from "next/server";
import { actualizarResultadosDivision } from "@/lib/resultadosDivision/actualizar";
import { checkCronAuth } from "@/lib/cronAuth";

// Baja los resultados del Fixt. Division desde URBA (ver src/lib/resultadosDivision/actualizar.ts).
// Disparado por su PROPIO workflow de GitHub Actions
// (.github/workflows/actualizar-resultados-division.yml), con horario DESPUES de cada jornada
// (sabado noche Superior, domingo noche Juveniles, lunes a la manana de repaso) -- a proposito
// separado del cron de la tabla de posiciones, que corre cada pocos minutos durante los partidos.
// Asi esta baja (varios fetches grandes a /championship/{id}) nunca comparte recursos serverless
// con la app en vivo mientras el Designado carga cambios/incidencias.
//
// El workflow manda "Authorization: Bearer $CRON_SECRET". En produccion CRON_SECRET es
// obligatorio (ver checkCronAuth); en local, sin la var, queda abierto para probar.

// Los fetches a URBA (/championship/{id}, varios cientos de KB c/u) pueden sumar varios segundos
// -- se le da margen para que no lo corte el timeout por defecto del serverless.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const noAutorizado = checkCronAuth(request);
  if (noAutorizado) return noAutorizado;

  const grupoParam = request.nextUrl.searchParams.get("grupo");
  const grupo = grupoParam === "superior" || grupoParam === "juveniles" ? grupoParam : undefined;

  const resultadosDivision = await actualizarResultadosDivision(grupo);
  return NextResponse.json({ resultadosDivision });
}
