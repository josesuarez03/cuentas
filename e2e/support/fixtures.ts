import { readFileSync } from 'node:fs';

export const ANA = 'e2e/.auth/ana.json';
export const NUEVO = 'e2e/.auth/nuevo.json';

export function readE2eData(): { ym: string; nominaEntryId: string } {
  return JSON.parse(readFileSync('e2e/.auth/data.json', 'utf8'));
}
