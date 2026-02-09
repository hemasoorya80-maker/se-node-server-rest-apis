'use client';

/**
 * @fileoverview Home Page - Dashboard with System Health Monitoring
 * 
 * This is the landing page of the application, showcasing:
 * - Real-time API health monitoring using TanStack Query
 * - Glassmorphism UI design patterns
 * - Polling for live data updates
 * - Navigation to core features (Items, Reservations)
 * 
 * @example
 * // Access this page at the root route:
 * // http://localhost:3000/
 * 
 * // The health check automatically polls every 30 seconds
 * // to show real-time system status
 * 
 * @see {@link https://tanstack.com/query/latest/docs/react/overview} TanStack Query
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts} Next.js App Router
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Package, 
  List, 
  ArrowRight, 
  Server,
  Database,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { checkHealth } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { cn } from '@/lib/utils';

/**
 * HomePage Component
 * 
 * The main dashboard component that displays:
 * 1. System health status with live polling
 * 2. Quick navigation to browse items
 * 3. Quick navigation to user reservations
 * 4. Feature highlights
 * 
 * @returns {JSX.Element} The rendered home page
 * 
 * @example
 * // This component is automatically rendered at the root route
 * // No props required - it manages its own data fetching
 */
export default function HomePage() {
  /**
   * Health Check Query - useQuery Pattern
   * 
   * useQuery is the primary hook for fetching data in TanStack Query.
   * It handles caching, background refetching, and loading/error states.
   * 
   * Key concepts demonstrated:
   * - queryKey: Unique identifier for this query's cache. Using the centralized
   *   queryKeys object ensures consistency across the app.
   * - queryFn: The async function that fetches data (checkHealth API call)
   * - refetchInterval: Automatic polling every 30 seconds for real-time updates
   * 
   * Destructured values:
   * - data: The fetched health data (undefined while loading)
   * - isLoading: True during initial fetch (useful for skeleton loaders)
   * - isError: True if the query encountered an error
   * - refetch: Manual function to retry the query (used in "Retry Connection" button)
   * 
   * @see {@link https://tanstack.com/query/latest/docs/react/guides/queries} Queries Guide
   */
  const { data: health, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.health,  // ['health'] - centralized in lib/query.ts
    queryFn: checkHealth,        // API function from lib/api.ts
    refetchInterval: 30000,      // Poll every 30 seconds for live status
  });

  // Derive health status from the API response
  const isHealthy = health?.status === 'healthy';

  // Feature highlights displayed at the bottom of the page
  const features = [
    { icon: Shield, title: 'Idempotency', desc: 'Safe retry mechanisms' },
    { icon: Zap, title: 'Real-time', desc: 'Live stock updates' },
    { icon: Clock, title: 'Auto-expire', desc: '10-min reservations' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 
        Hero Section
        
        This section uses Tailwind CSS for:
        - Responsive typography (text-4xl on mobile, text-5xl on sm screens)
        - Centered content with max-width constraints
        - Gradient text effect using the custom gradient-text class
      */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Production Ready
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="gradient-text">Reservation</span> System
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          A modern inventory management platform with real-time stock tracking, 
          secure reservations, and seamless user experience.
        </p>
      </div>

      {/* 
        Status Card - Conditional Rendering Pattern
        
        This card demonstrates three UI states based on the query status:
        1. Loading state (isLoading): Shows spinner while fetching
        2. Error state (isError || !isHealthy): Shows error message with retry button
        3. Success state: Shows health details with latency metrics
        
        The border color dynamically changes based on health status using cn() utility
      */}
      <Card className={cn(
        "glass overflow-hidden transition-all duration-500",
        isHealthy ? "border-green-500/30" : isError ? "border-red-500/30" : "border-yellow-500/30"
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Dynamic icon background based on status */}
              <div className={cn(
                "p-3 rounded-xl transition-colors duration-300",
                isHealthy ? "bg-green-500/10" : isError ? "bg-red-500/10" : "bg-yellow-500/10"
              )}>
                <Server className={cn(
                  "h-6 w-6",
                  isHealthy ? "text-green-600" : isError ? "text-red-600" : "text-yellow-600"
                )} />
              </div>
              <div>
                <CardTitle className="text-xl">System Status</CardTitle>
                <CardDescription>
                  Backend API health monitoring
                </CardDescription>
              </div>
            </div>
            {/* Status badge changes color based on health state */}
            <Badge 
              variant={isHealthy ? "default" : "destructive"}
              className={cn(
                "px-3 py-1 text-xs font-medium uppercase tracking-wider",
                isHealthy && "bg-green-500/20 text-green-700 hover:bg-green-500/30 dark:bg-green-500/20 dark:text-green-400"
              )}
            >
              {isLoading ? 'Checking...' : isHealthy ? 'Operational' : 'Issues Detected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* 
            State 1: Loading
            Shows an animated spinner while the health check is in progress
          */}
          {isLoading ? (
            <div className="flex items-center gap-4 py-4">
              <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="text-gray-500">Verifying API connectivity...</span>
            </div>
          ) : isError || !isHealthy ? (
            /* 
              State 2: Error
              Displays error details and provides a retry button
              The refetch() function triggers a manual re-fetch of the health data
            */
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-200">
                    API Connection Failed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">
                    Unable to reach the backend server. Please ensure it&apos;s running on port 3000.
                  </p>
                </div>
              </div>
              {/* Manual refetch - demonstrates how to programmatically trigger a query */}
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <Server className="h-4 w-4" />
                Retry Connection
              </Button>
            </div>
          ) : (
            /* 
              State 3: Success
              Shows detailed health metrics including database latency
            */
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="font-medium">All systems operational</span>
                <span className="text-xs text-gray-500 ml-auto">
                  Updated {new Date().toLocaleTimeString()}
                </span>
              </div>
              
              {/* Display detailed checks if available from the API */}
              {health?.checks && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-subtle">
                    <Database className="h-5 w-5 text-violet-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Database</p>
                      <p className="text-xs text-gray-500">
                        {health.checks.database.latency}ms latency
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-subtle">
                    <Zap className="h-5 w-5 text-violet-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Cache</p>
                      <p className="text-xs text-gray-500">Memory store active</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 
        Quick Actions Grid
        
        Two navigation cards demonstrating Next.js Link component:
        - Link prefetches routes for instant navigation
        - group-hover classes enable child animations on parent hover
        - Glassmorphism effect with backdrop-blur
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Navigate to Items List */}
        <Link href="/items">
          <Card className="glass card-hover h-full cursor-pointer group">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Package className="h-8 w-8 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Browse Items</h3>
                    <p className="text-gray-500 mt-1">
                      View inventory and make reservations
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-500 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Navigate to User Reservations */}
        <Link href="/users/demo-user/reservations">
          <Card className="glass card-hover h-full cursor-pointer group">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-secondary/50 to-accent/30 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <List className="h-8 w-8 text-gray-900" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">My Reservations</h3>
                    <p className="text-gray-500 mt-1">
                      Manage your active reservations
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-gray-500 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Features Grid - mapped from array */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {features.map((feature, idx) => (
          <div 
            key={feature.title}
            className="glass-subtle p-6 rounded-2xl text-center space-y-3"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="inline-flex p-3 rounded-xl bg-violet-500/10 mx-auto">
              <feature.icon className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="font-semibold">{feature.title}</p>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Help Section with Getting Started info */}
      <Separator className="opacity-50" />
      <div className="glass-subtle rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-violet-500/10 shrink-0">
            <AlertCircle className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Getting Started</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              This demo uses <code className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-mono">demo-user</code> as the default user ID. 
              Browse items, make reservations, and confirm or cancel them from your reservations page. 
              Reservations automatically expire after 10 minutes if not confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
