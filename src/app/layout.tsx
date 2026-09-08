import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import FontSizeControl from "@/components/FontSizeControl";
import PastillaPortal from "@/components/PastillaPortal";
import { Seuo } from "@/components/PieNota";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "EnJuego",
  description: "Resultados en vivo de los partidos del Club Newman",
  applicationName: "EnJuego",
  // Al agregar a inicio en iPhone: abre en pantalla completa y usa este nombre bajo el icono.
  appleWebApp: { capable: true, title: "EnJuego", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  // iOS subraya telefonos/direcciones/emails que "detecta" en el texto (ej. nombres de
  // jugadores que matchean un patron) y los vuelve tocables -- esto lo desactiva.
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#451526", // BORDO_OSC -- barra del navegador / status bar en modo standalone
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={lato.variable}>
      <body
        style={{
          margin: 0,
          background: "#451526",
          color: "#f7f1e4",
          fontFamily: "var(--font-lato), Arial, sans-serif",
          paddingBottom: 60,
        }}
      >
        {/* Aplica el tamano de letra guardado ANTES de que React hidrate -- si no, se ve un
            flash al tamano por defecto y despues un salto al tamano elegido. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("tamanoFuente");if(t)document.documentElement.style.fontSize=t+"%";}catch(e){}',
          }}
        />
        {children}
        {/* Disclaimer global "salvo error u omision" -- alineado con la columna de contenido. */}
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 8px" }}>
          <Seuo />
        </div>
        <PastillaPortal />
        <FontSizeControl />
        <Analytics />
      </body>
    </html>
  );
}
