'use client';

import type { AnyFieldApi } from '@tanstack/react-form';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

export function FieldError({ field }: { field: AnyFieldApi }) {
  const [first] = field.state.meta.errors;
  return first ? <p role="alert" className="text-[13px] text-alerta">{String(first)}</p> : null;
}

export function TextField({ field, label, inputMode }: { field: AnyFieldApi; label: string; inputMode?: 'decimal' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        className="min-h-11"
        inputMode={inputMode}
        value={field.state.value as string}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={field.state.meta.errors.length > 0}
      />
      <FieldError field={field} />
    </div>
  );
}

export function SelectField({ field, label, options, emptyText }: {
  field: AnyFieldApi;
  label: string;
  options: { value: string; label: string }[];
  emptyText: string;
}) {
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={field.name}>{label}</Label>
        <div
          id={field.name}
          role="textbox"
          aria-readonly="true"
          aria-disabled="true"
          aria-describedby={`${field.name}-help`}
          className="flex min-h-11 w-full items-center rounded-sm border border-line bg-surface-sunk px-3 text-[15px] text-ink-muted"
        >
          {emptyText}
        </div>
        <p id={`${field.name}-help`} className="text-[13px] text-ink-muted">Podrás crearlas en Ajustes.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Select
        value={field.state.value as string}
        onValueChange={(value) => field.handleChange(value)}
        onOpenChange={(open) => {
          if (!open) field.handleBlur();
        }}
      >
        <SelectTrigger
          id={field.name}
          className="min-h-11 w-full rounded-sm border-line bg-surface px-3 text-[15px] text-ink data-placeholder:text-ink-muted"
          aria-invalid={field.state.meta.errors.length > 0}
        >
          <SelectValue placeholder="Elige…" />
        </SelectTrigger>
        <SelectContent className="bg-surface text-ink">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-[15px]">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError field={field} />
    </div>
  );
}
