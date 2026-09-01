"use client";

import { useState, useTransition } from "react";
import { setHorarioCancha } from "@/lib/match/actions";
import { MatchupText } from "./FixtureRow";
import { formatFechaCorta } from "@/lib/fecha";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Una fila de /programar: el partido que viene de una categoria + inputs para cargar horario y
// cancha puntual. Solo la usa el manager de esa division / el administrador (la pagina ya filtra).
export default function ProgramarFechaFila({
  partidoId,
  categoriaNombre,
  esLocal,
  rival,
  nombreNewman,
  fecha,
  notaEspecial,
  horaInicial,
  canchaInicial,
  numeroCanchaInicial,
}: {
  partidoId: string;
  categoriaNombre: string;
  esLocal: boolean;
  rival: string;
  nombreNewman?: string;
  fecha?: string;
  notaEspecial?: string;
  horaInicial?: string;
  canchaInicial?: string;
  numeroCanchaInicial?: string;
}) {
  const [hora, setHora] = useState(horaInicial ?? "");
  const [cancha, setCancha] = useState(canchaInicial ?? "");
  const [numeroCancha, setNumeroCancha] = useState(numeroCanchaInicial ?? "");
  const [estado, setEstado] = useState<"idle" | "guardado" | "error">("idle");
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sinCambios =
    hora === (horaInicial ?? "") && cancha === (canchaInicial ?? "") && numeroCancha === (numeroCanchaInicial ?? "");

  function guardar() {
    setEstado("idle");
    setMensajeError(null);
    startTransition(async () => {
      try {
        await setHorarioCancha(partidoId, { hora, cancha, numeroCancha });
        setEstado("guardado");
      } catch (e) {
        setEstado("error");
        setMensajeError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div
      style={{
        background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
        border: `1px solid rgba(226,197,120,.35)`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ textTransform: "uppercase", letterSpacing: 0.3, fontSize: "0.68rem", color: DORADO_SUAVE }}>{categoriaNombre}</span>
        <span style={{ fontSize: "0.6rem", color: DORADO }}>{fecha && formatFechaCorta(fecha)}</span>
      </div>

      <div style={{ fontSize: "0.9rem", margin: "4px 0 8px", textAlign: "center" }}>
        {notaEspecial ?? <MatchupText esLocal={esLocal} rival={rival} jugado={false} resultado={{ newman: 0, rival: 0 }} nombreNewman={nombreNewman} />}
      </div>

      {!notaEspecial && (
        <>
          {!esLocal && (
            <p style={{ margin: "0 0 6px", fontSize: "0.7rem", color: DORADO_SUAVE, opacity: 0.7 }}>
              De visitante — normalmente lo define {rival}. Cargalo cuando lo sepas.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.62rem", color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Horario
              <input
                type="time"
                value={hora}
                onChange={(e) => {
                  setHora(e.target.value);
                  setEstado("idle");
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.62rem", color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {esLocal ? "Sede" : "Sede / club"}
              <input
                type="text"
                placeholder={esLocal ? "Newman" : rival}
                value={cancha}
                onChange={(e) => {
                  setCancha(e.target.value);
                  setEstado("idle");
                }}
                style={{ ...inputStyle, width: 130 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.62rem", color: DORADO_SUAVE, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Cancha N°
              <input
                type="text"
                inputMode="numeric"
                placeholder="1"
                value={numeroCancha}
                onChange={(e) => {
                  setNumeroCancha(e.target.value);
                  setEstado("idle");
                }}
                style={{ ...inputStyle, width: 64 }}
              />
            </label>
            <button
              type="button"
              onClick={guardar}
              disabled={isPending || sinCambios}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${DORADO}`,
                background: sinCambios ? "rgba(226,197,120,.12)" : DORADO,
                color: sinCambios ? DORADO_SUAVE : "#350916",
                fontWeight: 700,
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                cursor: isPending || sinCambios ? "default" : "pointer",
              }}
            >
              {isPending ? "Guardando…" : estado === "guardado" && sinCambios ? "Guardado ✓" : "Guardar"}
            </button>
          </div>
          {estado === "guardado" && sinCambios && (
            <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: DORADO_SUAVE }}>Listo, quedó guardado.</p>
          )}
          {estado === "error" && mensajeError && (
            <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: "crimson" }}>{mensajeError}</p>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(226,197,120,.35)",
  background: "rgba(0,0,0,.25)",
  color: "#f7f1e4",
  fontSize: "0.9rem",
};
