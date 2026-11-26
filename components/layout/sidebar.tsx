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
  Pill,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Study & Flashcards', href: '/study', icon: Brain },
  { label: 'Quizzes', href: '/quizzes', icon: HelpCircle },
  { label: 'AI Tutor', href: '/study', icon: FileText },
  { label: 'Saved Notes', href: '/notes', icon: StickyNote },
  { label: 'Uploads', href: '/library', icon: Library },
];

export const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5);

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const name = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student') as string;
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className={cn('hidden lg:flex flex-col shrink-0 border-r border-border bg-card h-screen sticky top-0 transition-[width] duration-200', collapsed ? 'w-[76px]' : 'w-64')}>
      <div className={cn('flex items-center px-5 py-5 border-b border-border', collapsed ? 'justify-center' : 'gap-2.5')}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
          <Pill className="w-5 h-5" />
        </div>
        {!collapsed && <div>
          <h1 className="font-bold text-base leading-none">PharmaHub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pharmacy Learning Hub</p>
        </div>}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        <button type="button" onClick={() => setCollapsed((value) => !value)} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /><span>Collapse</span></>}
        </button>
        <Link href="/settings" className={cn('flex items-center rounded-lg px-2 py-2 hover:bg-secondary', collapsed ? 'justify-center' : 'gap-3')}>
          <Avatar className="w-9 h-9"><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback></Avatar>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p></div>}
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
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
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[60px] transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
