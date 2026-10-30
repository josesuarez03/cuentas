import { Skeleton } from '@/shared/components/ui/skeleton';

const block = 'bg-surface-sunk motion-reduce:animate-none';

export function HomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando el inicio" className="flex flex-col gap-4">
      <Skeleton className={`h-[50px] w-2/3 rounded-md ${block}`} />
      <Skeleton className={`h-20 rounded-md ${block}`} />
      <Skeleton className={`h-12 rounded-md ${block}`} />
      <Skeleton className={`h-32 rounded-lg ${block}`} />
    </div>
  );
}
