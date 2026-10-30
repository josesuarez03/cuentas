import type { TodoItem } from '@/features/home/domain/todo';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { HomeCard } from './home-card';

export function TodoCard({ items, onConfirm }: { items: TodoItem[]; onConfirm: (entryId: string) => void }) {
  return (
    <HomeCard labelId="inicio-por-hacer" title={<>Por hacer <span className="font-normal text-ink-muted">· {items.length}</span></>}>
      <ul>
        {items.map((t, i) => (
          <li key={t.entryId} className={cn('flex min-h-15 items-center gap-3', i > 0 && 'border-t border-line')}>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-[22px] text-aviso">{t.title}</span>
              <span className="block text-[13px] leading-[18px] text-ink-muted">{t.note}</span>
            </span>
            <Button
              variant="ghost"
              className="min-h-11 px-2 text-[15px] font-semibold text-tinta hover:text-tinta"
              aria-label={t.actionLabel}
              onClick={() => onConfirm(t.entryId)}
            >
              Confirmar
            </Button>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
