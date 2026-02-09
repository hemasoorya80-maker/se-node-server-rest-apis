/**
 * Layout Shell Component
 * 
 * Provides the main application layout structure including navigation,
 * header, and footer. This component wraps all pages and provides
 * consistent UI elements across the application.
 * 
 * LEARNING OBJECTIVES:
 * 1. Creating reusable layout components in Next.js
 * 2. Implementing responsive navigation patterns
 * 3. Using glass-morphism design trends
 * 4. Mobile-first responsive design
 * 
 * DESIGN PATTERNS:
 * - Sticky header with glass-morphism effect
 * - Responsive navigation (desktop nav vs mobile menu)
 * - Gradient backgrounds for visual depth
 * - Consistent spacing and typography
 * 
 * @module components/layout/shell
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, List, Home, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Props for the Shell component.
 */
interface ShellProps {
  /** Child content to render inside the layout */
  children: React.ReactNode;
}

/**
 * Navigation item configuration.
 * 
 * We define navigation centrally to make it easy to add/remove items
 * and keep desktop/mobile navigation in sync.
 */
const navigation = [
  { 
    name: 'Home', 
    href: '/', 
    icon: Home,
    description: 'Dashboard and system status'
  },
  { 
    name: 'Items', 
    href: '/items', 
    icon: Package,
    description: 'Browse available inventory'
  },
  { 
    name: 'Reservations', 
    href: '/users/demo-user/reservations', 
    icon: List,
    description: 'Manage your reservations'
  },
];

/**
 * Shell component provides the main application layout.
 * 
 * This component wraps all pages and provides:
 * - Top navigation header
 * - Mobile-responsive menu
 * - Footer with links
 * - Consistent page container
 * 
 * The layout uses a "glass-morphism" design with:
 * - Translucent backgrounds (bg-white/70)
 * - Backdrop blur effects (backdrop-blur-xl)
 * - Gradient backgrounds for depth
 * 
 * @param props - Component props
 * @returns JSX.Element with complete layout
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <Shell>
 *       {children}
 *     </Shell>
 *   );
 * }
 * ```
 */
export function Shell({ children }: ShellProps) {
  // State for mobile menu visibility
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get current pathname for active navigation highlighting
  const pathname = usePathname();

  return (
    // Full-height flex container with gradient background
    <div className="min-h-screen gradient-bg flex flex-col">
      
      {/* 
        HEADER
        
        Uses position: sticky to stay at the top while scrolling.
        The glass class provides the translucent, blurred effect.
      */}
      <header className="sticky top-0 z-50">
        <div className="glass-strong border-b-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              {/* 
                LOGO
                
                Combines an icon with text. The icon has a gradient background
                and scales slightly on hover for interactivity.
              */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="bg-gradient-to-br from-violet-500 to-blue-500 p-2.5 rounded-xl shadow-lg group-hover:shadow-violet-500/25 group-hover:scale-105 transition-all duration-300">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 text-lg leading-tight">
                    Reserve
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                    Inventory System
                  </span>
                </div>
              </Link>

              {/* 
                DESKTOP NAVIGATION
                
                Hidden on mobile (md:hidden), visible on desktop.
                Uses a pill-style container with individual nav items.
                
                Active state is determined by comparing the current
                pathname with the nav item's href.
              */}
              <nav className="hidden md:flex items-center gap-1 bg-gray-100/50 rounded-full p-1">
                {navigation.map((item) => {
                  // Check if this nav item is active
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        // Base styles
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                        // Active state: white background, shadow
                        isActive
                          ? 'bg-white text-gray-900 shadow-sm'
                          // Inactive state: transparent, hover effect
                          : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive && 'text-violet-600')} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* 
                MOBILE MENU BUTTON
                
                Visible only on mobile (md:hidden).
                Toggles the mobile menu overlay.
              */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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

        {/* 
          MOBILE NAVIGATION OVERLAY
          
          Conditionally rendered based on mobileMenuOpen state.
          Slides down from the header with animation.
          
          Uses the same navigation configuration as desktop,
          ensuring consistency.
        */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-strong border-t border-gray-200/50 animate-fade-in-up">
            <nav className="flex flex-col p-4 gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)} // Close menu on navigation
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-violet-500/10 text-violet-600'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive && 'text-violet-600')} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* 
        MAIN CONTENT AREA
        
        Uses flex-1 to take remaining vertical space.
        Content is centered with max-width and auto margins.
        
        The animate-fade-in-up class provides a subtle entrance
        animation when navigating between pages.
      */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>

      {/* 
        FOOTER
        
        Uses glass-morphism styling to match header.
        Contains copyright info and quick links.
      */}
      <footer className="mt-auto">
        <div className="glass border-t-0 border-x-0 border-b-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Brand */}
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-violet-500 to-blue-500 p-1.5 rounded-lg">
                  <Package className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-sm text-gray-500">
                  Reservation System • Next.js 16
                </p>
              </div>
              
              {/* Footer Links */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <Link href="/" className="hover:text-gray-900 transition-colors">
                  Status
                </Link>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <Link href="/items" className="hover:text-gray-900 transition-colors">
                  Items
                </Link>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <Link href="/users/demo-user/reservations" className="hover:text-gray-900 transition-colors">
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
