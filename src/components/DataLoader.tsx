import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataLoaderProps {
  isLoading: boolean;
  error: unknown;
  children: React.ReactNode;
  skeleton?: "table" | "cards" | "detail" | "dashboard";
  retry?: () => void;
}

const TableSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex gap-4 items-center p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 hidden md:block" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
    ))}
  </div>
);

const CardsSkeleton = () => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i}>
        <Skeleton className="h-48 w-full rounded-t-lg" />
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}><CardContent className="p-5 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </CardContent></Card>
      ))}
    </div>
    <Card><CardContent className="p-5 space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-[200px] w-full" />
    </CardContent></Card>
  </div>
);

const DetailSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-[300px] w-full rounded-xl" />
    <div className="space-y-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  </div>
);

const skeletonMap = {
  table: TableSkeleton,
  cards: CardsSkeleton,
  dashboard: DashboardSkeleton,
  detail: DetailSkeleton,
};

export const DataLoader = ({ isLoading, error, children, skeleton = "table", retry }: DataLoaderProps) => {
  if (isLoading) {
    const SkeletonComponent = skeletonMap[skeleton];
    return <SkeletonComponent />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive/50" />
          <h3 className="text-lg font-bold mb-1">Failed to load data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {(error as { message?: string })?.message || "Please check your connection and try again."}
          </p>
          {retry && (
            <Button variant="outline" onClick={retry}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

export default DataLoader;
