/**
 * Loading Skeleton Component Module
 *
 * This module provides skeleton loading components that mimic the layout
 * of actual content while data is being fetched.
 *
 * Learning Objectives:
 * - UX: Skeleton screens vs spinners - perceived performance
 * - React: Creating multiple related components in one module
 * - Tailwind: Using animate-pulse for loading effects
 * - CSS Grid: Responsive grid layouts
 *
 * Why Skeletons?
 * Skeleton screens reduce perceived loading time by showing the user
 * the structure of content before it arrives. This is less jarring
 * than a blank page or spinner because it sets expectations about
 * what content will appear.
 *
 * @module components/ui-blocks/loading-skeleton
 * @see {@link https://tailwindcss.com/docs/animation#pulse} Tailwind pulse animation
 * @see {@link https://www.nngroup.com/articles/skeleton-screens/} Nielsen Norman Group on skeleton screens
 */

'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Items Skeleton Props
 */
interface ItemsSkeletonProps {
  /** Number of item cards to render (default: 4) */
  count?: number;
}

/**
 * Items Skeleton Component
 *
 * Skeleton placeholder for the items grid.
 * Mimics the layout of ItemCard components.
 *
 * Layout Structure (per card):
 * - Icon placeholder (12x12 rounded square)
 * - Badge placeholder (20x6 rounded pill)
 * - Title placeholder (75% width, 5px height)
 * - Subtitle placeholder (50% width, 3px height)
 * - Button placeholder (full width, 9px height)
 *
 * @example
 * ```tsx
 * // Default 4 skeleton cards
 * {isLoading && <ItemsSkeleton />}
 *
 * // Custom count
 * {isLoading && <ItemsSkeleton count={8} />}
 * ```
 *
 * @param props - Component props
 * @returns React element with grid of skeleton cards
 */
