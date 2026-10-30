// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/inicio' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

import { AppNav } from './app-nav';

afterEach(cleanup);

describe('AppNav', () => {
  it('enlaza las cuatro secciones en orden', () => {
    render(<AppNav />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Inicio', 'Mes', 'Patrimonio', 'Ajustes']);
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/inicio', '/mes', '/patrimonio', '/ajustes']);
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeTruthy();
  });

  it('marca solo la sección actual, también en subrutas', () => {
    nav.pathname = '/mes/2026-10';
    render(<AppNav />);
    expect(screen.getByRole('link', { name: 'Mes' }).getAttribute('aria-current')).toBe('page');
    for (const name of ['Inicio', 'Patrimonio', 'Ajustes']) {
      expect(screen.getByRole('link', { name }).hasAttribute('aria-current')).toBe(false);
    }
  });
});
