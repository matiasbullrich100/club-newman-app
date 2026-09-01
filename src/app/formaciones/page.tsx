import { getSession } from "@/lib/auth/session";
import { formatFechaCorta } from "@/lib/fecha";
import { estadoFormaciones, type EstadoSubida } from "@/lib/match/estadoFormaciones";
import Header from "@/components/Header";
import BackLink from "@/components/BackLink";
import SessionBar from "@/components/SessionBar";
import FormacionAcciones from "@/components/FormacionAcciones";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const CHIP: Record<EstadoSubida, { label: string; bg: string; color: string }> = {
  "sin-subir": { label: "Sin subir", bg: "rgba(194,59,59,.18)", color: "#f3caca" },
  borrador: { label: "Borrador", bg: "rgba(245,168,0,.16)", color: DORADO },
  publicada: { label: "Publicada", bg: "rgba(47,107,79,.22)", color: "#8fd3b0" },
  libre: { label: "Fecha libre", bg: "rgba(255,255,255,.06)", color: DORADO_SUAVE },
  "sin-fecha": { label: "Sin fecha", bg: "rgba(255,255,255,.06)", color: DORADO_SUAVE },
};

export default async function EstadoFormacionesPage() {
  const session = await getSession();
  const autorizado = session?.rol === "manager";

  const grupos = autorizado ? await estadoFormaciones() : [];

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "54px 16px 40px" }}>
      <BackLink href="/" />
      <SessionBar session={session} />
      <Header rightLabel="Formaciones" />

      {!autorizado ? (
        <p style={{ textAlign: "center", color: DORADO_SUAVE, marginTop: 20 }}>
          Esta sección es solo para el Manager.
        </p>
      ) : (
        <>
          <p style={{ fontSize: "0.8rem", color: DORADO_SUAVE, opacity: 0.8, textAlign: "center", margin: "0 0 18px" }}>
            Formación de la fecha en curso, equipo por equipo. <b>Subir</b> abre una pantalla para
            escribir o pegar la formación (queda en borrador); <b>Publicar</b> la hace pública
            (habilitado solo si está en borrador).
          </p>

          {grupos.map((grupo) => {
            const cargables = grupo.filas.filter((f) => f.estado !== "sin-fecha" && f.estado !== "libre");
            const publicadas = cargables.filter((f) => f.estado === "publicada").length;
            const borradores = cargables.filter((f) => f.estado === "borrador").length;
            const sinSubir = cargables.filter((f) => f.estado === "sin-subir").length;
            return (
              <section key={grupo.titulo} style={{ marginBottom: 22 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    flexWrap: "wrap",
                    gap: 4,
                    borderBottom: `1px solid ${DORADO}`,
                    paddingBottom: 4,
                    marginBottom: 8,
                  }}
                >
                  <h2 style={{ fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: 1, color: DORADO, margin: 0 }}>
                    {grupo.titulo}
                    {grupo.numeroFecha ? <span style={{ color: DORADO_SUAVE, opacity: 0.85 }}> · Fecha {grupo.numeroFecha}</span> : null}
                  </h2>
                  <span style={{ fontSize: "0.7rem", color: DORADO_SUAVE, opacity: 0.85 }}>
                    {sinSubir > 0 ? `${sinSubir} sin subir · ` : ""}
                    {borradores > 0 ? `${borradores} borrador${borradores === 1 ? "" : "es"} · ` : ""}
                    {publicadas} publicada{publicadas === 1 ? "" : "s"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {grupo.filas.map((f) => {
                    const chip = CHIP[f.estado];
                    return (
                      <div
                        key={f.categoriaId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: "linear-gradient(160deg, rgba(0,0,0,.28), rgba(0,0,0,.14))",
                          border: "1px solid rgba(226,197,120,.2)",
                        }}
                      >
                        <span
                          style={{
                            flex: "0 0 auto",
                            width: 58,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                            color: DORADO_SUAVE,
                          }}
                        >
                          {f.categoriaNombre}
                        </span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: "0.72rem", color: DORADO_SUAVE, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.estado === "sin-fecha"
                            ? "sin fecha en el fixture"
                            : `${f.rival ?? ""}${f.fecha ? ` · ${formatFechaCorta(f.fecha)}` : ""}${
                                f.estadoPartido && f.estadoPartido !== "programado" ? " · jugado" : ""
                              }`}
                        </span>
                        <span
                          style={{
                            flex: "0 0 auto",
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                            padding: "3px 7px",
                            borderRadius: 20,
                            background: chip.bg,
                            color: chip.color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {chip.label}
                          {f.jugadores > 0 ? ` · ${f.jugadores}` : ""}
                        </span>
                        {f.partidoId && f.estado !== "libre" && f.estado !== "sin-fecha" && (
                          <FormacionAcciones partidoId={f.partidoId} estado={f.estado} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
