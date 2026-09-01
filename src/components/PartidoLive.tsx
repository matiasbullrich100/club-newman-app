"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { CREMA, DORADO, DORADO_SUAVE } from "@/lib/colors";

// "(4T)" chico debajo del marcador grande -- misma info que aparece al lado del resultado cuando
// el partido termina (ver golesDe en FixtureRow). No se muestra nada si el equipo no metio tries.
function TriesTag({ tries }: { tries?: number }) {
  if (typeof tries !== "number" || tries <= 0) return null;
  return (
    <span style={{ display: "block", fontSize: "0.3em", fontWeight: 400, letterSpacing: 1, color: DORADO_SUAVE, marginTop: 2 }}>
      ({tries}T)
    </span>
  );
}

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
  apellidosAmbiguos,
  sugeridoPateadorId,
}: {
  partidoId: string;
  inicial: Partido;
  session: SessionPayload | null;
  plantel: RosterJugador[];
  plantelCompleto: JugadorBusqueda[];
  apellidosAmbiguos?: string[];
  sugeridoPateadorId?: string | null;
}) {
  const router = useRouter();
  const [partido, setPartido] = useState<Partido>(inicial);
  const [periodo, setPeriodo] = useState<LiveState["periodo"]>(null);
  const [motivoInterrupcion, setMotivoInterrupcion] = useState<LiveState["motivoInterrupcion"]>(null);

  useEffect(() => {
    const ref = doc(db, "partidos", partidoId);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setPartido(snap.data() as Partido);
    });
  }, [partidoId]);

  // La pagina bifurca server-side segun estado: terminado/programado -> vista estatica,
  // en_juego/entretiempo/suspendido -> este componente. Cuando alguien que tiene el partido
  // abierto ve que paso a terminado (o lo reiniciaron a programado), hay que refrescar para que
  // el servidor vuelva a bifurcar -- si no, se queda pegado el feed en vivo (con las tarjetas,
  // que en el partido terminado se ocultan para todos menos el manager). Mismo router.refresh()
  // que hace el panel del designado al apretar Terminar, pero para el resto de los que miran.
  const yaRefresco = useRef(false);
  useEffect(() => {
    if ((partido.estado === "terminado" || partido.estado === "programado") && !yaRefresco.current) {
      yaRefresco.current = true;
      router.refresh();
    }
  }, [partido.estado, router]);

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
          background: "linear-gradient(160deg, rgba(0,0,0,.3), rgba(0,0,0,.15))",
          border: `1px solid ${DORADO}`,
          borderRadius: 14,
          padding: "16px 14px",
          marginBottom: 14,
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: 1, color: DORADO_SUAVE }}>Newman</div>
          <div style={{ fontWeight: 700, fontSize: "2.4rem", color: CREMA, lineHeight: 1.1 }}>
            {partido.resultado.newman}
            <TriesTag tries={partido.resultado.triesNewman} />
          </div>
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
          <div style={{ fontWeight: 700, fontSize: "2.4rem", color: CREMA, lineHeight: 1.1 }}>
            {partido.resultado.rival}
            <TriesTag tries={partido.resultado.triesRival} />
          </div>
        </div>
      </div>

      {/* Para el Designado, las formaciones van adentro del panel, debajo de "Cargar jugada"
          (más a mano las acciones que se usan a cada rato). El resto lo ve acá arriba. */}
      {plantel.length > 0 && !puedeOperar && (
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
        <PanelDesignado
          partidoId={partidoId}
          partido={partido}
          plantel={plantel}
          plantelCompleto={plantelCompleto}
          periodo={periodo}
          apellidosAmbiguos={apellidosAmbiguos}
          sugeridoPateadorId={sugeridoPateadorId}
        />
      ) : (
        <IncidentesFeed
          partidoId={partidoId}
          rivalNombre={partido.rival}
          nombreNewman={nombreNewmanDe(partido.categoriaId)}
          esLocal={partido.esLocal}
          plantel={plantel}
          apellidosAmbiguos={apellidosAmbiguos}
        />
      )}
    </div>
  );
}
