import { Card } from '@/shared/components/ui/card';

export function HomeCard({ labelId, title, aside, children }: {
  labelId: string;
  title: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card role="region" aria-labelledby={labelId} className="gap-0 rounded-lg border border-line bg-surface px-4 py-1 text-base ring-0">
      <div className="flex min-h-11 items-center justify-between gap-3 pt-2">
        <h2 id={labelId} className="text-[15px] leading-[22px] font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}
