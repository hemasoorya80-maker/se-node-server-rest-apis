'use client';

/**
 * Empty State
 * 
 * Friendly message when no data is available.
 */

import { Package, Search, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
    description: 'There are no items in the inventory at the moment.',
  },
  reservations: {
    icon: CalendarX,
    title: 'No reservations found',
    description: 'You haven\'t made any reservations yet.',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'We couldn\'t find what you\'re looking for.',
  },
};

export function EmptyState({ type, action, className }: EmptyStateProps) {
  const { icon: Icon, title, description } = config[type];

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="bg-slate-100 p-4 rounded-full mb-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        {title}
      </h3>
      <p className="text-slate-500 max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
