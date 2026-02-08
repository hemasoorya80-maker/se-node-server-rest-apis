'use client';

/**
 * Home Page
 * 
 * Modern dashboard with glass cards and health monitoring.
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

export default function HomePage() {
  const { data: health, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.health,
    queryFn: checkHealth,
    refetchInterval: 30000,
  });

  const isHealthy = health?.status === 'healthy';

  const features = [
    { icon: Shield, title: 'Idempotency', desc: 'Safe retry mechanisms' },
    { icon: Zap, title: 'Real-time', desc: 'Live stock updates' },
    { icon: Clock, title: 'Auto-expire', desc: '10-min reservations' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Production Ready
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="gradient-text">Reservation</span> System
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A modern inventory management platform with real-time stock tracking, 
          secure reservations, and seamless user experience.
        </p>
      </div>

      {/* Status Card */}
      <Card className={cn(
        "glass overflow-hidden transition-all duration-500",
        isHealthy ? "border-green-500/30" : isError ? "border-red-500/30" : "border-yellow-500/30"
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
          {isLoading ? (
            <div className="flex items-center gap-4 py-4">
              <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="text-muted-foreground">Verifying API connectivity...</span>
            </div>
          ) : isError || !isHealthy ? (
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
              <Button variant="outline" onClick={() => refetch()} className="gap-2">
                <Server className="h-4 w-4" />
                Retry Connection
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="font-medium">All systems operational</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  Updated {new Date().toLocaleTimeString()}
                </span>
              </div>
              
              {health?.checks && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-subtle">
                    <Database className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Database</p>
                      <p className="text-xs text-muted-foreground">
                        {health.checks.database.latency}ms latency
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-subtle">
                    <Zap className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Cache</p>
                      <p className="text-xs text-muted-foreground">Memory store active</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/items">
          <Card className="glass card-hover h-full cursor-pointer group">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Browse Items</h3>
                    <p className="text-muted-foreground mt-1">
                      View inventory and make reservations
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/users/demo-user/reservations">
          <Card className="glass card-hover h-full cursor-pointer group">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-secondary/50 to-accent/30 p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <List className="h-8 w-8 text-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">My Reservations</h3>
                    <p className="text-muted-foreground mt-1">
                      Manage your active reservations
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {features.map((feature, idx) => (
          <div 
            key={feature.title}
            className="glass-subtle p-6 rounded-2xl text-center space-y-3"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="inline-flex p-3 rounded-xl bg-primary/10 mx-auto">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{feature.title}</p>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Help Section */}
      <Separator className="opacity-50" />
      <div className="glass-subtle rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 shrink-0">
            <AlertCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Getting Started</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This demo uses <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">demo-user</code> as the default user ID. 
              Browse items, make reservations, and confirm or cancel them from your reservations page. 
              Reservations automatically expire after 10 minutes if not confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
