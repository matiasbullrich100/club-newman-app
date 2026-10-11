// Id de fila / ancla para ir de Cruces a la Tabla de Posiciones parado en un equipo ("CUBA B" -> "cuba-b").
export function slugEquipo(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
