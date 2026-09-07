import type { CSSProperties } from "react";

// Aclaraciones al pie, chiquitas y alineadas a la derecha:
//  - <FuenteUrba/>: en Tabla de Posiciones, Fixt. División y el fixture propio del club, para
//    dejar claro que esos datos salen de la web de la URBA.
//  - <Seuo/>: en la pantalla de un partido ("salvo error u omisión").
const estilo: CSSProperties = {
  textAlign: "right",
  fontSize: "0.66rem",
  opacity: 0.5,
  letterSpacing: 0.3,
  marginTop: 14,
};

export function FuenteUrba() {
  return <div style={estilo}>Fuente: urba.org.ar</div>;
}

export function Seuo() {
  return <div style={estilo}>SEUO</div>;
}
