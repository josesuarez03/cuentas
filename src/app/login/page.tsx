import { LoginButton } from '@/features/auth/components/login-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-[22px] leading-7 font-semibold tracking-[-0.01em]">Cuentas</h1>
          </CardTitle>
          <CardDescription className="text-[15px] text-ink-muted">Tu mes, como una cuenta.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error && (
            <p role="alert" className="text-[15px] text-alerta">
              Este email no tiene acceso. Entra con la cuenta de Google autorizada.
            </p>
          )}
          <LoginButton />
        </CardContent>
      </Card>
    </main>
  );
}
