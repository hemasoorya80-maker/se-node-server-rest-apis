'use client';

/**
 * Layout Shell
 * 
 * Provides consistent layout structure across all pages:
 * - Top navigation with links
 * - Main content container
 * - Footer with helpful links
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, List, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ShellProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Items', href: '/items', icon: Package },
  { name: 'Reservations', href: '/users/demo-user/reservations', icon: List },
];

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <span className="font-semibold text-slate-900 text-lg">
                Reservation App
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden sm:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile menu indicator */}
            <div className="sm:hidden text-sm text-slate-500">
              Menu
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden border-t border-slate-200">
          <div className="flex justify-around py-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'text-slate-900'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              Reservation System Demo • Built with Next.js 16 & shadcn/ui
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900 transition-colors">
                Status
              </Link>
              <Separator orientation="vertical" className="h-4" />
              <Link href="/items" className="hover:text-slate-900 transition-colors">
                Items
              </Link>
              <Separator orientation="vertical" className="h-4" />
              <Link href="/users/demo-user/reservations" className="hover:text-slate-900 transition-colors">
                Reservations
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
