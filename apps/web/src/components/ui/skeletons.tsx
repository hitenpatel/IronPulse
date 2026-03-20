import { Skeleton } from "./skeleton";

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-6 w-12 rounded-pill" />
        <Skeleton className="h-6 w-12 rounded-pill" />
        <Skeleton className="h-6 w-12 rounded-pill" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <CardSkeleton />
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-6">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    </div>
  );
}
