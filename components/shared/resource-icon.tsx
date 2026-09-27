'use client';

import {
  FileText,
  Image as ImageIcon,
  File,
  Presentation,
  BookMarked,
  ScrollText,
  PencilLine,
  Beaker,
  FlaskConical,
  Lightbulb,
  FolderOpen,
} from 'lucide-react';
import type { ResourceType } from '@/types/database';
import { cn } from '@/lib/utils';

const iconMap: Record<ResourceType, typeof FileText> = {
  lecture_notes: FileText,
  slides: Presentation,
  textbook: BookMarked,
  past_paper: ScrollText,
  assignment: PencilLine,
  practical: Beaker,
  lab_manual: FlaskConical,
  handwritten_notes: PencilLine,
  image: ImageIcon,
  reference: Lightbulb,
  other: FolderOpen,
};

interface ResourceIconProps {
  type: ResourceType;
  mimeType?: string | null;
  size?: number;
  className?: string;
}

export function ResourceIcon({ type, mimeType, size = 20, className }: ResourceIconProps) {
  let Icon = iconMap[type] || File;
  if (mimeType?.startsWith('image/')) Icon = ImageIcon;
  if (mimeType === 'application/pdf') Icon = FileText;

  return <Icon className={cn('shrink-0', className)} size={size} />;
}
