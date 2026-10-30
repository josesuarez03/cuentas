'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
] as const;

export function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Antes de montar no se conoce el tema guardado: sin valor para no desajustar la hidratación.
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? 'system') : undefined;

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Tema"
      className="grid w-full grid-cols-3 gap-2"
      value={current}
      onValueChange={(v) => { if (v) setTheme(v); }}
    >
      {OPTIONS.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className={cn(
            'min-h-11 w-full rounded-sm text-[15px] font-medium data-[state=on]:bg-transparent',
            current === o.value ? 'border-tinta text-tinta' : 'border-line text-ink',
          )}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
