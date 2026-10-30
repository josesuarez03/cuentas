'use client';

import { signOf, type CategoryGroup, type MonthView, type PocketView } from '@/features/month/domain/month-view';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Progress } from '@/shared/components/ui/progress';
import { AmountEditor } from './amount-editor';

const listFormat = new Intl.ListFormat('es', { type: 'conjunction' });

function Summary({ title, note, noteTone = 'muted', amount }: {
  title: string; note: string; noteTone?: 'muted' | 'aviso' | 'alerta'; amount: number;
}) {
  return (
    <AccordionTrigger className="min-h-14 items-center gap-2 rounded-none py-0 text-base font-normal text-ink hover:no-underline **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-[18px] **:data-[slot=accordion-trigger-icon]:text-ink-muted">
      <span className="flex-1 text-base leading-[22px]">
        {title}
        <span className={cn('block text-[13px] leading-[18px]', {
          'text-ink-muted': noteTone === 'muted', 'text-aviso': noteTone === 'aviso', 'text-alerta': noteTone === 'alerta',
        })}>{note}</span>
      </span>
      <span className={cn('text-base font-semibold', amount > 0 && 'text-positivo')}>{formatEuros(amount, { sign: true })}</span>
    </AccordionTrigger>
  );
}

function categoryNote(c: CategoryGroup): { note: string; tone: 'muted' | 'aviso' } {
  const pending = c.entries.filter((e) => e.status === 'pending');
  if (pending.length > 0) return { note: `${pending.map((e) => e.name).join(', ')} pendiente`, tone: 'aviso' };
  if (c.entries.length === 1) return { note: c.entries[0].note, tone: 'muted' };
  return { note: `${c.entries.length} partidas`, tone: 'muted' };
}

function PocketRow({ pocket }: { pocket: PocketView }) {
  const over = pocket.spentCents > pocket.limitCents;
  const pct = pocket.limitCents > 0 ? Math.min(100, Math.round((pocket.spentCents * 100) / pocket.limitCents)) : 100;
  const rest = pocket.limitCents - pocket.spentCents;
  return (
    <div className="flex flex-col gap-1.5 border-t border-line py-2.5 pl-7">
      <div className="flex justify-between text-[15px]">
        <span>{pocket.name}</span>
        <span className="font-medium">
          {formatEuros(pocket.spentCents)} <span className="font-normal text-ink-muted">de {formatEuros(pocket.limitCents)}</span>
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`Gastado en ${pocket.name}`}
        className={cn(
          'h-1.5 bg-surface-sunk',
          over ? '*:data-[slot=progress-indicator]:bg-alerta' : '*:data-[slot=progress-indicator]:bg-ink',
        )}
      />
      <span className={cn('text-[13px]', over ? 'text-alerta' : 'text-ink-muted')}>
        {over ? `Te has pasado ${formatEuros(-rest)}` : `Te quedan ${formatEuros(rest)}`}
      </span>
    </div>
  );
}

export function CategoryList({ view, onAmountChange }: {
  view: MonthView;
  onAmountChange: (entryId: string, amountCents: number) => void;
}) {
  const editable = view.status === 'open';
  const pocketsLeft = view.pockets.reduce((acc, p) => acc + p.limitCents - p.spentCents, 0);

  return (
    <Accordion type="multiple" className="flex flex-col">
      {view.categories.map((c) => {
        const { note, tone } = categoryNote(c);
        return (
          <AccordionItem key={c.id} value={`category-${c.id}`} className="border-b border-line">
            <Summary title={c.name} note={note} noteTone={tone} amount={c.totalCents} />
            <AccordionContent className="pb-0">
              {c.entries.map((e) => (
                <div key={e.id} className="flex min-h-12 items-center gap-2 border-t border-line py-1 pl-7">
                  <span className="flex-1 text-[15px] leading-[22px]">
                    {e.name}
                    <span className={cn('block text-[13px] leading-[18px]', e.status === 'pending' ? 'text-aviso' : 'text-ink-muted')}>{e.note}</span>
                  </span>
                  {editable ? (
                    <AmountEditor cents={e.amountCents} label={e.name} sign={signOf(e.kind)} onSave={(cents) => onAmountChange(e.id, cents)} />
                  ) : (
                    <span className="text-[15px] font-medium">{formatEuros(signOf(e.kind) * e.amountCents, { sign: true })}</span>
                  )}
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        );
      })}

      {view.pockets.length > 0 && (
        <AccordionItem value="pockets" className="border-b border-line">
          <Summary
            title={listFormat.format(view.pockets.map((p) => p.name))}
            note={pocketsLeft < 0 ? `Te has pasado ${formatEuros(-pocketsLeft)}` : `Te quedan ${formatEuros(pocketsLeft)}`}
            noteTone={pocketsLeft < 0 ? 'alerta' : 'muted'}
            amount={-view.calc.pocketsCents}
          />
          <AccordionContent className="pb-0">
            {view.pockets.map((p) => <PocketRow key={p.id} pocket={p} />)}
          </AccordionContent>
        </AccordionItem>
      )}

      {view.funds.map((f) => (
        <AccordionItem key={f.id} value={`fund-${f.id}`} className="border-b border-line">
          <Summary title={f.name} note={`Hucha: ${formatEuros(f.balanceCents)}`} amount={-f.allocatedCents} />
          <AccordionContent className="pb-0">
            <p className="border-t border-line py-3 pl-7 text-[15px]">Este mes apartas {formatEuros(f.allocatedCents)}.</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
