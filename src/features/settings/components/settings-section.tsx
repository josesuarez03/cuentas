export function SettingsSection({ id, title, description, action, children }: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="text-[17px] leading-6 font-semibold text-ink">{title}</h2>
          {description && <p className="text-[13px] leading-[18px] text-ink-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-lg border border-line bg-surface px-4">{children}</div>
    </section>
  );
}
