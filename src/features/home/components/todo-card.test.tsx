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

  it('mueve el foco al siguiente Confirmar y anuncia el resultado', async () => {
    const a = { entryId: 'e1', title: 'Nómina pendiente', note: 'n', actionLabel: 'Confirmar Nómina' };
    const b = { entryId: 'e2', title: 'Alquiler pendiente', note: 'n', actionLabel: 'Confirmar Alquiler' };
    const onConfirm = vi.fn();
    const { rerender } = render(<TodoCard items={[a, b]} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Nómina' }));
    rerender(<TodoCard items={[b]} onConfirm={onConfirm} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmar Alquiler' }));
    expect(screen.getByRole('status').textContent).toBe('Nómina confirmada.');
  });

  it('con la lista vacía lleva el foco a Disponible y mantiene el aviso', async () => {
    const a = { entryId: 'e1', title: 'Nómina pendiente', note: 'n', actionLabel: 'Confirmar Nómina' };
    const h = document.createElement('h2');
    h.id = 'inicio-disponible';
    h.tabIndex = -1;
    document.body.appendChild(h);
    const { rerender } = render(<TodoCard items={[a]} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Nómina' }));
    rerender(<TodoCard items={[]} onConfirm={vi.fn()} />);
    expect(document.activeElement).toBe(h);
    expect(screen.getByRole('status').textContent).toBe('Nómina confirmada.');
    h.remove();
  });
});
