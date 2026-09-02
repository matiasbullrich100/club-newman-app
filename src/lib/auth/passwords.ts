import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Las contraseñas se guardan y se comparan SIN distinguir mayúsculas/minúsculas (pedido de
// Matias: que el Designado pueda entrar tanto con "DaleBordo" como con "dalebordo"). Se normaliza
// a minúscula antes de hashear/comparar. El usuario ya era case-insensitive (ver
// normalizeUsername en auth/actions.ts).
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain.toLowerCase(), SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (await bcrypt.compare(plain.toLowerCase(), hash)) return true;
  // Fallback por si algún hash viejo se generó con mayúsculas (todas las claves actuales ya son
  // minúscula, así que normalmente no hace falta) -- así ninguna cuenta existente se rompe.
  return bcrypt.compare(plain, hash);
}
