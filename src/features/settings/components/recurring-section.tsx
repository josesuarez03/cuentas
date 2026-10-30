'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { createContext, useContext, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SaveError } from '@/features/month/hooks/use-month';
import { SAVE_ERROR } from '@/features/month/save-error';
import { filterRecurringByName, recurringFrequencyNote, recurringNote, sortRecurringByName } from '@/features/settings/domain/recurring-view';
import type { SettingsRecurring, SettingsView } from '@/features/settings/domain/types';
import { useSettingsAction } from '@/features/settings/hooks/use-settings';
import { setRecurringActiveAction } from '@/features/settings/server/templates-actions';
import { formatEuros } from '@/lib/money';
import { cn } from '@/lib/utils';
import { DESKTOP_QUERY, useMediaQuery } from '@/shared/hooks/use-media-query';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { RecurringFormDialog } from './recurring-form-dialog';
import { SettingsSection } from './settings-section';

const EditContext = createContext<(item: SettingsRecurring) => void>(() => {});

function signedAmount(r: SettingsRecurring): string {
  return formatEuros(r.kind === 'income' ? r.amountCents : -r.amountCents, { sign: true });
}

function ActiveSwitch({ item }: { item: SettingsRecurring }) {
  const mutation = useSettingsAction((active: boolean) => setRecurringActiveAction(item.id, active));
  return (
    <span className="inline-flex min-h-11 min-w-11 items-center justify-center">
      <Switch
        aria-label={`Activa: ${item.name}`}
        checked={item.active}
        disabled={mutation.isPending}
        className="after:-inset-y-3.5"
        onCheckedChange={(active) => mutation.mutate(active, {
          onError: (error) => toast.error(error instanceof SaveError ? error.message : SAVE_ERROR),
        })}
      />
    </span>
  );
}

function EditButton({ item }: { item: SettingsRecurring }) {
  const onEdit = useContext(EditContext);
  return (
    <Button variant="ghost" className="min-h-11 text-[15px]" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}>
      Editar
    </Button>
  );
}

function NameCell({ item }: { item: SettingsRecurring }) {
  return (
    <div className="min-w-0">
      <p className={cn('truncate text-[15px]', item.active ? 'text-ink' : 'text-ink-muted')}>{item.name}</p>
      <p className="truncate text-[13px] text-ink-muted">{item.active ? item.categoryLabel : `${item.categoryLabel} · Desactivada`}</p>
    </div>
  );
}

function AmountText({ item }: { item: SettingsRecurring }) {
  return (
    <span className={cn('text-[15px] whitespace-nowrap tabular-nums', !item.active ? 'text-ink-muted' : item.kind === 'income' ? 'text-positivo' : 'text-ink')}>
      {signedAmount(item)}
    </span>
  );
}

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, SettingsRecurring>();
const columns = helper.columns([
  helper.display({ id: 'name', header: 'Partida', cell: ({ row }) => <NameCell item={row.original} /> }),
  helper.display({
    id: 'frequency',
    header: 'Frecuencia',
    cell: ({ row }) => <span className="text-[15px] text-ink-muted">{recurringFrequencyNote(row.original)}</span>,
  }),
  helper.display({
    id: 'accountName',
    header: 'Cuenta',
    cell: ({ row }) => <span className="text-[15px] text-ink-muted">{row.original.accountName}</span>,
  }),
  helper.display({ id: 'amountCents', header: 'Importe', cell: ({ row }) => <AmountText item={row.original} /> }),
  helper.display({ id: 'active', header: 'Activo', cell: ({ row }) => <ActiveSwitch item={row.original} /> }),
  helper.display({ id: 'edit', header: () => <span className="sr-only">Editar</span>, cell: ({ row }) => <EditButton item={row.original} /> }),
]);

const EMPTY: SettingsRecurring[] = [];

export function RecurringSection({ settings }: { settings: SettingsView }) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [editing, setEditing] = useState<SettingsRecurring | 'new' | null>(null);
  const [query, setQuery] = useState('');
  const all = settings.recurring ?? EMPTY;
  const sorted = useMemo(() => sortRecurringByName(all), [all]);
  const visible = useMemo(() => filterRecurringByName(sorted, query), [sorted, query]);
  const table = useTable({ features, columns, data: visible });
  const rows = table.getRowModel().rows;

  return (
    <SettingsSection
      id="ajustes-recurrentes"
      title="Recurrentes"
      description="Los cambios de importe valen ya para este mes; las altas y bajas, desde el mes que viene."
      action={<Button variant="outline" className="min-h-11 text-[15px]" onClick={() => setEditing('new')}>Añadir partida</Button>}
    >
      <EditContext.Provider value={setEditing}>
        {all.length === 0 && <p className="py-3 text-[15px] text-ink-muted">Sin partidas recurrentes todavía.</p>}
        {all.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-3 pb-1">
            <Label htmlFor="recurrentes-buscar" className="sr-only">Buscar partida</Label>
            <Input
              id="recurrentes-buscar"
              type="search"
              placeholder="Buscar…"
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-11 text-[15px]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
            />
          </div>
        )}
        {all.length > 0 && rows.length === 0 && (
          <p role="status" className="py-3 text-[15px] text-ink-muted">Ninguna partida coincide con «{query.trim()}».</p>
        )}
        {rows.length > 0 && desktop && (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn('h-11 text-[13px] font-medium text-ink-muted', header.column.id === 'amountCents' && 'text-right')}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="min-h-14">
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cn('py-1', cell.column.id === 'amountCents' && 'text-right')}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > 0 && !desktop && (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const item = row.original;
              return (
                <li key={row.id} className="flex min-h-14 flex-col justify-center gap-0.5 py-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={cn('min-w-0 truncate text-[15px]', item.active ? 'text-ink' : 'text-ink-muted')}>{item.name}</p>
                    <AmountText item={item} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-ink-muted">
                      {recurringNote(item)}{item.active ? '' : ' · Desactivada'}
                    </p>
                    <ActiveSwitch item={item} />
                    <EditButton item={item} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </EditContext.Provider>
      <RecurringFormDialog
        open={editing !== null}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        item={editing === 'new' || editing === null ? null : editing}
        settings={settings}
      />
    </SettingsSection>
  );
}
