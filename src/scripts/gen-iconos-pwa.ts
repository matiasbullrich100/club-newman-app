// Genera los iconos de la PWA (los que usa el celular al "Agregar a inicio") a partir del escudo
// del club. Centra el escudo sobre un fondo solido del color oscuro del club, con margen, para
// que quede como un icono de app y no un recorte pegado al borde.
//
// Correr con: npm run gen-iconos-pwa
// Salida (en /public): icon-192.png, icon-512.png, apple-touch-icon.png (180x180).
// Idempotente: pisa los archivos existentes.

import sharp from "sharp";
import { resolve } from "path";

const ESCUDO = resolve(__dirname, "../../public/escudo-newman.png");
const FONDO = "#451526"; // BORDO_OSC (src/lib/colors.ts)
const SALIDAS: { archivo: string; tamano: number }[] = [
  { archivo: "icon-192.png", tamano: 192 },
  { archivo: "icon-512.png", tamano: 512 },
  { archivo: "apple-touch-icon.png", tamano: 180 },
];

function hexARgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

async function generar(archivo: string, tamano: number): Promise<void> {
  const { r, g, b } = hexARgb(FONDO);
  const interior = Math.round(tamano * 0.72);
  const escudo = await sharp(ESCUDO)
    .resize(interior, interior, { fit: "inside", withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(escudo).metadata();
  const left = Math.round((tamano - (meta.width ?? interior)) / 2);
  const top = Math.round((tamano - (meta.height ?? interior)) / 2);
  await sharp({ create: { width: tamano, height: tamano, channels: 4, background: { r, g, b, alpha: 1 } } })
    .composite([{ input: escudo, left, top }])
    .png()
    .toFile(resolve(__dirname, "../../public", archivo));
  console.log(`  public/${archivo}  (${tamano}x${tamano})`);
}

async function main() {
  console.log("Generando iconos PWA desde public/escudo-newman.png ...");
  for (const { archivo, tamano } of SALIDAS) await generar(archivo, tamano);
  console.log("Listo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
