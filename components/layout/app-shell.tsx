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
        <main className="flex-1 px-4 lg:px-6 py-6 pb-24 lg:pb-6 animate-fade-in">
          {children}
        </main>
      </div>
      <BottomNav />
      <Toaster />
    </div>
  );
}
