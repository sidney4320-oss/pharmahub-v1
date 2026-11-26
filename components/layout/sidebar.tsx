'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Library,
  FileText,
  Brain,
  HelpCircle,
  CalendarClock,
  StickyNote,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Subjects', href: '/subjects', icon: BookOpen },
  { label: 'Library', href: '/library', icon: Library },
  { label: 'Topics', href: '/topics', icon: FileText },
  { label: 'Study', href: '/study', icon: Brain },
  { label: 'PharmaHub AI', href: '/ai', icon: Sparkles },
  { label: 'Quizzes', href: '/quizzes', icon: HelpCircle },
  { label: 'Exams', href: '/exams', icon: CalendarClock },
  { label: 'Notes', href: '/notes', icon: StickyNote },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const MOBILE_NAV_ITEMS = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  NAV_ITEMS[4],
  NAV_ITEMS[5],
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center px-5 py-4 border-b border-border">
        <Image src="/brand/pharmahub-wordmark-light.svg" alt="PharmaHub AI" width={220} height={56} className="h-12 w-auto dark:hidden" priority />
        <Image src="/brand/pharmahub-wordmark-dark.svg" alt="PharmaHub AI" width={220} height={56} className="hidden h-12 w-auto dark:block" priority />
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-[11px] text-muted-foreground">A focused space for your studies.</p>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'text-primary' : 'hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate text-[10px] font-medium">{item.label === 'PharmaHub AI' ? 'AI' : item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
