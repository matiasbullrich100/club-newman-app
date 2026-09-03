import type { PosicionesTorneo } from "@/types/firestore";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Columnas numéricas: alineadas a la derecha (como cualquier tabla de estadísticas). Además evita
// que un Dif de 4 caracteres ("-186") toque el valor de la columna de al lado.
const thStyle: React.CSSProperties = {
  textAlign: "right",
  textTransform: "uppercase",
  letterSpacing: 0.3,
  fontSize: "0.63rem",
  color: DORADO,
  padding: "4px 3px",
  borderBottom: "1px solid rgba(226,197,120,.3)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 3px",
  fontSize: "0.76rem",
  textAlign: "right",
  borderBottom: "1px solid rgba(255,255,255,.06)",
  whiteSpace: "nowrap",
};

const izq: React.CSSProperties = { textAlign: "left" };

// Los primeros 4 de cada zona clasifican a playoff -> fondo verde suave en esas filas (solo si la
// zona tiene mas de 4 equipos, si no no hay "corte"). Es independiente de la marca de Newman
// (fondo dorado mas marcado + nombre mas claro + negrita): la fila de Newman si esta entre los 4
// muestra las dos.
const bgPlayoff = "rgba(70,196,106,.13)";
const bgPropio = "rgba(226,197,120,.26)";

// Nombres largos ("Atletico del Rosario B", "Buenos Aires C&RC B") empujaban la tabla entera mas
// alla del ancho de la pantalla -- esta columna especificamente puede envolver en 2 lineas en vez
// de forzar scroll horizontal en todo el resto de columnas (numericas, angostas).
const tdEquipoStyle: React.CSSProperties = {
  ...tdStyle,
  whiteSpace: "normal",
};

// `table-layout: fixed` + anchos por columna: sin esto cada tabla calcula el ancho segun su
// contenido, asi que M15 A / B / C / D quedan con las columnas en posiciones distintas y la tabla
// "salta" al pasar de una a otra con la barra de equipos (se nota en la compu). Con esto todas
// las tablas quedan identicas. Las columnas de 1 digito (PJ/G/E/P/BO/BD) van angostas y fijas;
// las que pueden tener 3-4 caracteres (PF/PC/Dif/Pts) se reparten lo que sobra.
const colEquipoWidth = 80;

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
        <table style={{ width: "100%", minWidth: 330, borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 20 }} />
            <col style={{ width: colEquipoWidth }} />
            {/* PJ · G · E · P (1 dígito) */}
            {Array.from({ length: 4 }, (_, i) => (
              <col key={`u${i}`} style={{ width: 22 }} />
            ))}
            {/* PF · PC · Dif (hasta 3-4 caracteres): sin ancho -> se reparten lo que sobra */}
            <col />
            <col />
            <col />
            {/* BO · BD (1 dígito) */}
            <col style={{ width: 22 }} />
            <col style={{ width: 22 }} />
            {/* Pts */}
            <col />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...thStyle, ...izq }}>#</th>
              <th style={{ ...thStyle, ...izq }}>Equipo</th>
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
            {data.filas.map((f, idx) => {
              // No alcanza con "empieza con Newman" -- algunas zonas juntan a mas de un equipo del
              // club (ver Pre F/G/H en torneos-urba.ts), asi que hay que resaltar el equipo exacto.
              const esNewman = f.equipo === data.nuestroEquipo;
              const clasifica = data.filas.length > 4 && idx < 4;
              return (
                <tr
                  key={f.posicion}
                  style={{ background: esNewman ? bgPropio : clasifica ? bgPlayoff : undefined }}
                >
                  <td style={{ ...tdStyle, ...izq }}>{f.posicion}</td>
                  <td style={{ ...tdEquipoStyle, ...izq, color: esNewman ? DORADO : DORADO_SUAVE, fontWeight: esNewman ? 700 : 400 }}>{f.equipo}</td>
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
      {data.filas.length > 4 && (
        <p style={{ fontSize: "0.7rem", opacity: 0.75, margin: "8px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 14,
              height: 12,
              background: bgPlayoff,
              border: "1px solid rgba(70,196,106,.5)",
              flexShrink: 0,
            }}
          />
          Los primeros 4 clasifican a playoff
        </p>
      )}
    </>
  );
}
