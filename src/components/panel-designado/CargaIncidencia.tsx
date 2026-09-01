"use client";

import { useEffect, useState, useTransition } from "react";
import { adelantarReloj, publicarIncidente, type PublicarIncidenteInput } from "@/lib/match/actions";
import type { Equipo, Periodo, TipoIncidente } from "@/types/firestore";
import { FAMILIA_PUNTOS, requierePlayerSelection } from "@/lib/incidentes";
import type { JugadorBusqueda, RosterJugador } from "./types";
import CargaCambio from "./CargaCambio";
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
  { tipo: "tarjeta_amarilla", label: "Amarilla" },
  { tipo: "tarjeta_roja", label: "Roja Definitiva" },
  { tipo: "tarjeta_roja_20", label: "Roja de 20" },
  { tipo: "tarjeta_azul", label: "Tarjeta azul" },
];

type Paso = "tipo" | "equipo" | "jugador" | "confirmarPateador" | "convirtio" | "jugadorConversion" | "cuando" | "confirmar" | "cambio";

// Try y Try Scrum pueden convertirse -- Try Penal ya suma los 7 puntos (try+conversion
// automatica), no se le vuelve a preguntar.
const TIPOS_CON_CONVERSION: (typeof TIPOS)[number]["tipo"][] = ["try", "try_scrum"];

// Patadas donde, si hay un pateador habitual preseteado (ver PateadorHabitual.tsx) y sigue en
// cancha, se pregunta "¿Fue [fulano]?" en vez de buscarlo en la lista completa. Drop queda afuera
// a pedido del club -- mucho menos repetible, no siempre lo patea el mismo.
const TIPOS_CON_PATEADOR_PRESETEADO: (typeof TIPOS)[number]["tipo"][] = ["conversion", "penal"];

