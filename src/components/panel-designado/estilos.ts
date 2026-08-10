// Botones grandes a proposito -- el publico que carga jugadas en vivo (Designados, muchos
// mayores de 50) usa el celular con el pulgar y con poca luz de cancha; los botones sin
// estilo del navegador eran chiquitos y dificiles de tocar.
import { BORDO_OSC, CREMA, DORADO, DORADO_SUAVE } from "@/lib/colors";

export const botonOpcion: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  fontSize: "0.98rem",
  fontWeight: 600,
  color: CREMA,
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(226,197,120,.35)",
  borderRadius: 10,
  padding: "14px 14px",
  minHeight: 50,
};

export const botonPrimario: React.CSSProperties = {
  display: "inline-block",
  fontSize: "1rem",
  fontWeight: 700,
  color: BORDO_OSC,
  background: DORADO,
  border: "none",
  borderRadius: 10,
  padding: "14px 22px",
  minHeight: 50,
};

export const botonSecundario: React.CSSProperties = {
  display: "inline-block",
  fontSize: "0.95rem",
  fontWeight: 600,
  color: DORADO_SUAVE,
  background: "transparent",
  border: "1px solid rgba(226,197,120,.35)",
  borderRadius: 10,
  padding: "13px 20px",
  minHeight: 50,
};

export const grillaOpciones: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

export const listaOpciones: React.CSSProperties = {
  display: "grid",
  gap: 8,
};
