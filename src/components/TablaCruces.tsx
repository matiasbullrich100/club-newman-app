import { CREMA, DORADO, DORADO_SUAVE, NEGRO_JUGADA } from "@/lib/colors";
import type { FechaDivisionNumerada } from "@/lib/resultadosDivision/consultar";

const BORDE = "rgba(240,203,134,.4)";
const FONDO_PROPIO = "rgba(245,168,0,.12)";

// Tres colores semánticos (NO el acento): cómo salió el partido para el equipo de la FILA (local).
const VERDE = "rgba(31,122,58,.42)"; // ganó de local
const ROJO = "rgba(165,42,42,.42)"; // perdió de local
const GRIS = "rgba(122,106,58,.42)"; // empató

type Cruce = { gf: number; gc: number; bonus: boolean; nf: number };
type CeldaRunIn =
  | { tipo: "libre" }
  | { tipo: "pendiente"; opp: string; local: boolean }
  | { tipo: "jugado"; opp: string; local: boolean; gf: number; gc: number; bonus: boolean }
  | { tipo: "especial"; opp: string; local: boolean; motivo: "postergado" | "sin_info" };

// A partir del fixture completo de la división arma:
//  1. "lo que le queda a cada uno, en orden" (fila = equipo, columnas = fechas que faltan) -- o,
//     con `todasLasFechas` (Juveniles: pocas fechas, 1 sola rueda), TODAS las fechas jugadas y por
//     jugar en una sola tabla, sin el cuadro de cruces de abajo (que con tan pocos partidos por
//     equipo queda redundante con esta).
//  2. la grilla de cruces (fila = local, columna = visitante, celda = resultado para el local) --
//     solo si NO `todasLasFechas`.
export default function TablaCruces({ fechas, todasLasFechas = false }: { fechas: FechaDivisionNumerada[]; todasLasFechas?: boolean }) {
  const esPropio = (n: string) => n === "Newman";

  const set = new Set<string>();
  for (const f of fechas) for (const p of f.partidos) {
    if (p.local) set.add(p.local);
    if (p.visitante) set.add(p.visitante);
  }
  const equipos = [...set].sort((a, b) => {
    if (esPropio(a) !== esPropio(b)) return esPropio(a) ? -1 : 1; // Newman primero
    return a.localeCompare(b, "es");
  });

  const key = (l: string, v: string) => `${l} ${v}`;
  const jugados = new Map<string, Cruce>();
  const pendientes = new Map<string, number>();
  const runin = new Map<string, Map<number, CeldaRunIn>>();
  const setRun = (eq: string, nf: number, v: CeldaRunIn) => {
    if (!runin.has(eq)) runin.set(eq, new Map());
    runin.get(eq)!.set(nf, v);
  };
  const fechasPendientes = new Set<number>();
  const fechasTodas = new Set<number>();

  for (const f of fechas) {
    fechasTodas.add(f.numeroFecha);
    for (const p of f.partidos) {
      if (p.especial === "libre") {
        if (!p.jugado) {
          setRun(p.local, f.numeroFecha, { tipo: "libre" });
          fechasPendientes.add(f.numeroFecha);
        }
        continue;
      }
      if (!p.visitante) continue;
      if (p.jugado && p.golesLocal != null && p.golesVisitante != null) {
        jugados.set(key(p.local, p.visitante), {
          gf: p.golesLocal,
          gc: p.golesVisitante,
          bonus: !!p.bonusLocal,
          nf: f.numeroFecha,
        });
        setRun(p.local, f.numeroFecha, { tipo: "jugado", opp: p.visitante, local: true, gf: p.golesLocal, gc: p.golesVisitante, bonus: !!p.bonusLocal });
        setRun(p.visitante, f.numeroFecha, { tipo: "jugado", opp: p.local, local: false, gf: p.golesVisitante, gc: p.golesLocal, bonus: !!p.bonusVisitante });
      } else if (p.especial === "postergado" || p.especial === "sin_info") {
        // Partido sin resultado que URBA marco como postergado/sin info (ej. el club arreglo un
        // amistoso aparte para esa fecha, o el rival no presento equipo) -- no es un pendiente
        // normal, no tiene sentido mostrarlo como si todavia se fuera a jugar tal cual estaba.
        fechasPendientes.add(f.numeroFecha);
        setRun(p.local, f.numeroFecha, { tipo: "especial", opp: p.visitante, local: true, motivo: p.especial });
        setRun(p.visitante, f.numeroFecha, { tipo: "especial", opp: p.local, local: false, motivo: p.especial });
      } else {
        pendientes.set(key(p.local, p.visitante), f.numeroFecha);
        fechasPendientes.add(f.numeroFecha);
        setRun(p.local, f.numeroFecha, { tipo: "pendiente", opp: p.visitante, local: true });
        setRun(p.visitante, f.numeroFecha, { tipo: "pendiente", opp: p.local, local: false });
      }
    }
  }
  // En Plantel Superior (no todasLasFechas) se suma la ULTIMA fecha ya jugada antes de la primera
  // pendiente -- no solo "lo que falta", tambien de donde viene cada equipo, para ver la evolucion
  // de un vistazo (pedido explicito: "que la f22 sea con los resultados").
  const minPendiente = fechasPendientes.size > 0 ? Math.min(...fechasPendientes) : undefined;
  const fechaAnterior = minPendiente && minPendiente > 1 && fechasTodas.has(minPendiente - 1) ? minPendiente - 1 : undefined;
  const columnasSuperior = fechaAnterior !== undefined ? [fechaAnterior, ...fechasPendientes] : [...fechasPendientes];
  const fpOrden = (todasLasFechas ? [...fechasTodas] : columnasSuperior).sort((a, b) => a - b);

  const th: React.CSSProperties = {
    position: "sticky",
    left: 0,
    zIndex: 2,
    background: NEGRO_JUGADA,
    color: DORADO,
    fontSize: "0.68rem",
    fontWeight: 700,
    textAlign: "right",
    padding: "3px 8px",
    whiteSpace: "nowrap",
  };
  const celda: React.CSSProperties = {
    minWidth: 46,
    height: 30,
    fontSize: "0.66rem",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    border: "1px solid rgba(255,255,255,.12)",
    position: "relative",
  };

  const hayJugadas = todasLasFechas || fechaAnterior !== undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {fpOrden.length > 0 && (
        <div>
          <h3 style={subtitulo}>{todasLasFechas ? "Fixture de cada equipo" : "Lo que le queda a cada uno"}</h3>
          <p style={ayuda}>
            Cada fila es un equipo; las columnas son{" "}
            {todasLasFechas ? "todas las fechas, en orden" : fechaAnterior !== undefined ? "la última fecha jugada más las que faltan, en orden" : "las fechas que faltan, en orden"}.{" "}
            <b>L</b> = de local, <b>V</b> = de visitante.
            {hayJugadas ? (
              <>
                {" "}
                Las ya jugadas muestran el resultado (<b style={{ color: DORADO }}>·</b> = punto bonus){todasLasFechas ? "." : ", para ver la evolución."}
              </>
            ) : (
              " Se lee de izquierda a derecha = el fixture que le queda a ese equipo."
            )}
          </p>
          <div style={{ overflowX: "auto", border: `1px solid ${BORDE}`, borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th style={{ ...th, zIndex: 3 }}>Equipo</th>
                  {fpOrden.map((nf) => (
                    <th key={nf} style={{ fontSize: "0.62rem", fontWeight: 700, color: DORADO, background: NEGRO_JUGADA, padding: "4px 6px", border: "1px solid rgba(255,255,255,.12)" }}>
                      F{nf}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq) => (
                  <tr key={eq}>
                    <th style={{ ...th, color: esPropio(eq) ? DORADO : DORADO_SUAVE }}>{eq}</th>
                    {fpOrden.map((nf) => {
                      const g = runin.get(eq)?.get(nf);
                      const base: React.CSSProperties = {
                        minWidth: 84,
                        height: 40,
                        fontSize: "0.66rem",
                        textAlign: "center",
                        border: "1px solid rgba(255,255,255,.12)",
                        outline: esPropio(eq) ? `2px solid ${DORADO}` : undefined,
                        outlineOffset: -2,
                        position: "relative",
                      };
                      if (!g) return <td key={nf} style={{ ...base, color: "rgba(255,255,255,.35)" }}>—</td>;
                      if (g.tipo === "libre") return <td key={nf} style={{ ...base, color: DORADO_SUAVE, fontStyle: "italic" }}>Libre</td>;
                      if (g.tipo === "jugado") {
                        const fondo = g.gf > g.gc ? VERDE : g.gf < g.gc ? ROJO : GRIS;
                        return (
                          <td key={nf} style={{ ...base, background: fondo, padding: "3px 4px" }}>
                            <div style={{ fontSize: "0.6rem", opacity: 0.85 }}>{g.opp}</div>
                            <div>
                              {g.gf}-{g.gc}
                              {g.bonus && <b style={{ color: DORADO }}>·</b>} <span style={{ opacity: 0.7 }}>{g.local ? "(L)" : "(V)"}</span>
                            </div>
                          </td>
                        );
                      }
                      if (g.tipo === "especial") {
                        return (
                          <td key={nf} style={{ ...base, color: "rgba(255,255,255,.5)", fontStyle: "italic", padding: "3px 4px" }}>
                            <div style={{ fontSize: "0.6rem", opacity: 0.85 }}>{g.opp}</div>
                            <div>{g.motivo === "postergado" ? "Postergado" : "Sin info"}</div>
                          </td>
                        );
                      }
                      return (
                        <td key={nf} style={{ ...base, background: g.local ? FONDO_PROPIO : "rgba(255,255,255,.04)", fontStyle: g.local ? "normal" : "italic" }}>
                          {g.opp} {g.local ? "(L)" : "(V)"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!todasLasFechas && <div>
        <h3 style={subtitulo}>Cruces</h3>
        <p style={ayuda}>
          Fila = local, columna = visitante. Cada celda: cómo salió ESE partido para el equipo de la fila (a favor–en
          contra) y en qué fecha. <b style={{ color: DORADO }}>·</b> = punto bonus. Las que faltan muestran solo el nº de
          fecha.
        </p>
        <div style={{ overflowX: "auto", border: `1px solid ${BORDE}`, borderRadius: 8 }}>
          <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ ...th, zIndex: 3 }} />
                {equipos.map((e) => (
                  <th
                    key={e}
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: esPropio(e) ? DORADO : DORADO_SUAVE,
                      background: NEGRO_JUGADA,
                      padding: "6px 3px",
                      border: "1px solid rgba(255,255,255,.12)",
                    }}
                  >
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipos.map((fila) => (
                <tr key={fila}>
                  <th style={{ ...th, color: esPropio(fila) ? DORADO : DORADO_SUAVE }}>{fila}</th>
                  {equipos.map((col) => {
                    const propio = esPropio(fila) || esPropio(col);
                    if (fila === col)
                      return (
                        <td
                          key={col}
                          style={{
                            ...celda,
                            background:
                              "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,.06) 4px,rgba(255,255,255,.06) 8px)",
                          }}
                        />
                      );
                    const j = jugados.get(key(fila, col));
                    if (j) {
                      const fondo = j.gf > j.gc ? VERDE : j.gf < j.gc ? ROJO : GRIS;
                      return (
                        <td key={col} style={{ ...celda, background: fondo, outline: propio ? `2px solid ${DORADO}` : undefined, outlineOffset: -2 }}>
                          <span style={{ position: "absolute", top: 0, left: 2, fontSize: "0.5rem", color: "rgba(255,255,255,.5)" }}>
                            F{j.nf}
                          </span>
                          {j.gf}-{j.gc}
                          {j.bonus && <b style={{ color: DORADO }}>·</b>}
                        </td>
                      );
                    }
                    const nf = pendientes.get(key(fila, col));
                    return (
                      <td key={col} style={{ ...celda, color: "rgba(255,255,255,.45)", background: propio ? FONDO_PROPIO : undefined }}>
                        {nf ? `F${nf}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.7rem", color: CREMA, alignItems: "center" }}>
        <Swatch color={VERDE} txt="Ganó de local" />
        <Swatch color={ROJO} txt="Perdió de local" />
        <Swatch color={GRIS} txt="Empató" />
        <span><b style={{ color: DORADO }}>·</b> bonus</span>
        <span>(L) local · (V) visitante</span>
      </div>
    </div>
  );
}

const subtitulo: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: DORADO,
};
const ayuda: React.CSSProperties = { margin: "0 0 10px", fontSize: "0.72rem", opacity: 0.75, lineHeight: 1.4 };

function Swatch({ color, txt }: { color: string; txt: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 13, height: 13, borderRadius: 3, background: color, display: "inline-block" }} />
      {txt}
    </span>
  );
}
