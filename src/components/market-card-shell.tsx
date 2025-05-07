import type React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface MarketCardShellProps {
  title: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const MarketCardShell: React.FC<MarketCardShellProps> = ({
  title,
  icon: Icon,
  isLoading,
  children,
  className,
  contentClassName,
}) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium text-primary">{title}</CardTitle>
        {Icon && <Icon className="h-5 w-5 text-accent" />}
      </CardHeader>
      <CardContent className={contentClassName}>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-16 mt-1" />
              </div>
            ))}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};

export default MarketCardShell;
