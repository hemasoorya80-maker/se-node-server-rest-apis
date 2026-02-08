'use client';

/**
 * Home Page
 * 
 * Displays API health status and quick navigation links.
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Package, List, ArrowRight, Server } from 'lucide-react';
import { checkHealth } from '@/lib/api';
import { queryKeys } from '@/lib/query';

export default function HomePage() {
  const { data: health, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.health,
    queryFn: checkHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome to the Reservation System
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            API Status
          </CardTitle>
          <CardDescription>
            Current status of the backend API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3 text-slate-500">
              <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
              <span>Checking API status...</span>
            </div>
          ) : isError || !isHealthy ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>API Offline</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>The backend API is currently unavailable.</p>
                <p className="text-sm">
                  Make sure the backend server is running on port 3000.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-semibold text-slate-900">API Online</p>
                  <p className="text-sm text-slate-500">
                    Last checked: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              {health?.checks && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Database</span>
                    <Badge variant={health.checks.database.status === 'healthy' ? 'default' : 'destructive'}>
                      {health.checks.database.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">Cache</span>
                    <Badge variant={health.checks.cache.status === 'healthy' ? 'default' : 'destructive'}>
                      {health.checks.cache.status}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/items">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <Package className="h-6 w-6 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Browse Items</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        View available inventory and make reservations
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/users/demo-user/reservations">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-3 rounded-lg">
                      <List className="h-6 w-6 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">My Reservations</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        View and manage your reservations
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <Separator />
      <div className="bg-slate-50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-slate-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-slate-900">Getting Started</h3>
            <p className="text-sm text-slate-600 mt-1">
              This demo uses <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">demo-user</code> as the default user ID. 
              You can browse items, make reservations, and confirm or cancel them from the reservations page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
