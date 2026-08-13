// Tipos y formato puros para el historial de tarjetas -- separados de tarjetasHistorial.ts a
// proposito, porque ese archivo importa firebase-admin (solo servidor). Si un Client Component
// (como TablaTarjetas.tsx) importara algo de tarjetasHistorial.ts, webpack empaquetaria el SDK de
// Admin entero -- y sus dependencias Node-only (tls, net, etc.) -- en el bundle del browser.

export interface FechaTarjeta {
  numeroFecha: number | string;
  rival: string;
}

export function etiquetaFecha(f: FechaTarjeta): string {
  return `Fecha ${f.numeroFecha} vs ${f.rival}`;
}
