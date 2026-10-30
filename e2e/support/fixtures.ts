import { readFileSync } from 'node:fs';

export const ANA = 'e2e/.auth/ana.json';
// Sesión propia de Ana para la prueba de cerrar sesión: al cerrarla no se invalida ANA.
export const ANA_SALIR = 'e2e/.auth/ana-salir.json';
export const NUEVO = 'e2e/.auth/nuevo.json';

export function readE2eData(): { ym: string; nominaEntryId: string } {
  return JSON.parse(readFileSync('e2e/.auth/data.json', 'utf8'));
}
