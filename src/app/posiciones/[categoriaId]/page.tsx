import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth/session";
import { CATEGORIAS } from "@/lib/categorias";
import type { PosicionesTorneo } from "@/types/firestore";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
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

export default async function PosicionesPage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria) notFound();

  const backHref =
    categoria.grupo === "juveniles" ? `/juveniles/${categoria.edadId}/equipo/${categoriaId}` : `/categoria/${categoriaId}`;

  const [snap, session] = await Promise.all([adminDb.collection("posiciones").doc(categoriaId).get(), getSession()]);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href={backHref} />
      <SessionBar session={session} />
      <Header rightLabel="Posiciones" />

      <div style={{ fontWeight: 700, color: DORADO_SUAVE, letterSpacing: 1, marginTop: 8, textTransform: "uppercase" }}>{categoria.nombre}</div>
      <div
        style={{
          textAlign: "center",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          fontSize: "0.78rem",
          color: DORADO,
          margin: "12px 0 6px",
        }}
      >
        Tabla de posiciones
      </div>

      {!snap.exists ? (
        <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.85rem", textAlign: "center", marginTop: 16 }}>
          Todavía no hay tabla de posiciones cargada para esta categoría.
        </p>
      ) : (
        <Tabla data={snap.data() as PosicionesTorneo} />
      )}
    </main>
  );
}

function Tabla({ data }: { data: PosicionesTorneo }) {
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
