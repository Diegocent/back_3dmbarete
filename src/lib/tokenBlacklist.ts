/**
 * Lista negra de tokens invalidados (logout / rotación).
 * En memoria: al cerrar sesión o rotar tokens se añaden aquí.
 */

const blacklist = new Set<string>();

export function invalidarToken(token: string): void {
  if (token?.trim()) {
    blacklist.add(token.trim());
  }
}

export function tokenInvalidado(token: string): boolean {
  return token?.trim() ? blacklist.has(token.trim()) : false;
}
