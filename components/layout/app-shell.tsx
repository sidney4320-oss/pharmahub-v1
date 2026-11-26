'use client';

import { ReactNode } from 'react';
import { Sidebar, BottomNav } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Toaster } from '@/components/ui/sonner';

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-7 lg:pb-7 animate-fade-in">
          {children}
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
