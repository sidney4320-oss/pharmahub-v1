'use client';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ProgressBadgeProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBadge({ value, className, showLabel = true }: ProgressBadgeProps) {
  const color =
    value >= 80 ? 'text-emerald-600' : value >= 40 ? 'text-blue-600' : 'text-muted-foreground';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress value={value} className="h-2 flex-1" />
      {showLabel && <span className={cn('text-xs font-medium tabular-nums', color)}>{value}%</span>}
    </div>
  );
}
