// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodoCard } from './todo-card';

const online = vi.hoisted(() => ({ useOnline: vi.fn(() => true) }));
vi.mock('@/shared/hooks/use-online', () => online);

afterEach(cleanup);

const income = (id: string, name: string, note: string) => ({
  key: `income:${id}`, kind: 'income' as const, targetId: id, title: `${name} pendiente`, note,
  actionText: 'Confirmar' as const, actionLabel: `Confirmar ${name}`, doneText: `${name} confirmada.`,
});

describe('TodoCard', () => {
  it('muestra cada ingreso pendiente y lo confirma', async () => {
    const onAction = vi.fn();
    render(
      <TodoCard
        items={[income('e1', 'Nómina', 'Previsto: +1.870,00 €')]}
        onAction={onAction}
      />,
    );
    expect(screen.getByRole('region', { name: 'Por hacer · 1' })).toBeTruthy();
    expect(screen.getByText('Nómina pendiente')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Nómina' }));
    expect(onAction).toHaveBeenCalledWith(income('e1', 'Nómina', 'Previsto: +1.870,00 €'));
  });

  it('mueve el foco al siguiente Confirmar y anuncia el resultado', async () => {
    const a = income('e1', 'Nómina', 'n');
    const b = income('e2', 'Alquiler', 'n');
    const onAction = vi.fn();
    const { rerender } = render(<TodoCard items={[a, b]} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Nómina' }));
    rerender(<TodoCard items={[b]} onAction={onAction} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmar Alquiler' }));
    expect(screen.getByRole('status').textContent).toBe('Nómina confirmada.');
  });

  it('con la lista vacía lleva el foco a Disponible y mantiene el aviso', async () => {
    const a = income('e1', 'Nómina', 'n');
    const h = document.createElement('h2');
    h.id = 'inicio-disponible';
    h.tabIndex = -1;
    document.body.appendChild(h);
    const { rerender } = render(<TodoCard items={[a]} onAction={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar Nómina' }));
    rerender(<TodoCard items={[]} onAction={vi.fn()} />);
    expect(document.activeElement).toBe(h);
    expect(screen.getByRole('status').textContent).toBe('Nómina confirmada.');
    h.remove();
  });

  it('Cobrado y Actualizar llaman a onAction con su elemento; Actualizar no anuncia nada', async () => {
    const loan = { key: 'loan:l1', kind: 'loan' as const, targetId: 'l1', title: 'Juan te debe 200,00 €', note: 'Desde septiembre', actionText: 'Cobrado' as const, actionLabel: 'Cobrado el préstamo de Juan', doneText: 'Préstamo de Juan cobrado.' };
    const bal = { key: 'balance:p', kind: 'balance' as const, targetId: 'p', title: 'Actualiza el saldo de BBVA principal', note: 'Último saldo: 12 sep', actionText: 'Actualizar' as const, actionLabel: 'Actualizar el saldo de BBVA principal', doneText: null };
    const onAction = vi.fn();
    render(<TodoCard items={[loan, bal]} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar el saldo de BBVA principal' }));
    expect(onAction).toHaveBeenLastCalledWith(bal);
    expect(screen.getByRole('status').textContent).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Cobrado el préstamo de Juan' }));
    expect(onAction).toHaveBeenLastCalledWith(loan);
    expect(screen.getByRole('status').textContent).toBe('Préstamo de Juan cobrado.');
  });

  it('sin conexión, las acciones están desactivadas', () => {
    online.useOnline.mockReturnValue(false);
    render(<TodoCard items={[income('e1', 'Nómina', 'n')]} onAction={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Confirmar Nómina' }) as HTMLButtonElement).disabled).toBe(true);
    online.useOnline.mockReturnValue(true);
  });
});
