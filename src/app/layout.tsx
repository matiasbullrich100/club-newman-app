import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import FontSizeControl from "@/components/FontSizeControl";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "EnJuego",
  description: "Resultados en vivo de los partidos del Club Newman",
  // iOS subraya telefonos/direcciones/emails que "detecta" en el texto (ej. nombres de
  // jugadores que matchean un patron) y los vuelve tocables -- esto lo desactiva.
  formatDetection: { telephone: false, address: false, email: false },
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
        <FontSizeControl />
        <Analytics />
      </body>
    </html>
  );
}
