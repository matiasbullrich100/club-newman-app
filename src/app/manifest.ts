import type { MetadataRoute } from "next";

// Manifest de la PWA -- lo lee el celular al "Agregar a inicio" (nombre, icono, y que abra en
// pantalla completa sin la barra del navegador). Next lo sirve en /manifest.webmanifest y agrega
// el <link rel="manifest"> solo. Iconos: se generan con `npm run gen-iconos-pwa`.

const BORDO_OSC = "#451526"; // src/lib/colors.ts

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EnJuego · Club Newman",
    short_name: "EnJuego",
    description: "Resultados en vivo de los partidos del Club Newman",
    start_url: "/",
    display: "standalone",
    background_color: BORDO_OSC,
    theme_color: BORDO_OSC,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
