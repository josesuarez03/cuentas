// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { wealthKey } from '@/features/wealth/domain/types';
import { monthKey, useMonthMutation } from './use-month';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/features/month/server/actions', () => ({ confirmIncomeAction: vi.fn(), updateEntryAmountAction: vi.fn() }));

describe('useMonthMutation', () => {
  it('al terminar invalida también el patrimonio', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useMonthMutation('2026-10', async (_: string) => ({ ok: true }) as never, (v) => v), { wrapper });
    result.current.mutate('x');
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: monthKey('2026-10') }));
    expect(spy).toHaveBeenCalledWith({ queryKey: wealthKey });
  });
});
