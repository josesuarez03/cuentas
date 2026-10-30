// @vitest-environment jsdom
import { onlineManager, useMutation } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Providers } from './providers';

vi.mock('@/shared/components/ui/sonner', () => ({ Toaster: () => null }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
});

function Probe({ onError }: { onError: (e: Error) => void }) {
  const m = useMutation({ mutationFn: async () => { throw new Error('sin conexión'); }, onError });
  return <button onClick={() => m.mutate()}>go</button>;
}

describe('Providers', () => {
  it('las mutaciones fallan (y no se pausan) sin conexión', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    onlineManager.setOnline(false);
    const onError = vi.fn();
    const { getByText } = render(<Providers><Probe onError={onError} /></Providers>);
    getByText('go').click();
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });
});
