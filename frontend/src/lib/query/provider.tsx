/**
 * Query Provider Component
 * 
 * Provides TanStack Query context to the React component tree.
 * 
 * WHAT IS THIS?
 * TanStack Query uses React Context to share query state across components.
 * This file creates a QueryClient and wraps the app with the provider.
 * 
 * LEARNING OBJECTIVES:
 * 1. Understanding QueryClient configuration
 * 2. Setting up global defaults for all queries
 * 3. Configuring retry behavior and caching strategies
 * 4. Understanding devtools integration
 * 
 * QUERY CLIENT CONFIGURATION:
 * The QueryClient is the core of TanStack Query. It manages:
 * - The cache (what data is stored and for how long)
 * - Background refetching (when to update stale data)
 * - Retries (what to do when requests fail)
 * - Garbage collection (when to remove unused data)
 * 
 * @module query/provider
 * @see {@link https://tanstack.com/query/latest/docs/framework/react/reference/QueryClient} QueryClient API
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

/**
 * Props for the QueryProvider component.
 */
interface QueryProviderProps {
  /** Child components that will have access to TanStack Query */
  children: ReactNode;
}

/**
 * QueryProvider wraps the application with TanStack Query context.
 * 
 * This component should be placed near the root of your component tree,
 * typically in app/layout.tsx. It creates a QueryClient instance that
 * persists for the lifetime of the user's session.
 * 
 * WHY USE useState?
 * We use useState to create the QueryClient so it only gets created once.
 * Creating it outside the component would share it between requests in SSR,
 * which could leak data between users.
 * 
 * @param props - Component props
 * @returns JSX.Element with QueryClientProvider wrapper
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <QueryProvider>
 *           {children}
 *         </QueryProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function QueryProvider({ children }: QueryProviderProps) {
  /**
   * Create QueryClient with default options.
   * 
   * We create this inside useState so:
   * 1. It's created once per component instance
   * 2. It survives re-renders
   * 3. It's not recreated on every render
   * 
   * NEVER create QueryClient outside a component in Next.js - this causes
   * data leakage between requests in server-side rendering.
   */
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Stale time determines how long data is considered fresh.
         * 
         * During this period, cached data is returned immediately without
         * a network request. After this period, the data is "stale" and
         * a background refetch is triggered.
         * 
         * 30 seconds is appropriate for this app because:
         * - Inventory changes frequently (reservations affect stock)
         * - But not so frequently that we need real-time updates
         * - Users won't notice 30-second staleness in this use case
         */
        staleTime: 1000 * 30, // 30 seconds
        
        /**
         * Retry configuration for failed queries.
         * 
         * This function determines whether to retry a failed query and
         * how many times. We customize it to:
         * - Not retry on 4xx errors (client errors - won't succeed on retry)
         * - Retry up to 3 times on other errors (network issues, 5xx)
         * 
         * @param failureCount - Number of failed attempts so far
         * @param error - The error that was thrown
         * @returns Whether to retry (boolean)
         */
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          // These indicate bad requests that won't succeed on retry
          if (error instanceof Error && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for network errors and 5xx
          return failureCount < 3;
        },
        
        /**
         * Refetch on window focus.
         * 
         * When true, data is refetched when the user returns to the app
         * after switching tabs or minimizing the window.
         * 
         * We enable this in production to ensure data is fresh when
         * users return to the app. In development, it's disabled to
         * prevent excessive requests during debugging.
         */
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        
        /**
         * Placeholder data behavior.
         * 
         * When a query has no cached data, we can show previous data
         * while fetching new data. This provides a smoother UX.
         * 
         * The function receives previousData and returns it to show
         * stale data while loading fresh data.
         */
        placeholderData: (previousData: unknown) => previousData,
      },
      mutations: {
        /**
         * Retry configuration for mutations.
         * 
         * Mutations (POST, PUT, DELETE) are less safe to retry than
         * queries because they modify server state. We retry only once
         * and only for network errors.
         */
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 
        React Query Devtools
        
        This provides a UI for debugging TanStack Query in development.
        Features include:
        - Viewing the cache contents
        - Seeing query states (loading, error, success)
        - Manually refetching or invalidating queries
        - Viewing query history
        
        It's automatically disabled in production builds.
      */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
