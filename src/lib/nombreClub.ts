// "SIC B" -> "SIC", "Newman C" -> "Newman", "Hindu" -> "Hindú": en una pantalla de division alcanza con el club
// (la letra del equipo es la de la division) y se usa la grafia del club. Usado por /playoff.
export function nombreClub(equipo: string): string {
  const sinLetra = equipo.replace(/ [A-H]$/, "");
  return sinLetra === "Hindu" ? "Hindú" : sinLetra;
}
