// La global-setup hace TRUNCATE: solo contra el Postgres de e2e/compose.yml (localhost:5543/kuadrix_e2e).
export function assertLocalE2eDatabase(databaseUrl: string | undefined): void {
  let url: URL | null = null;
  try { url = new URL(databaseUrl ?? ''); } catch { url = null; }
  const isLocal =
    url !== null &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
    url.port === '5543' &&
    url.pathname === '/kuadrix_e2e';
  if (!isLocal) {
    throw new Error('Las E2E solo corren contra el Postgres local (pnpm e2e:db).');
  }
}
