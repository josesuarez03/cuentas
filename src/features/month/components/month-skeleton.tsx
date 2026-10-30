import { Skeleton } from '@/shared/components/ui/skeleton';

export function MonthSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando el mes" className="flex flex-col gap-3 px-4 py-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-md bg-surface-sunk motion-reduce:animate-none" />
      ))}
    </div>
  );
}
