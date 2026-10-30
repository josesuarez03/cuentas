export function EmptyState({ title, as: Heading = 'h2', children, action }: {
  title: string;
  as?: 'h1' | 'h2';
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 py-8">
      <Heading className="text-xl leading-[26px] font-semibold text-ink">{title}</Heading>
      <p className="max-w-prose text-[15px] leading-[22px] text-ink-muted">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