export default function CargaIncidencia({
  partidoId,
  plantel,
  plantelCompleto = [],
  enCanchaIds,
  pateadorHabitualId,
  soloEnCancha = true,
  enJuego = true,
  onBloqueoChange,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  /** Plantel completo del club (para el buscador de "otro jugador" del Cambio embebido). */
  plantelCompleto?: JugadorBusqueda[];
  enCanchaIds: string[];
  /** jugadorId del pateador habitual de este partido (Partido.pateadorHabitualId), si esta en
   * cancha -- ver pateadorEnCancha mas abajo. */
  pateadorHabitualId?: string | null;
  /** false en correcciones post-partido: cualquiera del plantel pudo haber anotado, no solo
   * quien estaba en cancha al momento de cortar (ya no hay forma de saberlo con certeza). */
  soloEnCancha?: boolean;
  /** false en el entretiempo (reloj parado): solo se ofrece el Cambio, no jugadas de puntos ni
   * tarjetas ni correccion de reloj. En vivo y en correccion post-partido va true. */
  enJuego?: boolean;
  /** Se avisa al panel cuando hay un try de Newman EN VIVO esperando que se elija el jugador que
   * lo hizo -- el panel bloquea el resto de las acciones hasta que se elige (o se cancela), asi
   * el try no se queda sin publicar por olvido. */
  onBloqueoChange?: (bloqueado: boolean) => void;
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

  // Normalmente se filtra por quién está en cancha. Pero si `enCanchaIds` se perdió (quedó vacío
  // -- pasó en Fecha 18 y el 2026-08-29), filtrar dejaría la lista vacía y no se podría anotar
  // ningún try/tarjeta de Newman -> en ese caso se muestra el plantel completo (el server también
  // reconstruye enCanchaIds desde los titulares al publicar).
  const enCancha =
    !soloEnCancha || enCanchaIds.length === 0 ? plantel : plantel.filter((j) => enCanchaIds.includes(j.jugadorId));
  // Try Penal / Try Scrum se le dan al equipo entero, no a un jugador puntual.
  const requiereJugador = equipo === "newman" && (tipo ? requierePlayerSelection(tipo) : true);
  const jugador = plantel.find((j) => j.jugadorId === jugadorId);
  // Si el pateador preseteado salio de cancha (cambio, sancion), se cae el atajo entero y se
  // vuelve al circuito de siempre (buscarlo en la lista) -- no aplica en correcciones post-partido,
  // ahi enCanchaIds ya no refleja quien jugaba en el momento.
  const pateadorEnCancha =
    soloEnCancha && pateadorHabitualId
      ? plantel.find((j) => j.jugadorId === pateadorHabitualId && enCanchaIds.includes(j.jugadorId))
      : undefined;

  // Try (o Try Scrum) de Newman, en vivo, que ya sabemos que fue de Newman pero todavia no se
  // eligio el jugador que lo hizo -- hasta que se elija (y el try se publique) el panel bloquea
  // el resto de las acciones. Es EN VIVO nomas: en la correccion post-partido no aplica.
  const tryConversion = !!tipo && TIPOS_CON_CONVERSION.includes(tipo);
  const bloqueado = !esCorreccion && paso === "jugador" && tryConversion && equipo === "newman";
  useEffect(() => {
    onBloqueoChange?.(bloqueado);
    return () => onBloqueoChange?.(false);
  }, [bloqueado, onBloqueoChange]);

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

  type Overrides = {
    equipo?: Equipo;
    jugadorId?: string | null;
    convirtio?: boolean | null;
    jugadorConversionId?: string | null;
    // true = publicar la jugada de Newman sin el jugador (lista vacía, no había formación).
    sinJugador?: boolean;
  };

  // Publica directo, sin pasar por la pantalla "Confirmar / Publicar" -- solo para jugadas de
  // puntos en vivo (try, conversion, penal, drop, try penal). Las tarjetas siguen pidiendo
  // confirmacion a mano (terminarJugada mas abajo), son mas delicadas. Recibe el ultimo valor
  // elegido por parametro en vez de leerlo del estado -- el setX() de un ratito antes todavia no
  // se aplico cuando esta funcion corre en el mismo evento.
  function publicarDirecto(overrides: Overrides = {}) {
    const equipoUsar = overrides.equipo ?? equipo;
    if (!tipo || !equipoUsar) return;
    setError(null);
    const jugadorIdUsar = overrides.jugadorId !== undefined ? overrides.jugadorId : jugadorId;
    const convirtioUsar = overrides.convirtio !== undefined ? overrides.convirtio : convirtio;
    const jugadorConversionIdUsar =
      overrides.jugadorConversionId !== undefined ? overrides.jugadorConversionId : jugadorConversionId;
    const cuando = esCorreccion
      ? { periodoManual: periodoManual ?? undefined, minutoManual: Number(minutoManual) }
      : {};
    const sinJugador = overrides.sinJugador ? { sinJugador: true as const } : {};
    const inputTry: PublicarIncidenteInput = { tipo, equipo: equipoUsar, jugadorId: jugadorIdUsar ?? undefined, ...sinJugador, ...cuando };
    const necesitaConversion = TIPOS_CON_CONVERSION.includes(tipo) && convirtioUsar === true;
    const inputConversion: PublicarIncidenteInput | null = necesitaConversion
      ? {
          tipo: "conversion",
          equipo: equipoUsar,
          jugadorId: equipoUsar === "newman" ? (jugadorConversionIdUsar ?? undefined) : undefined,
          ...sinJugador,
          ...cuando,
        }
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

  // Punto de llegada de cualquier camino que ya tiene todo lo necesario para esa jugada. En
  // correccion post-partido siempre pasa por "cuando" (pedir periodo/minuto) y termina con un
  // "Publicar" a mano. En vivo: las jugadas de puntos se publican solas (pedido del club -- no
  // hace falta un tap mas despues de contestar la ultima pregunta); las tarjetas siguen yendo a
  // la pantalla de confirmar, son mas delicadas como para publicarlas sin volver a mirarlas.
  function terminarJugada(overrides: Overrides = {}) {
    if (esCorreccion) {
      setPaso("cuando");
      return;
    }
    if (tipo && FAMILIA_PUNTOS.includes(tipo)) {
      publicarDirecto(overrides);
    } else {
      setPaso("confirmar");
    }
  }

  // EN VIVO: publica SOLO el try (o try scrum) apenas se sabe quien lo hizo, sin esperar a la
  // conversion ni al pateador -- eso se pregunta despues, con el try ya publicado. La conversion
  // se publica como una incidencia aparte (ver publicarSoloConversion). En correccion post-partido
  // el circuito viejo sigue igual (try + conversion juntos al final, via publicarDirecto).
  function publicarSoloTry(overrides: { equipo?: Equipo; jugadorId?: string | null; sinJugador?: boolean } = {}) {
    const equipoUsar = overrides.equipo ?? equipo;
    if (!tipo || !equipoUsar) return;
    setError(null);
    const jugadorIdUsar = overrides.jugadorId !== undefined ? overrides.jugadorId : jugadorId;
    const input: PublicarIncidenteInput = {
      tipo,
      equipo: equipoUsar,
      jugadorId: jugadorIdUsar ?? undefined,
      ...(overrides.sinJugador ? { sinJugador: true } : {}),
    };
    startTransition(async () => {
      try {
        await publicarIncidente(partidoId, input);
        setPaso("convirtio"); // el try ya quedo publicado; ahora se pregunta la conversion
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar el try");
      }
    });
  }

  // EN VIVO: publica SOLO la conversion (el try ya se publico antes). "No convirtio" no publica
  // nada. Del rival no se registra el pateador.
  function publicarSoloConversion(
    overrides: { convirtio?: boolean; jugadorConversionId?: string | null; sinJugador?: boolean } = {}
  ) {
    const convirtioUsar = overrides.convirtio !== undefined ? overrides.convirtio : convirtio;
    if (convirtioUsar !== true) {
      reset();
      return;
    }
    const equipoUsar = equipo;
    if (!equipoUsar) return;
    setError(null);
    const jugadorConversionIdUsar =
      overrides.jugadorConversionId !== undefined ? overrides.jugadorConversionId : jugadorConversionId;
    const input: PublicarIncidenteInput = {
      tipo: "conversion",
      equipo: equipoUsar,
      jugadorId: equipoUsar === "newman" ? (jugadorConversionIdUsar ?? undefined) : undefined,
      ...(overrides.sinJugador ? { sinJugador: true } : {}),
    };
    startTransition(async () => {
      try {
        await publicarIncidente(partidoId, input);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar la conversión");
      }
    });
  }

  function elegirJugador(id: string) {
    setJugadorId(id);
    if (!esCorreccion && tryConversion) {
      publicarSoloTry({ jugadorId: id }); // publica el try ya, sin esperar la conversion
    } else if (tipo && TIPOS_CON_CONVERSION.includes(tipo)) {
      setPaso("convirtio");
    } else {
      terminarJugada({ jugadorId: id });
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

    // EN VIVO, try / try scrum: si es de Newman y hay que elegir jugador, se va a esa pantalla
    // (el panel queda bloqueado hasta que se elija). Si no (rival, o try scrum sin jugador
    // puntual), el try se publica ya y despues se pregunta la conversion.
    if (!esCorreccion && tipo && TIPOS_CON_CONVERSION.includes(tipo)) {
      if (necesitaJugador) setPaso("jugador");
      else publicarSoloTry({ equipo: e });
      return;
    }

    if (necesitaJugador) {
      // Conversion/penal sueltos (no encadenados desde un try): si el pateador habitual sigue en
      // cancha, confirmar en un tap en vez de listar todo el plantel.
      if (tipo && TIPOS_CON_PATEADOR_PRESETEADO.includes(tipo) && pateadorEnCancha) {
        setPaso("confirmarPateador");
      } else {
        setPaso("jugador");
      }
    } else if (tipo && TIPOS_CON_CONVERSION.includes(tipo)) {
      setPaso("convirtio");
    } else {
      terminarJugada({ equipo: e });
    }
  }

  function siEsElPateador() {
    if (!pateadorEnCancha) return;
    elegirJugador(pateadorEnCancha.jugadorId);
  }

  // En vivo la conversion se publica sola como incidencia aparte (el try ya esta); en correccion
  // post-partido sigue yendo con el try al paso "cuando" -> "confirmar" (terminarJugada).
  function resolverConversion(overrides: { convirtio?: boolean; jugadorConversionId?: string | null; sinJugador?: boolean }) {
    if (esCorreccion) terminarJugada(overrides);
    else publicarSoloConversion(overrides);
  }

  function elegirConvirtio(convirtioAhora: boolean) {
    setConvirtio(convirtioAhora);
    if (convirtioAhora && equipo === "newman") {
      setPaso("jugadorConversion");
    } else {
      resolverConversion({ convirtio: convirtioAhora });
    }
  }

  // Variante de arriba cuando hay pateador habitual en cancha: "¿Convirtió?" y "¿fue [fulano]?" en
  // un solo tap para el caso comun, sin perder la salida a elegir otro jugador.
  function elegirConvirtioConPateador(resultado: "si" | "no" | "otro") {
    if (resultado === "no") {
      setConvirtio(false);
      resolverConversion({ convirtio: false });
      return;
    }
    setConvirtio(true);
    if (resultado === "si" && pateadorEnCancha) {
      setJugadorConversionId(pateadorEnCancha.jugadorId);
      resolverConversion({ convirtio: true, jugadorConversionId: pateadorEnCancha.jugadorId });
    } else {
      setPaso("jugadorConversion");
    }
  }

  function elegirJugadorConversion(id: string) {
    setJugadorConversionId(id);
    resolverConversion({ convirtio: true, jugadorConversionId: id });
  }

  // Usado por el boton "Publicar" a mano -- tarjetas en vivo, y cualquier jugada en correccion
  // post-partido (ahi el estado ya esta asentado, sin riesgo de leerlo stale).
  function confirmar() {
    publicarDirecto();
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.75rem", color: DORADO, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Cargar jugada
      </h3>

      {/* Jugadas de puntos en vivo se publican solas (ver terminarJugada) -- sin pantalla de
          Confirmar donde mostrar el error, asi que va arriba de todo, visible sea cual sea el
          paso en el que se corte. */}
      {error && paso !== "confirmar" && <p style={{ color: "crimson" }}>{error}</p>}

      {paso === "tipo" && (
        <div style={grillaOpciones}>
          {/* En el entretiempo (enJuego false, reloj parado) solo tiene sentido el Cambio. */}
          {(enJuego || esCorreccion) &&
            TIPOS.slice(0, 6).map(({ tipo: t, label }) => (
              <button key={t} style={{ ...botonOpcion, textAlign: "center" }} onClick={() => elegirTipo(t)}>
                {label}
              </button>
            ))}
          {/* "Cargar un cambio" -- entre las jugadas de puntos y las tarjetas. */}
          {!esCorreccion && (
            <button style={{ ...botonOpcion, textAlign: "center" }} onClick={() => setPaso("cambio")}>
              Cambio
            </button>
          )}
          {(enJuego || esCorreccion) &&
            TIPOS.slice(6).map(({ tipo: t, label }) => (
              <button key={t} style={{ ...botonOpcion, textAlign: "center" }} onClick={() => elegirTipo(t)}>
                {label}
              </button>
            ))}
          {/* Correccion de reloj -- no hay reloj corriendo en una correccion post-partido ni en el entretiempo. */}
          {!esCorreccion && enJuego && (
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

      {paso === "cambio" && (
        <CargaCambio
          partidoId={partidoId}
          plantel={plantel}
          plantelCompleto={plantelCompleto}
          enCanchaIds={enCanchaIds}
          soloEnCancha={soloEnCancha}
          arrancarAbierto
          onCerrar={() => setPaso("tipo")}
        />
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
          {tryConversion && <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién hizo el try?</p>}
          <button style={botonPrimario} disabled={isPending} onClick={() => elegirEquipo("newman")}>
            Newman
          </button>
          <button style={botonPrimario} disabled={isPending} onClick={() => elegirEquipo("rival")}>
            Rival
          </button>
          <button style={botonSecundario} disabled={isPending} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}

      {paso === "confirmarPateador" && pateadorEnCancha && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Fue {pateadorEnCancha.nombre} quien la pateó?</p>
          <BarraAccionFija>
            <button style={botonPrimario} disabled={isPending} onClick={siEsElPateador}>
              {isPending ? "Publicando…" : `Sí, fue ${pateadorEnCancha.nombre}`}
            </button>
            <button style={botonSecundario} disabled={isPending} onClick={() => setPaso("jugador")}>
              No, otro jugador
            </button>
          </BarraAccionFija>
        </div>
      )}

      {paso === "jugador" && requiereJugador && (
        <div style={listaOpciones}>
          {bloqueado && (
            <p style={{ margin: 0, fontWeight: 700, color: DORADO, fontSize: "0.95rem" }}>
              ¿Quién hizo el try? Elegí el jugador para publicarlo{isPending ? " (publicando…)" : ""}.
            </p>
          )}
          {enCancha.length === 0 && (
            <>
              <p style={{ margin: 0, fontSize: "0.88rem", color: DORADO_SUAVE }}>
                {soloEnCancha ? "No hay formación cargada para elegir el jugador." : "No hay jugadores cargados."}
              </p>
              {!esCorreccion && (
                <button style={botonPrimario} disabled={isPending} onClick={() => publicarSoloTry({ sinJugador: true })}>
                  {isPending ? "Publicando…" : "Anotar el try igual (sin jugador — lo corrijo después)"}
                </button>
              )}
            </>
          )}
          {enCancha.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} disabled={isPending} onClick={() => elegirJugador(j.jugadorId)}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button style={botonSecundario} disabled={isPending} onClick={reset}>
            {bloqueado ? "Cancelar (fue error, no hubo try)" : "Cancelar"}
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
          {equipo === "newman" && pateadorEnCancha ? (
            <>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Convirtió {pateadorEnCancha.nombre}?</p>
              <BarraAccionFija>
                <button style={botonPrimario} disabled={isPending} onClick={() => elegirConvirtioConPateador("si")}>
                  {isPending ? "Publicando…" : "Sí"}
                </button>
                <button style={botonSecundario} disabled={isPending} onClick={() => elegirConvirtioConPateador("no")}>
                  No convirtió
                </button>
                <button style={botonSecundario} disabled={isPending} onClick={() => elegirConvirtioConPateador("otro")}>
                  Convirtió, otro jugador
                </button>
              </BarraAccionFija>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Convirtió?</p>
              <BarraAccionFija>
                <button style={botonPrimario} disabled={isPending} onClick={() => elegirConvirtio(true)}>
                  Sí, convirtió
                </button>
                <button style={botonSecundario} disabled={isPending} onClick={() => elegirConvirtio(false)}>
                  {isPending ? "Publicando…" : "No convirtió"}
                </button>
              </BarraAccionFija>
            </>
          )}
        </div>
      )}

      {paso === "jugadorConversion" && (
        <div style={listaOpciones}>
          <p style={{ margin: 0, fontSize: "0.92rem" }}>¿Quién pateó la conversión?</p>
          {enCancha.length === 0 && (
            <>
              <p style={{ margin: 0, fontSize: "0.88rem", color: DORADO_SUAVE }}>
                {soloEnCancha ? "No hay formación cargada para elegir el pateador." : "No hay jugadores cargados."}
              </p>
              {!esCorreccion && (
                <button
                  style={botonPrimario}
                  disabled={isPending}
                  onClick={() => publicarSoloConversion({ convirtio: true, sinJugador: true })}
                >
                  {isPending ? "Publicando…" : "Anotar la conversión igual (sin pateador)"}
                </button>
              )}
            </>
          )}
          {enCancha.map((j) => (
            <button key={j.jugadorId} style={botonOpcion} disabled={isPending} onClick={() => elegirJugadorConversion(j.jugadorId)}>
              {j.dorsal} — {j.nombre}
            </button>
          ))}
          <button style={botonSecundario} disabled={isPending} onClick={reset}>
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
