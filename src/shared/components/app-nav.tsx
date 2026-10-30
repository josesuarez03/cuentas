'use client';

import { CalendarDays, House, Landmark, Settings, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/mes', label: 'Mes', icon: CalendarDays },
  { href: '/patrimonio', label: 'Patrimonio', icon: Landmark },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** < md: barra inferior fija. ≥ md: raíl lateral fijo de 240 px. Un solo <nav> en el DOM. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-40 h-(--app-nav-h) border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:h-auto md:w-60 md:border-t-0 md:border-r md:px-3 md:py-6"
    >
      <div className="hidden px-3 pb-6 md:block">
        <span className="text-[22px] leading-7 font-semibold tracking-[-0.02em] text-ink">Kuadrix</span>
        <div aria-hidden className="mt-1.5 h-1 border-y border-ink" />
      </div>
      <ul className="grid h-15 grid-cols-4 md:flex md:h-auto md:flex-col md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="h-full md:h-auto">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-xs md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-md md:px-3 md:text-[15px]',
                  active ? 'font-semibold text-tinta md:bg-surface-sunk' : 'font-normal text-ink-muted hover:text-ink md:hover:bg-surface-sunk',
                )}
              >
                <Icon aria-hidden className="size-6 md:size-5" strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
