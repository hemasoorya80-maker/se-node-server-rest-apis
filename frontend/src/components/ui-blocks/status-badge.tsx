/**
 * Status Badge Component Module
 *
 * This module provides a reusable status badge component for displaying
 * reservation statuses with consistent styling and visual feedback.
 *
 * Learning Objectives:
 * - TypeScript: Record types for configuration objects
 * - React: Functional components with typed props
 * - Tailwind: Glass-morphism styling with opacity modifiers
 * - Component design: Configuration-driven UI patterns
 *
 * @module components/ui-blocks/status-badge
 * @see {@link https://react.dev/learn/thinking-in-react} React component patterns
 * @see {@link https://www.typescriptlang.org/docs/handbook/utility-types.html} TypeScript utility types
 */

'use client';

import { Badge } from '@/components/ui/badge';
import type { ReservationStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Status Configuration Record
 *
 * Maps each reservation status to its visual representation.
 * Using a Record type ensures we handle all possible statuses.
 *
 * Why this pattern?
 * - Single source of truth for status styling
 * - Easy to add/modify statuses without touching component logic
 * - Type-safe: TypeScript ensures all ReservationStatus values are covered
 * - Separates data (what) from presentation (how)
 */
const statusConfig: Record<ReservationStatus, {
  /** Human-readable label for the status */
  label: string;
  /** Badge variant from shadcn/ui */
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Tailwind classes for glass-morphism effect per status */
  className: string;
}> = {
  reserved: {
    label: 'Reserved',
    variant: 'default',
    // Amber colors for "pending/waiting" state
    // Using opacity modifiers (e.g., bg-amber-500/20) for glass effect
    className: 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 border-amber-500/30',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'secondary',
    // Green colors for "success/active" state
    className: 'bg-green-500/20 text-green-700 hover:bg-green-500/30 border-green-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'outline',
    // Slate/gray for "inactive/cancelled" state
    className: 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-500/20',
  },
  expired: {
    label: 'Expired',
    variant: 'destructive',
    // Red colors for "error/expired" state
    className: 'bg-red-500/20 text-red-700 hover:bg-red-500/30 border-red-500/30',
  },
};

/**
 * StatusBadge Props Interface
 *
 * Defines the contract for the StatusBadge component.
 * Using TypeScript interfaces provides:
 * - Compile-time type checking
 * - IDE autocompletion
 * - Self-documenting props
 */
interface StatusBadgeProps {
  /** The reservation status to display */
  status: ReservationStatus;
  /** Optional additional CSS classes for customization */
  className?: string;
}

/**
 * Status Badge Component
 *
 * Displays a reservation status with appropriate colors and styling.
 * Uses a configuration-driven approach for maintainability.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StatusBadge status="confirmed" />
 *
 * // With custom className
 * <StatusBadge status="reserved" className="text-lg" />
 *
 * // In a list
 * {reservations.map(r => (
 *   <div key={r.id}>
 *     <span>{r.itemName}</span>
 *     <StatusBadge status={r.status} />
 *   </div>
 * ))}
 * ```
 *
 * @param props - Component props (destructured for readability)
 * @returns React element with styled badge
 *
 * @see {@link https://ui.shadcn.com/docs/components/badge} shadcn/ui Badge
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Lookup configuration for the given status
  // This is O(1) and type-safe since statusConfig covers all ReservationStatus values
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        // Base styles applied to all badges
        'font-medium border',
        // Status-specific styles from configuration
        config.className,
        // Allow consumer to override/add styles
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
