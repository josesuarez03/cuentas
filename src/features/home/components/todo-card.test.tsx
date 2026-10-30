// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodoCard } from './todo-card';

afterEach(cleanup);

describe('TodoCard', () => {
  it('muestra cada ingreso pendiente y lo confirma', async () => {
    const onConfirm = vi.fn();
    render(
      <TodoCard
        items={[{ entryId: 'e1', title: 'Nómina pendiente', note: 'Previsto: +1.870,00 €', actionLabel: 'Confirmar Nómina' }]}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole('region', { name: 'Por hacer · 1' })).toBeTruthy();
    expect(screen.getByText('Nómina pendiente')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Nómina' }));
    expect(onConfirm).toHaveBeenCalledWith('e1');
  });
});
