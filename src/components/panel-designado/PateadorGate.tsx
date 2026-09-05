"use client";

import { useState } from "react";
import PateadorHabitual from "./PateadorHabitual";
import type { RosterJugador } from "./types";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

// Pedido explicito del club: cada vez que alguien ENTRA a un partido (no arrancado todavia) sin
// haber contestado la pregunta del pateador EN ESTA VISITA, se tapa todo lo demas (Formaciones,
// Iniciar Partido, Editar Formacion) hasta que elige algo -- aunque ya hubiera una eleccion
// guardada de una visita anterior (ej. "Sin pateador fijo" del dia previo). El dato guardado NO se
// borra ni se toca solo por entrar: sigue siendo el que usa CargaIncidencia hasta que esta pantalla
// lo pisa con una respuesta nueva. Por eso PateadorHabitual se monta con `pateadorHabitualId`
// forzado a `undefined` aca adentro -- solo para que arranque siempre en el flujo de "preguntar",
// nunca en el resumen compacto "Ya elegido -> Cambiar" (ese resumen sigue viendose normal, con el
// valor real, adentro del Panel del Designado una vez destapado).
export default function PateadorGate({
  partidoId,
  plantel,
  sugeridoId,
  children,
}: {
  partidoId: string;
  plantel: RosterJugador[];
  sugeridoId?: string | null;
  children: React.ReactNode;
}) {
  const [confirmado, setConfirmado] = useState(false);

  if (confirmado) return <>{children}</>;

  return (
    <div
      style={{
        background: "rgba(255,255,255,.045)",
        border: "1px solid rgba(226,197,120,.2)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h2 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginTop: 0, marginBottom: 4 }}>
        Antes de arrancar
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: DORADO_SUAVE }}>
        Elegí el pateador para poder iniciar el partido.
      </p>
      <PateadorHabitual
        partidoId={partidoId}
        plantel={plantel}
        sugeridoId={sugeridoId}
        pateadorHabitualId={undefined}
        onElegido={() => setConfirmado(true)}
      />
    </div>
  );
}
