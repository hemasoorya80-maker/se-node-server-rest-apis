/**
 * Empty State Component Module
 *
 * This module provides a friendly empty state component for when
 * there's no data to display, with contextual messaging and actions.
 *
 * Learning Objectives:
 * - TypeScript: Discriminated union types for configuration
 * - React: Component composition with icons
 * - UX: Empty state design patterns
 * - Tailwind: Consistent spacing with the spacing scale
 *
 * @module components/ui-blocks/empty-state
 * @see {@link https://lucide.dev/icons/} Lucide Icons
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating} Next.js Link
 */

'use client';

import { Package, CalendarX, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Empty State Type
 *
 * Discriminated union type that determines:
 * - Which icon to show
 * - What title and description to display
 * - The context of the empty state
 */
type EmptyStateType = 'items' | 'reservations' | 'search';

/**
 * EmptyState Props Interface
 */
interface EmptyStateProps {
  /** The type of empty state determines icon and messaging */
  type: EmptyStateType;
  /** Optional call-to-action button configuration */
  action?: {
    /** Button label text */
    label: string;
    /** Destination URL for the button */
    href: string;
  };
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Empty State Configuration
 *
 * Maps each empty state type to its visual and textual elements.
 * Using a configuration object separates content from presentation logic.
 *
 * Benefits:
 * - Easy to add new empty state types
 * - Content changes don't require component modifications
 * - Icons are imported once and referenced here
 * - TypeScript ensures all types are handled
 */
const config: Record<EmptyStateType, {
  /** Lucide icon component for visual context */
  icon: typeof Package;
  /** Main heading text */
  title: string;
  /** Explanatory paragraph text */
  description: string;
}> = {
  items: {
    icon: Package,
    title: 'No items available',
    description: 'The inventory is currently empty. Check back later for new items.',
  },
  reservations: {
    icon: CalendarX,
    title: 'No reservations yet',
    description: 'You haven\'t made any reservations. Browse items to get started.',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'We couldn\'t find what you\'re looking for. Try adjusting your search.',
  },
};

/**
 * Empty State Component
 *
 * Displays a friendly message when there's no data to show.
 * Includes contextual icon, title, description, and optional CTA button.
 *
 * UX Best Practices Implemented:
 * - Explain why the state is empty (not just "no data")
 * - Provide helpful next steps
 * - Use appropriate icons for visual context
 * - Maintain consistent styling with the rest of the app
 *
 * @example
 * ```tsx
 * // Simple empty state
 * <EmptyState type="items" />
 *
 * // With call-to-action
 * <EmptyState
 *   type="reservations"
 *   action={{ label: 'Browse Items', href: '/items' }}
 * />
 *
 * // Search results empty state
 * <EmptyState type="search" />
 * ```
 *
 * @param props - Component props
 * @returns React element
 */
export function EmptyState({ type, action, className }: EmptyStateProps) {
  // Destructure the appropriate config for this empty state type
  // TypeScript ensures 'type' is a valid key of config
  const { icon: Icon, title, description } = config[type];

  return (
    <div className={cn(
      // Glass-morphism styling consistent with app design
      "glass rounded-2xl p-12 text-center",
      className
    )}>
      <div className="max-w-md mx-auto">
        {/* Icon Container - larger size for visual prominence */}
        <div className="inline-flex p-5 rounded-2xl bg-violet-500/10 mb-6">
          <Icon className="h-10 w-10 text-violet-600" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-gray-500 mb-8 leading-relaxed">
          {description}
        </p>

        {/* Optional Call-to-Action Button */}
        {action && (
          <Button asChild className="rounded-xl">
            {/* asChild prop allows Button to render as Link while keeping Button styles */}
            <Link href={action.href} className="gap-2">
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
