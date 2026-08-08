"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { Incidente } from "@/types/firestore";
import { DORADO } from "@/lib/colors";
import IncidentesList from "./IncidentesList";

export default function IncidentesFeed({ partidoId, rivalNombre }: { partidoId: string; rivalNombre?: string }) {
  const [incidentes, setIncidentes] = useState<(Incidente & { id: string })[]>([]);

  useEffect(() => {
    // Sin orderBy: el orden cronologico correcto lo resuelve ordenarIncidentes() (por
    // periodo+minuto de juego), no el momento en que se escribio el documento.
    const q = query(collection(db, "partidos", partidoId, "incidentes"));
    return onSnapshot(q, (snap) => {
      setIncidentes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Incidente) })));
    });
  }, [partidoId]);

  if (incidentes.length === 0) return null;

  return (
    <div
      style={{
        background: "rgba(255,255,255,.045)",
        border: "1px solid rgba(226,197,120,.2)",
        borderRadius: 12,
        padding: 16,
        marginTop: 14,
      }}
    >
      <h3 style={{ textTransform: "uppercase", letterSpacing: 1, fontSize: "0.85rem", color: DORADO, marginBottom: 10 }}>Incidencias</h3>
      <IncidentesList incidentes={incidentes} rivalNombre={rivalNombre} />
    </div>
  );
}
