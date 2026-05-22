'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Settings2, ExternalLink } from 'lucide-react';
import { useDNAStore, useSystemStore, useActiveRoute } from '@/lib/agnostic/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RecursiveBlockComposer } from '@/components/agnostic/designer/components/RecursiveBlockComposer';
import { useAdminGate } from '@/hooks/useAdminGate';
import { SYSTEM_NS } from '@/lib/agnostic/constants';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function AdminGear() {
  const isAdmin = useAdminGate();
  const [open, setOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const routes = useDNAStore((s) => s.routes);
  const schemas = useDNAStore((s) => s.schemas);
  const setRoutes = useDNAStore((s) => s.setRoutes);
  const currentPath = useSystemStore((s) => s.currentPath);
  const activeRoute = useActiveRoute();

  const persistRoute = useCallback(async (updatedRoute: any) => {
    try {
      await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WRITE',
          namespace: SYSTEM_NS.ROUTES,
          record: { id: updatedRoute.id, data: updatedRoute.data }
        })
      });
    } catch {
      toast.error('No se pudo guardar el cambio en el servidor.');
    }
  }, []);

  const handleBlockUpdate = useCallback((blockIndex: number, patch: any) => {
    if (!activeRoute) return;

    const updatedBlocks = [...((activeRoute.data as any).blocks || [])];
    updatedBlocks[blockIndex] = { ...updatedBlocks[blockIndex], ...patch };

    const updatedRoute = {
      ...activeRoute,
      data: { ...activeRoute.data, blocks: updatedBlocks }
    };

    // Optimistic — canvas reacts immediately
    setRoutes(routes.map(r => r.id === activeRoute.id ? updatedRoute : r));

    // Debounced persist — avoids hammering the vault on every keystroke
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistRoute(updatedRoute), 800);
  }, [activeRoute, routes, setRoutes, persistRoute]);

  if (!isAdmin) return null;

  const blocks: any[] = (activeRoute?.data as any)?.blocks || [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-[9999]',
          'w-10 h-10 rounded-full',
          'bg-primary text-primary-foreground',
          'flex items-center justify-center',
          'shadow-lg hover:shadow-xl',
          'transition-all duration-150 hover:scale-110 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
        title="Panel de administración"
        aria-label="Abrir panel de administración"
      >
        <Settings2 className="w-4 h-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[520px] flex flex-col p-0 gap-0">
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-semibold leading-none">
                <span className="text-muted-foreground font-normal">Editando: </span>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{currentPath || '/'}</span>
              </SheetTitle>
              <Link
                href="/schema"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Editor completo
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                <p className="text-sm text-muted-foreground">Esta página no tiene bloques.</p>
                <Link
                  href="/schema"
                  onClick={() => setOpen(false)}
                  className="text-xs text-primary underline underline-offset-2"
                >
                  Agregar bloques en el editor completo
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {blocks.map((block: any, index: number) => (
                  <RecursiveBlockComposer
                    key={block.id ?? index}
                    block={block}
                    schemas={schemas}
                    onUpdate={(patch) => handleBlockUpdate(index, patch)}
                    onRemove={() => {}}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 px-4 py-2 border-t bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              Los cambios se guardan automáticamente · Solo visible para admins
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
