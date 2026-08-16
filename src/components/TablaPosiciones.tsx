import type { PosicionesTorneo } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const thStyle: React.CSSProperties = {
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontSize: "0.65rem",
  color: DORADO,
  padding: "4px 3px",
  borderBottom: "1px solid rgba(226,197,120,.3)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 3px",
  fontSize: "0.78rem",
  borderBottom: "1px solid rgba(255,255,255,.06)",
  whiteSpace: "nowrap",
};

// Nombres largos ("Atletico del Rosario B", "Buenos Aires C&RC B") empujaban la tabla entera mas
// alla del ancho de la pantalla -- esta columna especificamente puede envolver en 2 lineas en vez
// de forzar scroll horizontal en todo el resto de columnas (numericas, angostas).
const tdEquipoStyle: React.CSSProperties = {
  ...tdStyle,
  whiteSpace: "normal",
  maxWidth: 78,
};

export default function TablaPosiciones({ data }: { data: PosicionesTorneo }) {
  const actualizado = (data.updatedAt as unknown as FirebaseFirestore.Timestamp)?.toDate?.() ?? (data.updatedAt as Date);

  return (
    <>
      <p style={{ fontSize: "0.78rem", opacity: 0.7, textAlign: "center", margin: "0 0 10px" }}>
        {data.championshipName}
        {actualizado && (
          <>
            {" · actualizado "}
            {actualizado.toLocaleDateString("es-AR", {
              timeZone: "America/Argentina/Buenos_Aires",
              day: "2-digit",
              month: "2-digit",
            })}
          </>
        )}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Equipo</th>
              <th style={thStyle}>PJ</th>
              <th style={thStyle}>G</th>
              <th style={thStyle}>E</th>
              <th style={thStyle}>P</th>
              <th style={thStyle}>PF</th>
              <th style={thStyle}>PC</th>
              <th style={thStyle}>Dif</th>
              <th style={thStyle}>BO</th>
              <th style={thStyle}>BD</th>
              <th style={thStyle}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {data.filas.map((f) => {
              // No alcanza con "empieza con Newman" -- algunas zonas juntan a mas de un equipo del
              // club (ver Pre F/G/H en torneos-urba.ts), asi que hay que resaltar el equipo exacto.
              const esNewman = f.equipo === data.nuestroEquipo;
              return (
                <tr key={f.posicion} style={esNewman ? { background: "rgba(226,197,120,.12)" } : undefined}>
                  <td style={tdStyle}>{f.posicion}</td>
                  <td style={{ ...tdEquipoStyle, color: DORADO_SUAVE, fontWeight: esNewman ? 700 : 400 }}>{f.equipo}</td>
                  <td style={tdStyle}>{f.jugados}</td>
                  <td style={tdStyle}>{f.ganados}</td>
                  <td style={tdStyle}>{f.empatados}</td>
                  <td style={tdStyle}>{f.perdidos}</td>
                  <td style={tdStyle}>{f.puntosFavor}</td>
                  <td style={tdStyle}>{f.puntosContra}</td>
                  <td style={tdStyle}>{f.diferencia}</td>
                  <td style={tdStyle}>{f.bonusOfensivo}</td>
                  <td style={tdStyle}>{f.bonusDefensivo}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: DORADO }}>{f.puntos}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
