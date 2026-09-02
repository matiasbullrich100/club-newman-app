import { NextResponse, type NextRequest } from "next/server";

/**
 * Chequeo de autorización para los endpoints de cron (`/api/cron/*`).
 *
 * Devuelve una `NextResponse` de error si la request NO está autorizada, o `null` si puede seguir.
 *
 * - En producción exige `CRON_SECRET` sí o sí: si la env var no está configurada, responde 503 y
 *   NO deja pasar. Antes, sin la var, el endpoint quedaba completamente abierto (cualquiera podía
 *   disparar los fetches a URBA + escrituras a Firestore). Esto importa sobre todo al crear el
 *   Vercel de un club nuevo: si te olvidás de setear `CRON_SECRET`, falla cerrado en vez de
 *   quedar expuesto.
 * - En local (sin `NODE_ENV=production`), si no hay secret, deja pasar -- cómodo para probar.
 */
export function checkCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en este entorno" }, { status: 503 });
  }

  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return null;
}
