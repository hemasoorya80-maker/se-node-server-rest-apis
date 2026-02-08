'use client';

/**
 * Layout Shell
 * 
 * Modern glassmorphism navigation with responsive design.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, List, Home, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Glass Navigation Header */}
      <header className="sticky top-0 z-50">
        <div className="glass-strong border-b-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="bg-gradient-to-br from-primary to-accent p-2.5 rounded-xl shadow-lg group-hover:shadow-primary/25 group-hover:scale-105 transition-all duration-300">
                  <Package className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-lg leading-tight">
                    Reserve
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Inventory System
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1 bg-muted/50 rounded-full p-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-strong border-t border-border/50 animate-fade-in-up">
            <nav className="flex flex-col p-4 gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>

      {/* Glass Footer */}
      <footer className="mt-auto">
        <div className="glass border-t-0 border-x-0 border-b-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-primary to-accent p-1.5 rounded-lg">
                  <Package className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Reservation System • Next.js 16
                </p>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">
                  Status
                </Link>
                <span className="w-1 h-1 rounded-full bg-border" />
                <Link href="/items" className="hover:text-foreground transition-colors">
                  Items
                </Link>
                <span className="w-1 h-1 rounded-full bg-border" />
                <Link href="/users/demo-user/reservations" className="hover:text-foreground transition-colors">
                  Reservations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
