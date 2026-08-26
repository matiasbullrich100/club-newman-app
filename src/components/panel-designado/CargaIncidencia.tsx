"use client";

import { useState, useTransition } from "react";
import { adelantarReloj, publicarIncidente, type PublicarIncidenteInput } from "@/lib/match/actions";
import type { Equipo, Periodo, TipoIncidente } from "@/types/firestore";
import { requierePlayerSelection } from "@/lib/incidentes";
import type { RosterJugador } from "./types";
import { botonOpcion, botonPrimario, botonSecundario, grillaOpciones, listaOpciones } from "./estilos";
import BarraAccionFija from "./BarraAccionFija";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

const TIPOS: { tipo: Exclude<TipoIncidente, "cambio" | "fin_1t" | "fin_2t" | "fin_partido">; label: string }[] = [
  { tipo: "try", label: "Try (+5)" },
  { tipo: "try_scrum", label: "Try Scrum (+5)" },
  { tipo: "conversion", label: "Conversión (+2)" },
  { tipo: "penal", label: "Penal (+3)" },
  { tipo: "drop", label: "Drop (+3)" },
  { tipo: "try_penal", label: "Try Penal (+7)" },
  // "Doble amarilla" no se elige a mano -- si el jugador ya tiene una amarilla en este partido,
  // publicarIncidente detecta la segunda sola y la guarda como tarjeta_doble_amarilla (es roja por
  // reglamento, ver docs/live-match-engine.md).
  { tipo: "tarjeta_amarilla", label: "Tarjeta amarilla" },
  { tipo: "tarjeta_roja", label: "Roja Definitiva" },
  { tipo: "tarjeta_roja_20", label: "Roja de 20" },
  { tipo: "tarjeta_azul", label: "Tarjeta azul" },
];

type Paso = "tipo" | "equipo" | "jugador" | "convirtio" | "jugadorConversion" | "cuando" | "confirmar";

// Try y Try Scrum pueden convertirse -- Try Penal ya suma los 7 puntos (try+conversion
// automatica), no se le vuelve a preguntar.
const TIPOS_CON_CONVERSION: (typeof TIPOS)[number]["tipo"][] = ["try", "try_scrum"];

