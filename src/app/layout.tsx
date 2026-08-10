import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Club Newman — En vivo",
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
        {children}
      </body>
    </html>
  );
}
