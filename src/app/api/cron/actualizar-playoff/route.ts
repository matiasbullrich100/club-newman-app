import { NextRequest, NextResponse } from "next/server";
import { actualizarPlayoffFinalistas } from "@/lib/playoffFinalistas";
import { checkCronAuth } from "@/lib/cronAuth";

// Baja de URBA las semifinales / final del playoff de Inter, Pre A a F y M-22 y completa la instancia
// "Finalistas" de /playoff (ver src/lib/playoffFinalistas.ts). Lo dispara
// .github/workflows/actualizar-playoff.yml cada 15 minutos el dia de las semifinales.
// Misma autenticacion que el resto de los cron: "Authorization: Bearer $CRON_SECRET".
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const noAutorizado = checkCronAuth(request);
  if (noAutorizado) return noAutorizado;

  const playoff = await actualizarPlayoffFinalistas();
  return NextResponse.json({ playoff });
}