export default function CargaIncidencia({
  partidoId,
  plantel,
  enCanchaIds,
  soloEnCancha = true,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  enCanchaIds: string[];
  /** false en correcciones post-partido: cualquiera del plantel pudo haber anotado, no solo
   * quien estaba en cancha al momento de cortar (ya no hay forma de saberlo con certeza). */
  soloEnCancha?: boolean;
}) {
  const [paso, setPaso] = useState<Paso>("tipo");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["tipo"] | null>(null);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [jugadorId, setJugadorId] = useState<string | null>(null);
  const [convirtio, setConvirtio] = useState<boolean | null>(null);
  const [jugadorConversionId, setJugadorConversionId] = useState<string | null>(null);
  const [periodoManual, setPeriodoManual] = useState<Periodo | null>(null);
  const [minutoManual, setMinutoManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorReloj, setErrorReloj] = useState<string | null>(null);
  const [isPendingReloj, startTransitionReloj] = useTransition();
  const [confirmandoReloj, setConfirmandoReloj] = useState<30 | 60 | null>(null);

  // En correcciones post-partido el reloj ya esta congelado -- hay que preguntar en que
  // momento paso la jugada para que quede ordenada cronologicamente entre las demas.
  const esCorreccion = !soloEnCancha;

  const enCancha = soloEnCancha ? plantel.filter((j) => enCanchaIds.includes(j.jugadorId)) : plantel;
  // Try Penal / Try Scrum se le dan al equipo entero, no a un jugador puntual.
  const requiereJugador = equipo === "newman" && (tipo ? requierePlayerSelection(tipo) : true);
  const jugador = plantel.find((j) => j.jugadorId === jugadorId);

  function reset() {
    setPaso("tipo");
    setTipo(null);
    setEquipo(null);
    setJugadorId(null);
    setConvirtio(null);
    setJugadorConversionId(null);
    setPeriodoManual(null);
    setMinutoManual("");
    setError(null);
  }

  // Try/Try Scrum: antes de publicar nada, preguntar si convirtio y quien pateo -- asi el try y
  // su conversion salen en un solo "Publicar", sin una pantalla de "¿Convirtió?" en el medio con
  // tiempo de reaccion humano de por medio (eso fue lo que dejaba conversiones sin cargar: si el
  // designado tardaba en responder y mientras tanto cortaba el tiempo o terminaba el partido,
  // CargaIncidencia se desmontaba -- ver el render condicional en PanelDesignado -- y la pregunta
  // se perdia, aunque el try ya hubiera quedado guardado).
  function siguientePasoTrasJugador() {
    if (tipo && TIPOS_CON_CONVERSION.includes(tipo)) {
      setPaso("convirtio");
    } else {
      setPaso(esCorreccion ? "cuando" : "confirmar");
    }
  }

  function elegirTipo(t: (typeof TIPOS)[number]["tipo"]) {
    setTipo(t);
    setPaso("equipo");
  }

  // Correccion silenciosa del reloj (ej. el designado arranco el partido tarde) -- no pasa por el
  // flujo tipo/equipo/jugador, no queda en incidencias, y no aplica en correcciones post-partido
  // (ahi no hay reloj corriendo). Los segundos que suma a accumulatedSeconds se reflejan solos en
  // la cuenta regresiva de las tarjetas activas (Newman y rival) -- esa cuenta se calcula siempre
  // en base al reloj del partido (ver segundosDesdeIncidente en clock.ts), no guarda un valor
  // propio que haya que actualizar aparte.
  function adelantar(segundos: 30 | 60) {
    setErrorReloj(null);
    startTransitionReloj(async () => {
      try {
        await adelantarReloj(partidoId, segundos);
        setConfirmandoReloj(null);
      } catch (e) {
        setErrorReloj(e instanceof Error ? e.message : "No se pudo adelantar el reloj");
      }
    });
  }

  function elegirEquipo(e: Equipo) {
    setEquipo(e);
    const necesitaJugador = e === "newman" && (tipo ? requierePlayerSelection(tipo) : true);
    if (necesitaJugador) {
      setPaso("jugador");
    } else if (tipo && TIPOS_CON_CONVERSION.includes(tipo)) {
      setPaso("convirtio");
    } else {
      setPaso(esCorreccion ? "cuando" : "confirmar");
    }
  }

  function elegirConvirtio(convirtioAhora: boolean) {
    setConvirtio(convirtioAhora);
    if (convirtioAhora && equipo === "newman") {
      setPaso("jugadorConversion");
    } else {
      setPaso(esCorreccion ? "cuando" : "confirmar");
    }
  }

  function elegirJugadorConversion(id: string) {
    setJugadorConversionId(id);
    setPaso(esCorreccion ? "cuando" : "confirmar");
  }

  // Publica el try y, si convirtio, la conversion asociada en el mismo tap de "Publicar" -- sin
  // pausa entre ambas donde el componente pueda desmontarse a mitad de camino.
  function confirmar() {
    if (!tipo || !equipo) return;
    setError(null);
    const cuando = esCorreccion
      ? { periodoManual: periodoManual ?? undefined, minutoManual: Number(minutoManual) }
      : {};
    const inputTry: PublicarIncidenteInput = { tipo, equipo, jugadorId: jugadorId ?? undefined, ...cuando };
    const necesitaConversion = TIPOS_CON_CONVERSION.includes(tipo) && convirtio === true;
    const inputConversion: PublicarIncidenteInput | null = necesitaConversion
      ? { tipo: "conversion", equipo, jugadorId: equipo === "newman" ? (jugadorConversionId ?? undefined) : undefined, ...cuando }
      : null;
    startTransition(async () => {
      try {
        await publicarIncidente(partidoId, inputTry);
        if (inputConversion) await publicarIncidente(partidoId, inputConversion);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar");
      }
    });
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Cargar jugada
      </h3>

      {paso === "tipo" && (
        <div style={grillaOpciones}>
          {TIPOS.map(({ tipo: t, label }) => (
            <button key={t} style={{ ...botonOpcion, textAlign: "center" }} onClick={() => elegirTipo(t)}>
              {label}
            </button>
          ))}
          {/* Correccion de reloj -- no hay reloj corriendo en una correccion post-partido. */}
          {!esCorreccion && (
            <>
              <button style={{ ...botonOpcion, textAlign: "center" }} onClick={() => setConfirmandoReloj(30)}>
                +30&quot;
              </button>
              <button style={{ ...botonOpcion, textAlign: "center" }} onClick={() => setConfirmandoReloj(60)}>
                +60&quot;
              </button>
            </>
          )}
        </div>
      )}

      {paso === "tipo" && confirmandoReloj !== null && (
        <div style={{ ...listaOpciones, marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>
            ¿Adelantar el reloj {confirmandoReloj} segundos? También corre para las tarjetas activas.
          </p>
          {errorReloj && <p style={{ color: "crimson", margin: 0 }}>{errorReloj}</p>}
          <BarraAccionFija>
            <button style={botonPrimario} disabled={isPendingReloj} onClick={() => adelantar(confirmandoReloj)}>
              {isPendingReloj ? "Adelantando…" : "Confirmar"}
            </button>
            <button style={botonSecundario} disabled={isPendingReloj} onClick={() => { setConfirmandoReloj(null); setErrorReloj(null); }}>
              Cancelar
            </button>
          </BarraAccionFija>
        </div>
      )}

      {paso === "equipo" && (
        <div style={listaOpciones}>
          <button style={botonPrimario} onClick={() => elegirEquipo("newman")}>
            Newman
          </button>
          <button style={botonPrimario} onClick={() => elegirEquipo("rival")}>
            Rival
          </button>
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "jugador" && requiereJugador && (
        <div style={listaOpciones}>
          {enCancha.length === 0 && <p>{soloEnCancha ? "No hay jugadores en cancha." : "No hay jugadores cargados."}</p>}
          {enCancha.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} onClick={() => { setJugadorId(j.jugadorId); siguientePasoTrasJugador(); }}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "cuando" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿En qué momento pasó?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={periodoManual === "1T" ? botonPrimario : botonOpcion}
              onClick={() => setPeriodoManual("1T")}
            >
              1er tiempo
            </button>
            <button
              style={periodoManual === "2T" ? botonPrimario : botonOpcion}
              onClick={() => setPeriodoManual("2T")}
            >
              2do tiempo
            </button>
          </div>
          <label style={{ fontSize: "0.85rem", color: DORADO_SUAVE }}>
            Minuto
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={minutoManual}
              onChange={(e) => setMinutoManual(e.target.value)}
              style={{
                display: "block",
                marginTop: 6,
                width: "100%",
                fontSize: "1.1rem",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(226,197,120,.35)",
                background: "rgba(255,255,255,.06)",
                color: "#f7f1e4",
              }}
            />
          </label>
          <button
            style={botonPrimario}
            disabled={!periodoManual || !minutoManual || Number(minutoManual) < 1}
            onClick={() => setPaso("confirmar")}
          >
            Continuar
          </button>
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "convirtio" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Convirtió?</p>
          <BarraAccionFija>
            <button style={botonPrimario} onClick={() => elegirConvirtio(true)}>
              Sí, convirtió
            </button>
            <button style={botonSecundario} onClick={() => elegirConvirtio(false)}>
              No convirtió
            </button>
          </BarraAccionFija>
        </div>
      )}

      {paso === "jugadorConversion" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién pateó la conversión?</p>
          {enCancha.length === 0 && <p>{soloEnCancha ? "No hay jugadores en cancha." : "No hay jugadores cargados."}</p>}
          {enCancha.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} onClick={() => elegirJugadorConversion(j.jugadorId)}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button style={botonSecundario} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "confirmar" && tipo && equipo && (
        <div>
          <p style={{ fontSize: "1.02rem" }}>
            Confirmar: <strong>{TIPOS.find((t) => t.tipo === tipo)?.label}</strong> —{" "}
            {equipo === "newman" ? (requiereJugador ? jugador?.nombre ?? "" : "Newman") : "Rival"}
            {convirtio === true && (
              <>
                {" "}
                + Conversión
                {equipo === "newman" && jugadorConversionId
                  ? ` — ${plantel.find((j) => j.jugadorId === jugadorConversionId)?.nombre ?? ""}`
                  : ""}
              </>
            )}
            {esCorreccion && periodoManual && minutoManual && (
              <>
                {" "}
                ({periodoManual} {minutoManual}&apos;)
              </>
            )}
          </p>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <BarraAccionFija>
            <button style={botonPrimario} disabled={isPending} onClick={confirmar}>
              {isPending ? "Publicando…" : "Publicar"}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={reset}>
              Cancelar
            </button>
          </BarraAccionFija>
        </div>
      )}
    </div>
  );
}
