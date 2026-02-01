'use client';

import { usePathname } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/Sidebar';

const pageTitles: Record<string, string> = {
  '/tests': 'Tests',
  '/questions': 'Questions',
  '/candidates': 'Candidates',
  '/reports': 'Reports',
  '/users': 'Users',
  '/settings': 'Settings',
};

export function SiteHeader() {
  const pathname = usePathname();

  // Find the matching page title
  const title = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  )?.[1] || 'Dashboard';

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  );
}
