// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmountEditor } from './amount-editor';

afterEach(cleanup);

describe('AmountEditor', () => {
  it('muestra el importe con signo y al tocarlo deja editar', async () => {
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Editar importe de Luz' });
    expect(button.textContent).toBe('−52,00 €');
    await userEvent.click(button);
    expect((screen.getByRole('textbox', { name: 'Importe de Luz' }) as HTMLInputElement).value).toBe('52,00');
  });

  it('Intro guarda en céntimos', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '55,5{Enter}');
    expect(onSave).toHaveBeenCalledWith(5550);
  });

  it('Intro guarda una vez y no vuelve a abrir el editor', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '55,5{Enter}');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Editar importe de Luz' }));
  });

  it('Intro seguido de blur guarda una sola vez', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '55,5' } });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.blur(input);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('Esc cancela sin guardar', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), '9{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Editar importe de Luz' })).toBeTruthy();
  });

  it('Esc devuelve el foco al botón del importe', async () => {
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), '{Escape}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Editar importe de Luz' }));
  });

  it('un importe inválido muestra el error y no guarda', async () => {
    const onSave = vi.fn();
    render(<AmountEditor cents={5200} label="Luz" sign={-1} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, 'abc{Enter}');
    expect(screen.getByRole('alert').textContent).toBe('Escribe un importe, por ejemplo 52,00');
    expect(onSave).not.toHaveBeenCalled();
  });
});
