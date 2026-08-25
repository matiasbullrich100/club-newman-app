"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import Cronometro from "./Cronometro";
import PanelDesignado from "./panel-designado/PanelDesignado";
import IncidentesFeed from "./IncidentesFeed";
import Formaciones from "./Formaciones";
import type { EstadoPartido, LiveState, Partido } from "@/types/firestore";
import type { SessionPayload } from "@/lib/auth/session";
import type { JugadorBusqueda, RosterJugador } from "./panel-designado/types";
import { nombreNewmanDe } from "@/lib/categorias";
import { puedeOperarCategoria } from "@/lib/auth/scope";
import { BORDO, BORDO_OSC, CREMA, DORADO, DORADO_SUAVE } from "@/lib/colors";

const ESTADO_BADGE: Record<EstadoPartido, { label: string; bg: string; color: string }> = {
  programado: { label: "No iniciado", bg: "rgba(255,255,255,.1)", color: "#ccc" },
  en_juego: { label: "En juego", bg: "#245c2c", color: "#c6f0cc" },
  entretiempo: { label: "Entretiempo", bg: "#5c4a15", color: DORADO_SUAVE },
  suspendido: { label: "Interrumpido", bg: "#5c1515", color: "#f3caca" },
  terminado: { label: "Terminado", bg: "#3a3a3a", color: "#ddd" },
};

export default function PartidoLive({
  partidoId,
  inicial,
  session,
  plantel,
  plantelCompleto,
}: {
  partidoId: string;
  inicial: Partido;
  session: SessionPayload | null;
  plantel: RosterJugador[];
  plantelCompleto: JugadorBusqueda[];
}) {
  const [partido, setPartido] = useState<Partido>(inicial);
  const [periodo, setPeriodo] = useState<LiveState["periodo"]>(null);
  const [motivoInterrupcion, setMotivoInterrupcion] = useState<LiveState["motivoInterrupcion"]>(null);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setPartido(snap.data() as Partido);
    });
  }, [partidoId]);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId, "liveState", "state");
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const liveState = snap.data() as LiveState;
        setPeriodo(liveState.periodo);
        setMotivoInterrupcion(liveState.motivoInterrupcion ?? null);
      }
    });
  }, [partidoId]);

  const puedeOperar = puedeOperarCategoria(session, partido.categoriaId);
  const badge = ESTADO_BADGE[partido.estado];
  const motivoLabel = motivoInterrupcion === "medico" ? "Médico" : motivoInterrupcion === "clima" ? "Clima" : null;
  const badgeLabel = partido.estado === "suspendido" && motivoLabel ? `${badge.label} · ${motivoLabel}` : badge.label;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          // Mismo degrade bordo bien visible que el titulo del partido en PartidoHistorico --
          // tratamiento consistente en toda la app, en vivo o no.
          background: `linear-gradient(135deg, rgba(245,168,0,.4), ${BORDO} 50%, ${BORDO_OSC})`,
          border: `1px solid ${DORADO}`,
          borderRadius: 14,
          padding: "16px 14px",
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: 1, color: DORADO_SUAVE }}>Newman</div>
          <div style={{ fontWeight: 700, fontSize: "2.4rem", color: CREMA, lineHeight: 1.1 }}>{partido.resultado.newman}</div>
        </div>
        <div style={{ textAlign: "center", padding: "0 8px" }}>
          <Cronometro partidoId={partidoId} estado={partido.estado} />
          <div>
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                fontSize: "0.62rem",
                textTransform: "uppercase",
                letterSpacing: 1,
                padding: "3px 9px",
                borderRadius: 20,
                background: badge.bg,
                color: badge.color,
              }}
            >
              {badgeLabel}
            </span>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: 1, color: DORADO_SUAVE }}>{partido.rival}</div>
          <div style={{ fontWeight: 700, fontSize: "2.4rem", color: CREMA, lineHeight: 1.1 }}>{partido.resultado.rival}</div>
        </div>
      </div>

      {plantel.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,.045)",
            border: "1px solid rgba(226,197,120,.2)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
          }}
        >
          <h3 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginTop: 0, marginBottom: 10 }}>
            Formaciones
          </h3>
          <Formaciones plantel={plantel} />
        </div>
      )}

      {puedeOperar ? (
        // El feed para el Designado va adentro del panel (entre jugadas y cambios).
        <PanelDesignado partidoId={partidoId} partido={partido} plantel={plantel} plantelCompleto={plantelCompleto} periodo={periodo} />
      ) : (
        <IncidentesFeed
          partidoId={partidoId}
          rivalNombre={partido.rival}
          nombreNewman={nombreNewmanDe(partido.categoriaId)}
          esLocal={partido.esLocal}
        />
      )}
    </div>
  );
}
