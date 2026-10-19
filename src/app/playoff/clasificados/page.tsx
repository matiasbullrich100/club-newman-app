import { redirect } from "next/navigation";

// Ruta anterior de la tabla de clasificados: ahora es la primera pantalla de Playoff (/playoff).
export default function PlayoffClasificadosRedirect() {
  redirect("/playoff");
}
