'use client';

import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { SelectField, TextField } from '@/features/month/components/form-fields';
import type { SettingsCategory } from '@/features/settings/domain/types';
import { useSettingsAction } from '@/features/settings/hooks/use-settings';
import { createCategoryAction, renameCategoryAction } from '@/features/settings/server/general-actions';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { SettingsSection } from './settings-section';

const NONE = 'none';
const KIND_LABEL = { expense: 'Gasto', income: 'Ingreso' } as const;

function CategoryForm({ category, categories, onDone }: {
  category: SettingsCategory | null;
  categories: SettingsCategory[];
  onDone: () => void;
}) {
  const create = useSettingsAction(createCategoryAction);
  const rename = useSettingsAction((name: string) => renameCategoryAction(category?.id ?? '', name));
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: category?.name ?? '', kind: 'expense' as 'expense' | 'income', parentId: NONE },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        if (category) await rename.mutateAsync(value.name.trim());
        else await create.mutateAsync({ name: value.name.trim(), kind: value.kind, parentId: value.parentId === NONE ? null : value.parentId });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha guardado.');
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name" validators={{ onSubmit: ({ value }) => (value.trim() ? undefined : 'Escribe un nombre.') }}>
        {(field) => <TextField field={field} label="Nombre" />}
      </form.Field>
      {!category && (
        <>
          <form.Field name="kind" listeners={{ onChange: () => form.setFieldValue('parentId', NONE) }}>
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label id="categoria-tipo">Tipo</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  aria-labelledby="categoria-tipo"
                  className="grid w-full grid-cols-2 gap-2"
                  value={field.state.value}
                  onValueChange={(v) => { if (v) field.handleChange(v as 'expense' | 'income'); }}
                >
                  {(['expense', 'income'] as const).map((k) => (
                    <ToggleGroupItem
                      key={k}
                      value={k}
                      className={cn(
                        'min-h-11 w-full rounded-sm text-[15px] font-medium data-[state=on]:bg-transparent',
                        field.state.value === k ? 'border-tinta text-tinta' : 'border-line text-ink',
                      )}
                    >
                      {KIND_LABEL[k]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          </form.Field>
          <form.Subscribe selector={(s) => s.values.kind}>
            {(kind) => (
              <form.Field name="parentId">
                {(field) => (
                  <SelectField
                    field={field}
                    label="Dentro de (opcional)"
                    emptyText="Sin categorías"
                    options={[
                      { value: NONE, label: 'Ninguna' },
                      ...categories.filter((c) => c.parentId === null && c.kind === kind).map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>
        </>
      )}
      {error && <p role="alert" className="text-[13px] text-alerta">{error}</p>}
      <Button type="submit" className="min-h-11" disabled={create.isPending || rename.isPending}>Guardar</Button>
    </form>
  );
}

export function CategoriesSection({ categories }: { categories: SettingsCategory[] }) {
  const [editing, setEditing] = useState<SettingsCategory | 'new' | null>(null);
  const parents = categories.filter((c) => c.parentId === null);

  const row = (c: SettingsCategory, nested: boolean) => (
    <li key={c.id} className={cn('flex min-h-11 items-center justify-between gap-3 py-1', nested && 'pl-4')}>
      <p className="min-w-0 truncate text-[15px] text-ink">
        {c.name} <span className="text-[13px] text-ink-muted">· {KIND_LABEL[c.kind]}</span>
      </p>
      <Button variant="ghost" className="min-h-11 text-[15px]" aria-label={`Editar ${c.name}`} onClick={() => setEditing(c)}>Editar</Button>
    </li>
  );

  return (
    <SettingsSection
      id="ajustes-categorias"
      title="Categorías"
      action={<Button variant="outline" className="min-h-11 text-[15px]" onClick={() => setEditing('new')}>Añadir categoría</Button>}
    >
      <ul className="divide-y divide-line">
        {parents.flatMap((p) => [row(p, false), ...categories.filter((c) => c.parentId === p.id).map((c) => row(c, true))])}
      </ul>
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Añadir categoría' : 'Editar categoría'}</DialogTitle>
            <DialogDescription className="sr-only">Datos de la categoría</DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <CategoryForm
              key={editing === 'new' ? 'new' : editing.id}
              category={editing === 'new' ? null : editing}
              categories={categories}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
