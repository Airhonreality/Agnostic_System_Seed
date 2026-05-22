'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  allowedLists?: string[];   // primary — list-based auth
  requiredRole?: string | null; // legacy fallback
  fallbackPath?: string;
}

export function AgnosticGuard({ children, allowedLists, requiredRole, fallbackPath = '/login' }: Props) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isProtected = (allowedLists && allowedLists.length > 0) || !!requiredRole;

  const isAuthorized = (() => {
    if (!user) return false;
    const type: string[] = user.metadata?.type ?? (user.role ? [user.role] : []);

    // Admin always passes
    if (type.includes('admin') || user.role === 'admin') return true;

    // List-based check
    if (allowedLists && allowedLists.length > 0) {
      return type.some(t => allowedLists.includes(t));
    }

    // Legacy role check
    if (requiredRole) return user.role === requiredRole;

    return true;
  })();

  useEffect(() => {
    if (!isProtected) return;
    if (isLoading) return;
    if (!user) {
      router.push(fallbackPath);
    } else if (!isAuthorized) {
      router.push('/');
    }
  }, [user, isLoading, isProtected, isAuthorized, fallbackPath, router, pathname]);

  if (isProtected && isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
          Verifying Identity...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
