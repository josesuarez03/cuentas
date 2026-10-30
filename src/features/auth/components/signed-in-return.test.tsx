// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SignedInReturn } from './signed-in-return';

const fetch = vi.fn();
const close = vi.fn();
const replace = vi.fn();
const H = 'k'.repeat(43);

function at(search: string) {
  vi.stubGlobal('location', { ...window.location, search, replace });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('close', close);
  at('');
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it('con código: lo vincula a esta sesión y pide tocar ✕ para volver a la PWA, sin cargar la app aquí', async () => {
  at(`?h=${H}`);
  fetch.mockResolvedValue(new Response(null, { status: 204 }));
  render(<SignedInReturn />);
  expect(await screen.findByText('Has entrado. Toca ✕ arriba para volver a Kuadrix.')).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith('/api/entrar/vincular', expect.objectContaining({ method: 'POST', body: JSON.stringify({ h: H }) }));
  expect(screen.getByRole('link', { name: 'Seguir aquí' }).getAttribute('href')).toBe('/');
  expect(close).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
});

it('mientras vincula, muestra que está en ello', () => {
  at(`?h=${H}`);
  fetch.mockReturnValue(new Promise(() => {}));
  render(<SignedInReturn />);
  expect(screen.getByText('Has entrado. Un momento…')).toBeTruthy();
});

it('si no se puede vincular, pide cerrar y volver a entrar', async () => {
  at(`?h=${H}`);
  fetch.mockResolvedValue(new Response('{}', { status: 401 }));
  render(<SignedInReturn />);
  expect(await screen.findByText('No se ha podido volver a la app. Cierra esta ventana y vuelve a entrar.')).toBeTruthy();
});

it('sin código (navegador normal): no llama al servidor y pide tocar ✕', async () => {
  render(<SignedInReturn />);
  expect(await screen.findByText('Has entrado. Toca ✕ arriba para volver a Kuadrix.')).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
