import { LoginButton } from '@/features/auth/components/login-button';

const LEDGER_ROWS = [
  { op: '+', label: 'Ingresos' },
  { op: '−', label: 'Gastos' },
  { op: '−', label: 'Bolsas y huchas' },
] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh justify-center bg-paper px-4 pt-16 pb-10 sm:items-center sm:px-6 sm:py-10">
      <div className="mt-auto flex w-full max-w-sm flex-col gap-8 sm:mt-0">
        <header>
          <h1 className="text-[40px] leading-[44px] font-semibold tracking-[-0.03em] text-ink">Kuadrix</h1>
          <div aria-hidden className="mt-2 h-1 w-full border-y border-ink" />
          <p className="mt-3 text-base text-ink-muted">Que el mes te cuadre.</p>
        </header>

        <div aria-hidden="true" className="rounded-lg border border-line bg-surface px-4 py-3 text-[15px] tabular-nums">
          {LEDGER_ROWS.map((row) => (
            <div key={row.label} className="flex items-baseline gap-3 py-1">
              <span className="w-4 text-ink-muted">{row.op}</span>
              <span className="flex-1 text-ink">{row.label}</span>
              <span className="text-ink-muted">…</span>
            </div>
          ))}
          <div className="mt-1 border-t border-line pt-2">
            <div className="flex items-baseline gap-3 py-1 font-medium">
              <span className="w-4 text-ink-muted">=</span>
              <span className="flex-1 text-ink">Disponible para ahorrar</span>
              <span className="text-ink-muted">…</span>
            </div>
            <div className="mt-0.5 h-1 border-y border-ink" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-lg border border-alerta/30 px-3 py-2.5 text-[15px] text-alerta">
              Este email no tiene acceso. Entra con la cuenta de Google autorizada.
            </p>
          )}
          <LoginButton />
          <p className="text-center text-[13px] text-ink-muted">Solo para cuentas autorizadas.</p>
        </div>
      </div>
    </main>
  );
}
