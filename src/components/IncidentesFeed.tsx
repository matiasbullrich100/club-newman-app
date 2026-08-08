"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import type { Incidente } from "@/types/firestore";
import { describirIncidente } from "@/lib/incidentes";
import { DORADO, DORADO_SUAVE } from "@/lib/colors";

export default function IncidentesFeed({ partidoId }: { partidoId: string }) {
  const [incidentes, setIncidentes] = useState<(Incidente & { id: string })[]>([]);

  useEffect(() => {
    const q = query(collection(db, "partidos", partidoId, "incidentes"), orderBy("createdAt", "desc"));
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
      {incidentes.map((inc) => (
        <div
          key={inc.id}
          style={{ display: "flex", gap: 10, padding: "8px 4px", fontSize: "0.85rem", borderBottom: "1px dashed rgba(255,255,255,.08)" }}
        >
          <div style={{ color: DORADO, minWidth: 34, fontSize: "0.8rem" }}>
            {inc.periodo} {inc.minuto}&apos;
          </div>
          <div style={{ color: DORADO_SUAVE }}>{describirIncidente(inc)}</div>
        </div>
      ))}
    </div>
  );
}
