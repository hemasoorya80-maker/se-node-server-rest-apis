'use client';

/**
 * Empty State
 * 
 * Glass-morphism styled empty state messages.
 */

import { Package, CalendarX, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'items' | 'reservations' | 'search';
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

const config = {
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

export function EmptyState({ type, action, className }: EmptyStateProps) {
  const { icon: Icon, title, description } = config[type];

  return (
    <div className={cn(
      "glass rounded-2xl p-12 text-center",
      className
    )}>
      <div className="max-w-md mx-auto">
        <div className="inline-flex p-5 rounded-2xl bg-primary/10 mb-6">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {description}
        </p>
        {action && (
          <Button asChild className="rounded-xl">
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