export function ItemsSkeleton({ count = 4 }: ItemsSkeletonProps) {
  return (
    // Responsive grid matching the actual items grid layout
    // grid-cols-1: mobile (stacked)
    // sm:grid-cols-2: small screens (2 columns)
    // lg:grid-cols-3: large screens (3 columns)
    // xl:grid-cols-4: extra large (4 columns)
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Create array of specified length and map to skeleton cards */}
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              {/* Icon placeholder */}
              <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
              {/* Status badge placeholder */}
              <div className="w-20 h-6 rounded-full bg-gray-200 animate-pulse" />
            </div>
            {/* Title placeholder */}
            <div className="w-3/4 h-5 rounded bg-gray-200 animate-pulse mt-4" />
            {/* Subtitle placeholder - slightly dimmed for hierarchy */}
            <div className="w-1/2 h-3 rounded bg-gray-200/50 animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            {/* Button placeholder */}
            <div className="w-full h-9 rounded-lg bg-gray-200 animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Reservations Skeleton Props
 */
interface ReservationsSkeletonProps {
  /** Number of table rows to render (default: 5) */
  count?: number;
}

/**
 * Reservations Skeleton Component
 *
 * Skeleton placeholder for the reservations table view.
 * Mimics the layout of the reservations table with header and rows.
 *
 * @example
 * ```tsx
 * {isLoading && <ReservationsSkeleton />}
 * ```
 *
 * @param props - Component props
 * @returns React element with skeleton table
 */
export function ReservationsSkeleton({ count = 5 }: ReservationsSkeletonProps) {
  return (
    <div className="space-y-6">
      <Card className="glass overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Header section with icon and title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                <div className="w-40 h-6 rounded bg-gray-200 animate-pulse" />
                <div className="w-32 h-4 rounded bg-gray-200/50 animate-pulse mt-2" />
              </div>
            </div>
            {/* Status badge placeholder */}
            <div className="w-10 h-6 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Table Header Row */}
            <div className="flex gap-4 pb-2 border-b border-gray-200/50">
              <div className="w-32 h-4 rounded bg-gray-200/50 animate-pulse" />
              <div className="w-24 h-4 rounded bg-gray-200/50 animate-pulse" />
              <div className="w-16 h-4 rounded bg-gray-200/50 animate-pulse" />
              <div className="w-20 h-4 rounded bg-gray-200/50 animate-pulse" />
              <div className="w-24 h-4 rounded bg-gray-200/50 animate-pulse" />
              {/* ml-auto pushes action column to the right */}
              <div className="w-20 h-4 rounded bg-gray-200/50 animate-pulse ml-auto" />
            </div>

            {/* Table Data Rows */}
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-3">
                {/* Item name */}
                <div className="w-28 h-4 rounded bg-gray-200 animate-pulse" />
                {/* Date */}
                <div className="w-20 h-4 rounded bg-gray-200 animate-pulse" />
                {/* Quantity (as icon placeholder) */}
                <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
                {/* Status badge */}
                <div className="w-20 h-6 rounded-full bg-gray-200 animate-pulse" />
                {/* Expiry */}
                <div className="w-24 h-4 rounded bg-gray-200 animate-pulse" />
                {/* Action buttons */}
                <div className="ml-auto flex gap-2">
                  <div className="w-20 h-8 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="w-20 h-8 rounded-lg bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Item Detail Skeleton Component
 *
 * Skeleton placeholder for the item detail page.
 * Mimics the two-column layout with item info and reservation form.
 *
 * Layout Structure:
 * - Back button placeholder
 * - Left column: Item info card
 * - Right column: Reservation form card
 *
 * @example
 * ```tsx
 * {isLoading && <ItemDetailSkeleton />}
 * ```
 *
 * @returns React element with skeleton detail page
 */
export function ItemDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button placeholder */}
      <div className="w-24 h-9 rounded-lg bg-gray-200 animate-pulse" />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Item Information */}
        <Card className="glass overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Large icon placeholder */}
                <div className="w-16 h-16 rounded-2xl bg-gray-200 animate-pulse" />
                <div>
                  {/* Item name */}
                  <div className="w-48 h-7 rounded bg-gray-200 animate-pulse" />
                  {/* Availability text */}
                  <div className="w-24 h-3 rounded bg-gray-200/50 animate-pulse mt-2" />
                </div>
              </div>
              {/* Stock badge */}
              <div className="w-24 h-7 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats grid (2 columns) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-200/50 animate-pulse h-20" />
              <div className="p-4 rounded-xl bg-gray-200/50 animate-pulse h-20" />
            </div>
            {/* Description lines */}
            <div className="space-y-3">
              <div className="w-full h-4 rounded bg-gray-200 animate-pulse" />
              <div className="w-3/4 h-4 rounded bg-gray-200 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Reservation Form */}
        <Card className="glass overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
              <div>
                {/* Form title */}
                <div className="w-40 h-6 rounded bg-gray-200 animate-pulse" />
                {/* Form subtitle */}
                <div className="w-32 h-4 rounded bg-gray-200/50 animate-pulse mt-2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quantity selector */}
            <div className="space-y-2">
              <div className="w-16 h-4 rounded bg-gray-200/50 animate-pulse" />
              <div className="w-full h-10 rounded-xl bg-gray-200 animate-pulse" />
            </div>
            {/* Date picker */}
            <div className="space-y-2">
              <div className="w-20 h-4 rounded bg-gray-200/50 animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
                <div className="w-24 h-10 rounded-xl bg-gray-200 animate-pulse" />
                <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
              </div>
            </div>
            {/* Submit button */}
            <div className="w-full h-12 rounded-xl bg-gray-200 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Health Skeleton Props
 */
interface HealthSkeletonProps {
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Health Check Skeleton Component
 *
 * Skeleton placeholder for the health status card.
 * Shows a spinning indicator alongside pulsing elements
 * to indicate an active health check in progress.
 *
 * @example
 * ```tsx
 * {isChecking && <HealthSkeleton />}
 * ```
 *
 * @param props - Component props
 * @returns React element with skeleton health card
 */
export function HealthSkeleton({ className }: HealthSkeletonProps) {
  return (
    <Card className={cn("glass overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          {/* Header with icon and title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse" />
            <div>
              <div className="w-32 h-6 rounded bg-gray-200 animate-pulse" />
              <div className="w-48 h-4 rounded bg-gray-200/50 animate-pulse mt-2" />
            </div>
          </div>
          {/* Status badge placeholder */}
          <div className="w-24 h-6 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Health check in progress indicator */}
        <div className="flex items-center gap-4 py-4">
          {/* Spinning border indicates active checking */}
          <div className="w-10 h-10 rounded-full border-2 border-muted animate-spin" />
          <div className="w-48 h-4 rounded bg-gray-200 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
