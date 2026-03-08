import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from "lucide-react";
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

function getErrorInfo(error: unknown) {
  const err = error as { message?: string; status?: number; code?: string } | null;
  const status = err?.status || 0;
  const code = err?.code || '';
  const message = err?.message || 'Something went wrong';

  if (code === 'NETWORK_ERROR' || status === 0) {
    return {
      icon: WifiOff,
      title: 'Server Unreachable',
      description: message,
      hint: 'The backend API server may be offline or your network is disconnected.',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    };
  }
  if (status === 401 || status === 403) {
    return {
      icon: ShieldAlert,
      title: status === 401 ? 'Authentication Required' : 'Access Denied',
      description: message,
      hint: status === 401 ? 'Your session may have expired. Please log in again.' : 'You don\'t have permission to access this resource.',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    };
  }
  if (status >= 500) {
    return {
      icon: ServerCrash,
      title: `Server Error (${status})`,
      description: message,
      hint: 'The server encountered an internal error. Please try again later or contact support.',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    };
  }
  if (status === 404) {
    return {
      icon: AlertCircle,
      title: 'Not Found (404)',
      description: message,
      hint: 'The requested resource or API endpoint does not exist.',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    };
  }
  return {
    icon: AlertCircle,
    title: status ? `Error (${status})` : 'Failed to load data',
    description: message,
    hint: null,
    color: 'text-destructive/60',
    bgColor: 'bg-destructive/10',
  };
}

export const DataLoader = ({ isLoading, error, children, skeleton = "table", retry }: DataLoaderProps) => {
  if (isLoading) {
    const SkeletonComponent = skeletonMap[skeleton];
    return <SkeletonComponent />;
  }

  if (error) {
    const info = getErrorInfo(error);
    const Icon = info.icon;
    return (
      <Card className="border-dashed border-2 border-border/60 bg-muted/20">
        <CardContent className="py-12 text-center">
          <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${info.bgColor} flex items-center justify-center`}>
            <Icon className={`w-7 h-7 ${info.color}`} />
          </div>
          <h3 className="text-lg font-bold mb-1">{info.title}</h3>
          <p className="text-sm text-muted-foreground mb-1 max-w-md mx-auto">
            {info.description}
          </p>
          {info.hint && (
            <p className="text-xs text-muted-foreground/70 mb-4 max-w-sm mx-auto">
              {info.hint}
            </p>
          )}
          {!info.hint && <div className="mb-4" />}
          {retry && (
            <Button variant="outline" onClick={retry} className="gap-1.5 rounded-xl">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

export default DataLoader;
