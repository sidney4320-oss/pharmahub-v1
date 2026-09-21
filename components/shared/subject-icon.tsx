'use client';

import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectIconProps {
  icon: string | null;
  color: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function SubjectIcon({ icon, color, size = 'md', className }: SubjectIconProps) {
  const iconName = (icon || 'BookOpen') as keyof typeof LucideIcons;
  const IconComponent = (LucideIcons[iconName] || LucideIcons.BookOpen) as LucideIcons.LucideIcon;
  const bgColor = color || '#0d9488';

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl shrink-0',
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: `${bgColor}18`, color: bgColor }}
    >
      <IconComponent className="shrink-0" size={iconSizeMap[size]} />
    </div>
  );
}
