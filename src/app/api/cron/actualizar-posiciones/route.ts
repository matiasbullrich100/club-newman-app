import { NextRequest, NextResponse } from "next/server";
import { actualizarPosiciones } from "@/lib/posiciones/actualizar";
import { checkCronAuth } from "@/lib/cronAuth";

// Disparado por el workflow de GitHub Actions (.github/workflows/actualizar-posiciones.yml),
// que maneja el cronograma real (sabados por hora para Plantel Superior, domingos por minuto
// para Juveniles -- Vercel Cron en el plan gratis no permite mas de 1 corrida por dia). Ese
// workflow manda "Authorization: Bearer $CRON_SECRET". En produccion CRON_SECRET es obligatorio
// (ver checkCronAuth); en local, sin la var, queda abierto para probar.
export async function GET(request: NextRequest) {
  const noAutorizado = checkCronAuth(request);
  if (noAutorizado) return noAutorizado;

  const grupoParam = request.nextUrl.searchParams.get("grupo");
  const grupo = grupoParam === "superior" || grupoParam === "juveniles" ? grupoParam : undefined;

  const resultados = await actualizarPosiciones(grupo);
  return NextResponse.json({ resultados });
}
