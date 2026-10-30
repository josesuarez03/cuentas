'use client';

import { useEffect, useRef, useState } from 'react';
import type { TodoItem } from '@/features/home/domain/todo';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { HomeCard } from './home-card';

export function TodoCard({ items, onConfirm }: { items: TodoItem[]; onConfirm: (entryId: string) => void }) {
  const [announcement, setAnnouncement] = useState('');
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pending = useRef<{ gone: string; next: string | null } | null>(null);

  useEffect(() => {
    const p = pending.current;
    if (!p || items.some((t) => t.entryId === p.gone)) return;
    pending.current = null;
    const target = p.next ? buttons.current.get(p.next) : null;
    (target ?? document.getElementById('inicio-disponible'))?.focus();
  }, [items]);

  function confirm(t: TodoItem, i: number) {
    pending.current = { gone: t.entryId, next: (items[i + 1] ?? items[i - 1])?.entryId ?? null };
    setAnnouncement(`${t.actionLabel.replace(/^Confirmar /, '')} confirmada.`);
    onConfirm(t.entryId);
  }

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
      {items.length > 0 && (
        <HomeCard labelId="inicio-por-hacer" title={<>Por hacer <span className="font-normal text-ink-muted">· {items.length}</span></>}>
          <ul>
            {items.map((t, i) => (
              <li key={t.entryId} className={cn('flex min-h-15 items-center gap-3', i > 0 && 'border-t border-line')}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] leading-[22px] text-aviso">{t.title}</span>
                  <span className="block text-[13px] leading-[18px] text-ink-muted">{t.note}</span>
                </span>
                <Button
                  ref={(el) => {
                    if (el) buttons.current.set(t.entryId, el);
                    else buttons.current.delete(t.entryId);
                  }}
                  variant="ghost"
                  className="min-h-11 px-2 text-[15px] font-semibold text-tinta hover:text-tinta"
                  aria-label={t.actionLabel}
                  onClick={() => confirm(t, i)}
                >
                  Confirmar
                </Button>
              </li>
            ))}
          </ul>
        </HomeCard>
      )}
    </>
  );
}
