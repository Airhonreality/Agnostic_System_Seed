'use client';

/**
 * 🏛️ ARTEFACTO: AgnosticDesigner.tsx
 * ────────────
 * CAPA: Designer (Universal Orchestration Panel)
 * VERSIÓN: 2.0
 * COMMIT: P3-M4.5-DESIGNER-PURIFIED-STUDIO
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Shell del Parametric Designer con tres paneles reactivos y colapsables.
 * - Sincronización de Rutas de navegación, Átomos del DNA y Triggers de Eventos.
 * - Barra lateral izquierda colapsable (Hover-triggered Config Sidebar).
 * - Centralización en 3 pestañas principales de navegación pura en panel medio.
 * - Editor ultra-veloz en fila horizontal para atributos de esquemas (Javier UX).
 * - Barra extrema derecha de utilidades y filtros relacionales (Smart Tagging).
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Mantener el compilador limpio de errores de tipado.
 * - NEVER: Duplicar lógica de persistencia; usar dispatchers unificados.
 * - ALWAYS: Preservar un espacio de canvas expandido y limpio.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Route as RouteIcon, FileJson, Zap, Shield, RotateCcw, Box, Plus, Trash2, Sparkles, Layout, Info, Database, Palette, ExternalLink, Settings2, SlidersHorizontal, Check, ChevronsUpDown, Users } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import { useMateriaStore } from '@/lib/agnostic/store';
import { useAppDispatch } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Unused Tabs imports removed
import { SchemaField } from '@agnostic/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AgnosticTreeView, TreeNode } from './AgnosticTreeView';
import { SystemSection } from './sections/SystemSection';
import { ImportWizard } from '@/components/agnostic/plugins/ImportWizard';
import { RecursiveBlockComposer } from './components/RecursiveBlockComposer';
import { TokensEditor } from './TokensEditor';
import { cn } from '@/lib/utils';
import { SYSTEM_NS, FIELD_META_SCHEMA } from '@/lib/agnostic/constants';
import { AgnosticConfigProjector } from '@/components/agnostic/modules/AgnosticConfigProjector';
import { UserManager } from '@/components/agnostic/admin/UserManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// ─── CONTRATOS DE EDICIÓN INTERNA ───────────────────────────────────────────

const routeItemSchema = {
  name: 'Page Route',
  fields: [
    { key: "path", label: "Ruta de URL (Slug)", width: "half", required: true },
    { key: "title", label: "Título de la Página", width: "half", required: true },
    {
      key: "isPrivate",
      label: "Gobernanza de Acceso",
      width: "half",
      type: "select",
      options: [
        { label: "Público (Acceso Global)", value: false },
        { label: "Privado (Autenticación Requerida)", value: true }
      ]
    },
    {
      key: "layout_mode",
      label: "Ajuste del Canvas",
      width: "half",
      type: "select",
      options: [
        { label: "Canvas Completo (Fluid)", value: "canvas" },
        { label: "Contenedor Centrado (Optimized)", value: "container" }
      ]
    }
  ]
};

// ─── COMPONENTE MAESTRO ──────────────────────────────────────────────────────

export function AgnosticDesigner({
  initialSection = 'routes',
  initialRouteId = null
}: {
  initialSection?: string;
  initialRouteId?: string | null;
}) {
  const { data: materia } = useMateriaStore();
  const { saveItem, deleteItem, refreshStore } = useAppDispatch();

  // Estados de navegación contextual
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(initialRouteId);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  type ActiveMode = 'dna' | 'users' | 'tokens' | 'silo';
  const [activeMode, setActiveMode] = useState<ActiveMode>('dna');

  // Estado del Wizard de Importación
  const [showImport, setShowImport] = useState(false);

  // Estado de eliminación pendiente para confirmaciones AlertDialog (Stage 4)
  const [pendingDelete, setPendingDelete] = useState<{ type: 'route' | 'schema' | 'script'; id: string } | null>(null);

  // Resoluciones de datos unificadas
  const routes = useMemo(() => materia[SYSTEM_NS.ROUTES] ?? [], [materia]);
  const schemas = useMemo(() => materia[SYSTEM_NS.SCHEMAS] ?? [], [materia]);
  const scripts = useMemo(() => materia['scripts'] ?? [], [materia]);
  const tokens = useMemo(() => materia[SYSTEM_NS.TOKENS] ?? [], [materia]);

  const userLists = useMemo(() => materia[SYSTEM_NS.USER_LISTS] ?? [], [materia]);
  const passportItem = (materia[SYSTEM_NS.CONFIG] ?? []).find(item => item.id === 'master_passport');
  const config = (passportItem?.data as any) ?? {};

  const handleRefresh = async () => {
    await refreshStore();
    toast.success('Estado de realidad sincronizado');
  };

  const handleUpdateConfig = async (patch: any) => {
    const merged = {
      ...config,
      ...(patch.ui_tokens ? { ui_tokens: { ...(config.ui_tokens || {}), ...patch.ui_tokens } } : {}),
      ...(patch.layout_defaults ? { layout_defaults: { ...(config.layout_defaults || {}), ...patch.layout_defaults } } : {}),
    };
    await saveItem(SYSTEM_NS.CONFIG, { id: 'master_passport', data: merged });
    toast.success('Configuración del núcleo actualizada');
  };

  // ─── ACCIONES DE RUTAS ──────────────────────────────────────────────────────

  const handleAddRoute = async () => {
    const newRoute = {
      id: crypto.randomUUID(),
      context: SYSTEM_NS.ROUTES,
      data: {
        path: `/nueva-ruta-${Date.now().toString().slice(-4)}`,
        title: 'Nueva Página',
        isPrivate: false,
        layout_mode: 'container',
        blocks: [],
        order: routes.length
      }
    };
    await saveItem(SYSTEM_NS.ROUTES, newRoute);
    setSelectedRouteId(newRoute.id);
  };

  const handleSaveRoute = async (id: string, patch: any) => {
    const route = routes.find((r: any) => r.id === id);
    if (!route) return;
    await saveItem(SYSTEM_NS.ROUTES, { ...route, data: { ...(route.data || {}), ...patch } });
  };

  const handleRemoveRoute = async (id: string) => {
    setPendingDelete({ type: 'route', id });
  };

  // ─── ACCIONES DE SCHEMAS ────────────────────────────────────────────────────

  const handleAddSchema = async () => {
    const id = crypto.randomUUID();
    const newSchema = {
      id,
      context: SYSTEM_NS.SCHEMAS,
      data: {
        name: `nuevo_schema_${Date.now().toString().slice(-4)}`,
        fields: [],
        order: schemas.length
      }
    };
    await saveItem(SYSTEM_NS.SCHEMAS, newSchema);
    setSelectedSchemaId(id);
  };

  const handleSaveSchema = async (id: string, data: any) => {
    const schema = schemas.find((s: any) => s.id === id);
    if (!schema) return;
    await saveItem(SYSTEM_NS.SCHEMAS, { ...schema, data });
  };

  const handleRemoveSchema = async (id: string) => {
    setPendingDelete({ type: 'schema', id });
  };

  // ─── ACCIONES DE SCRIPTS ────────────────────────────────────────────────────

  const handleAddScript = async () => {
    const id = crypto.randomUUID();
    const newScript = {
      id,
      context: 'scripts',
      data: {
        name: `script_evento_${Date.now().toString().slice(-4)}`,
        description: 'Trigger disparado al salvar o procesar el formulario.',
        trigger: 'onSave',
        code: `// JS puro - function run(record, api) {\nconsole.log("Script disparado exitosamente", record);\n// }`,
        order: scripts.length
      }
    };
    await saveItem('scripts', newScript);
    setSelectedScriptId(id);
  };

  const handleSaveScript = async (id: string, data: any) => {
    const script = scripts.find((s: any) => s.id === id);
    if (!script) return;
    await saveItem('scripts', { ...script, data });
  };

  const handleRemoveScript = async (id: string) => {
    setPendingDelete({ type: 'script', id });
  };

  // ─── ACCIONES DE TOKENS ─────────────────────────────────────────────────────

  const handleAddToken = async (data: any) => {
    await saveItem(SYSTEM_NS.TOKENS, {
      id: crypto.randomUUID(),
      context: SYSTEM_NS.TOKENS,
      data
    });
  };

  const handleSaveToken = async (id: string, data: any) => {
    const token = tokens.find((t: any) => t.id === id);
    if (!token) return;
    await saveItem(SYSTEM_NS.TOKENS, { ...token, data });
  };

  const handleRemoveToken = async (id: string) => {
    await deleteItem(SYSTEM_NS.TOKENS, id);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);
    if (type === 'route') {
      await deleteItem(SYSTEM_NS.ROUTES, id);
      if (selectedRouteId === id) setSelectedRouteId(null);
    } else if (type === 'schema') {
      await deleteItem(SYSTEM_NS.SCHEMAS, id);
      if (selectedSchemaId === id) setSelectedSchemaId(null);
      toast.success('Blueprint de datos eliminado');
    } else if (type === 'script') {
      await deleteItem('scripts', id);
      if (selectedScriptId === id) setSelectedScriptId(null);
    }
  };

  // ─── CONSTRUCCIÓN DE NODOS DEL TREE ──────────────────────────────────────────

  const routeNodes = useMemo<TreeNode[]>(() => [...routes]
    .sort((a, b) => Number(a.data?.order ?? 0) - Number(b.data?.order ?? 0))
    .map((r: any) => ({
      id: r.id,
      label: r.data?.path || '/sin-ruta',
      icon: RouteIcon,
      badge: `${r.data?.blocks?.length ?? 0} Blks`,
      data: r
    })), [routes]);

  const schemaNodes = useMemo<TreeNode[]>(() => [...schemas]
    .sort((a, b) => Number(a.data?.order ?? 0) - Number(b.data?.order ?? 0))
    .map((s: any) => {
      const schemaName = s.data?.name || '';
      
      // Buscar relaciones entrantes de otros esquemas (REQ 4 - Relaciones Simétricas)
      const incomingRelations: TreeNode[] = [];
      schemas.forEach((otherSchema: any) => {
        const otherFields = otherSchema.data?.fields || [];
        otherFields.forEach((field: any) => {
          if (field.type === 'relation' && field.config?.relation?.entity === schemaName) {
            incomingRelations.push({
              id: `fk-${otherSchema.id}-${field.id}`,
              label: `← Relación: ${otherSchema.data?.name || 'sin_nombre'} (${field.key})`,
              icon: Database,
              data: null // no seleccionable
            });
          }
          // Buscar en subcampos anidados
          const subFields = field.fields || [];
          subFields.forEach((sub: any) => {
            if (sub.type === 'relation' && sub.config?.relation?.entity === schemaName) {
              incomingRelations.push({
                id: `fk-sub-${otherSchema.id}-${sub.id}`,
                label: `← Relación: ${otherSchema.data?.name || 'sin_nombre'} (${field.key}.${sub.key})`,
                icon: Database,
                data: null // no seleccionable
              });
            }
          });
        });
      });

      const hasFks = incomingRelations.length > 0;

      return {
        id: s.id,
        label: schemaName || 'sin_nombre',
        icon: FileJson,
        badge: `${s.data?.fields?.length ?? 0} Flds`,
        data: s,
        children: hasFks ? incomingRelations : undefined,
        isExpandable: hasFks
      };
    }), [schemas]);

  const scriptNodes = useMemo<TreeNode[]>(() => [...scripts]
    .sort((a, b) => Number(a.data?.order ?? 0) - Number(b.data?.order ?? 0))
    .map((s: any) => ({
      id: s.id,
      label: s.data?.name || 'sin_nombre_script',
      icon: Zap,
      badge: s.data?.trigger || 'onSave',
      data: s
    })), [scripts]);

  const unifiedNodes = useMemo<TreeNode[]>(() => [
    {
      id: 'root-routes',
      label: 'Rutas y Sitemap',
      icon: RouteIcon,
      badge: routeNodes.length,
      isVirtualRoot: true,
      children: routeNodes,
      onAdd: handleAddRoute,
      addLabel: 'Registrar Nueva Ruta'
    },
    {
      id: 'root-schemas',
      label: 'Blueprints del DNA',
      icon: FileJson,
      badge: schemaNodes.length,
      isVirtualRoot: true,
      children: schemaNodes,
      onAdd: handleAddSchema,
      addLabel: 'Diseñar Nuevo Blueprint'
    },
    {
      id: 'root-logic',
      label: 'Lógica y Scripts',
      icon: Zap,
      badge: scriptNodes.length,
      isVirtualRoot: true,
      children: scriptNodes,
      onAdd: handleAddScript,
      addLabel: 'Registrar Evento Script'
    },
  ], [routeNodes, schemaNodes, scriptNodes]);

  const handleReorder = async (category: 'routes' | 'schemas' | 'scripts', activeId: string, overId: string) => {
    const items = category === 'routes' ? routes : category === 'schemas' ? schemas : scripts;
    const oldIndex = items.findIndex((item: any) => item.id === activeId);
    const newIndex = items.findIndex((item: any) => item.id === overId);
    
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const context = category === 'routes' ? SYSTEM_NS.ROUTES : category === 'schemas' ? SYSTEM_NS.SCHEMAS : 'scripts';

    try {
      await Promise.all(
        reordered.map((item: any, index: number) =>
          saveItem(context, {
            ...item,
            data: {
              ...(item.data || {}),
              order: index
            }
          })
        )
      );
      toast.success(`Ordenación de ${category === 'routes' ? 'Rutas' : category === 'schemas' ? 'Blueprints' : 'Scripts'} actualizada`);
    } catch (e: any) {
      toast.error(`Error al persistir reordenamiento: ${e.message || e}`);
    }
  };

  const handleSelectNode = (node: TreeNode) => {
    if (node.isVirtualRoot) return;
    if (node.data === null) return;
    const parentId = node.id;
    if (routes.some((r: any) => r.id === parentId)) {
      setSelectedRouteId(parentId);
      setSelectedSchemaId(null);
      setSelectedScriptId(null);
    } else if (schemas.some((s: any) => s.id === parentId)) {
      setSelectedSchemaId(parentId);
      setSelectedRouteId(null);
      setSelectedScriptId(null);
    } else if (scripts.some((s: any) => s.id === parentId)) {
      setSelectedScriptId(parentId);
      setSelectedRouteId(null);
      setSelectedSchemaId(null);
    }
  };

  const RAIL = [
    { id: 'dna'    as const, icon: FileJson, label: 'DNA & Rutas' },
    { id: 'users'  as const, icon: Users,    label: 'Gestión de Acceso' },
    { id: 'tokens' as const, icon: Palette,  label: 'Design Tokens' },
    { id: 'silo'   as const, icon: Shield,   label: 'Config del Silo' },
  ];

  return (
    <div className="flex h-full w-full bg-background overflow-hidden select-none">

      {/* ── RAIL: activador de módulos ────────────────────────────── */}
      <aside className="w-14 border-r flex flex-col items-center pt-4 pb-5 bg-muted/15 shrink-0 gap-1">
        <div className="mb-4">
          <Shield size={18} className="text-primary animate-pulse" />
        </div>

        {RAIL.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveMode(id)}
            title={label}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              activeMode === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon size={16} />
          </button>
        ))}

        <div className="mt-auto">
          <button
            onClick={handleRefresh}
            title="Sincronizar Estado"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </aside>

      {/* ── NAVIGATOR: solo visible en modo dna ──────────────────── */}
      {activeMode === 'dna' && (
        <aside className="w-80 border-r flex flex-col shrink-0 bg-background overflow-hidden">
          <div className="h-14 px-4 border-b flex items-center bg-muted/5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Jerarquía del Sistema</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <AgnosticTreeView
              nodes={unifiedNodes}
              selectedId={selectedRouteId || selectedSchemaId || selectedScriptId}
              onSelect={handleSelectNode}
              onReorder={handleReorder}
              emptyMessage="Cargando estructuras de realidad..."
            />
          </div>
          <div className="p-3 border-t bg-muted/10 shrink-0">
            <Button
              onClick={() => setShowImport(true)}
              variant="outline"
              className="w-full h-10 rounded-xl border-dashed border-primary/20 hover:border-primary/50 text-[10px] font-black tracking-widest uppercase gap-2 hover:bg-primary/5 transition-all shadow-sm"
            >
              <Database size={13} className="text-primary animate-pulse" />
              Importar Estructura (Wizard)
            </Button>
          </div>
        </aside>
      )}

      {/* ── CANVAS: cambia según activeMode ──────────────────────── */}
      <main className="flex-1 overflow-hidden">
        {activeMode === 'dna' && (
          <div className="h-full overflow-y-auto p-8 bg-muted/5">
            {selectedRouteId && (
              <RouteEditor
                routeId={selectedRouteId}
                routes={routes}
                schemas={schemas}
                tokens={tokens}
                userLists={userLists}
                onSave={handleSaveRoute}
                onRemove={handleRemoveRoute}
              />
            )}
            {selectedSchemaId && (
              <SchemaEditor
                schemaId={selectedSchemaId}
                schemas={schemas}
                onSave={handleSaveSchema}
                onRemove={handleRemoveSchema}
              />
            )}
            {selectedScriptId && (
              <ScriptEditor
                scriptId={selectedScriptId}
                scripts={scripts}
                onSave={handleSaveScript}
                onRemove={handleRemoveScript}
              />
            )}
            {!selectedRouteId && !selectedSchemaId && !selectedScriptId && <EmptyEditorState />}
          </div>
        )}

        {activeMode === 'tokens' && (
          <div className="h-full overflow-y-auto p-8">
            <TokensEditor
              tokens={tokens as any[]}
              onAdd={handleAddToken}
              onSave={handleSaveToken}
              onRemove={handleRemoveToken}
            />
          </div>
        )}

        {activeMode === 'users' && <UserManager />}

        {activeMode === 'silo' && (
          <div className="h-full overflow-y-auto p-8 max-w-2xl">
            <SystemSection config={config} setConfig={handleUpdateConfig} />
          </div>
        )}
      </main>

      {/* modal de confirmación AlertDialog premium (Stage 4) */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-card border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest text-foreground">
              Confirmar eliminación
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Esta acción es irreversible. El elemento será eliminado permanentemente de la estructura del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="flex-1 text-[10px] font-black uppercase tracking-widest h-9 rounded-xl">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-1 text-[10px] font-black uppercase tracking-widest h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🗃️ IMPORT WIZARD DIALOG MODAL */}
      <ImportWizard open={showImport} onClose={() => setShowImport(false)} />

    </div>
  );
}

// ─── SUB-COMPONENTES: EDITORES DEL PANEL DERECHO ───────────────────────────

// 1. ROUTE EDITOR (Composición de Rutas y Bloques)
function RouteEditor({
  routeId,
  routes,
  schemas,
  tokens,
  userLists,
  onSave,
  onRemove
}: {
  routeId: string;
  routes: any[];
  schemas: any[];
  tokens: any[];
  userLists: any[];
  onSave: (id: string, patch: any) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const route = useMemo(() => routes.find((r: any) =>
    r.id === routeId), [routes, routeId]);

  const [localData, setLocalData] =
    useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado local cuando cambia la ruta seleccionada
  useEffect(() => {
    if (route?.data) setLocalData(route.data);
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!route) return <div className="text-sm font-semibold opacity-40">Buscando estructura de ruta...</div>;

  const isDirty = JSON.stringify(localData) !==
    JSON.stringify(route.data || {});

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(routeId, localData);
    } finally {
      setIsSaving(false);
    }
  };

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Helper function to build TreeNode[] from blocks recursively
  const buildLayerTree = (blocks: any[]): TreeNode[] => {
    return blocks.map(block => ({
      id: block.id || crypto.randomUUID(),
      label: block.config?.label ?? block.title ?? block.type,
      icon: block.type === 'frame' ? Box
          : block.type === 'text'  ? Layout
          : block.type === 'image' ? Palette
          : block.type === 'form'  ? FileJson
          : Shield,
      data: block,
      children: block.blocks?.length > 0 ? buildLayerTree(block.blocks) : undefined,
      isExpandable: (block.blocks?.length ?? 0) > 0,
    }));
  };

  // Helper function to update node recursively in tree
  const updateNodeInTree = (blocks: any[], targetId: string, patch: any): any[] => {
    return blocks.map(block => {
      if (block.id === targetId) return { ...block, ...patch };
      if (block.blocks?.length > 0) {
        return { ...block, blocks: updateNodeInTree(block.blocks, targetId, patch) };
      }
      return block;
    });
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Cabecera */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <RouteIcon size={16} className="text-primary" /> Ruta en Edición
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
            Navegación topológica y composición fractal
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest h-9 rounded-xl gap-2"
            >
              <Sparkles size={12} />
              {isSaving ? 'Guardando...' : 'Guardar Ruta'}
            </Button>
          )}
          {localData.path && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(localData.path, '_blank')}
              className="text-[10px] font-black uppercase tracking-widest h-9 rounded-xl border-primary/20 hover:border-primary hover:bg-primary/5 gap-2"
            >
              <ExternalLink size={12} /> Abrir Ruta
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(routeId)}
            className="text-destructive/50 hover:text-destructive hover:bg-destructive/5 font-bold uppercase text-[10px] tracking-widest"
          >
            <Trash2 size={14} className="mr-2" /> Eliminar Ruta
          </Button>
        </div>
      </div>

      {/* Metadata de la ruta — inputs controlados directos */}
      <div className="bg-background border rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ruta de URL (Slug)</label>
            <Input
              value={localData.path || ''}
              onChange={(e) => setLocalData((prev: any) => ({ ...prev, path: e.target.value }))}
              className="font-bold text-xs h-9"
              placeholder="/mi-ruta"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Título de la Página</label>
            <Input
              value={localData.title || ''}
              onChange={(e) => setLocalData((prev: any) => ({ ...prev, title: e.target.value }))}
              className="font-bold text-xs h-9"
              placeholder="Mi Página"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gobernanza de Acceso</label>
            <Select
              value={String(localData.isPrivate ?? 'false')}
              onValueChange={(val) => setLocalData((prev: any) => ({ ...prev, isPrivate: val === 'true' }))}
            >
              <SelectTrigger className="h-9 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Público (Acceso Global)</SelectItem>
                <SelectItem value="true">Privado (Autenticación Requerida)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ajuste del Canvas</label>
            <Select
              value={localData.layout_mode || 'canvas'}
              onValueChange={(val) => setLocalData((prev: any) => ({ ...prev, layout_mode: val }))}
            >
              <SelectTrigger className="h-9 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="canvas">Canvas Completo (Fluid)</SelectItem>
                <SelectItem value="container">Contenedor Centrado (Optimized)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Permisos de acceso — allowed_lists */}
      <div className="bg-background border rounded-2xl p-6 shadow-sm">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-3">
          Acceso Permitido
        </label>
        <p className="text-[10px] text-muted-foreground mb-2">
          {((localData.allowed_lists ?? []) as string[]).length === 0
            ? 'Página pública — sin restricción de acceso'
            : 'Solo usuarios en las listas seleccionadas (admin siempre incluido)'}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {userLists.map((list: any) => {
            const name = list.data?.name as string;
            const active = ((localData.allowed_lists ?? []) as string[]).includes(name);
            return (
              <button
                key={list.id}
                onClick={() => {
                  const current: string[] = (localData.allowed_lists ?? []) as string[];
                  setLocalData((prev: any) => ({
                    ...prev,
                    allowed_lists: active
                      ? current.filter(t => t !== name)
                      : [...current, name]
                  }));
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/60'
                )}
              >
                {name}
              </button>
            );
          })}
          {userLists.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">Sin listas definidas. Crea listas en el módulo de Acceso.</p>
          )}
        </div>
      </div>

      {/* Composición de Bloques en 2 Columnas (Árbol + Editor Paramétrico) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Capas del Layout
          </h3>
          <Button
            onClick={() => {
              const newBlock = { 
                id: crypto.randomUUID(), 
                type: 'frame', 
                title: 'Nuevo Frame', 
                direction: 'vertical', 
                blocks: [] 
              };
              setLocalData((prev: any) => ({
                ...prev,
                blocks: [...(prev.blocks || []), newBlock]
              }));
              setSelectedBlockId(newBlock.id);
            }}
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest border-dashed gap-2"
          >
            <Plus size={12} /> Añadir Frame
          </Button>
        </div>

        {(localData.blocks || []).length === 0 ? (
          <div className="text-center py-12 text-xs font-semibold text-muted-foreground border border-dashed rounded-2xl bg-background">
            Sin bloques. Añade un Frame para empezar a componer.
          </div>
        ) : (
          <div className="grid grid-cols-[260px_1fr] gap-4 min-h-[400px]">
            
            {/* Panel izquierdo: árbol de capas */}
            <div className="border rounded-2xl p-3 bg-muted/10 overflow-y-auto max-h-[600px]">
              <AgnosticTreeView
                nodes={buildLayerTree(localData.blocks || [])}
                selectedId={selectedBlockId}
                onSelect={(node) => setSelectedBlockId(node.id)}
              />
            </div>

            {/* Panel derecho: propiedades del nodo seleccionado */}
            <div className="border rounded-2xl p-5 bg-background overflow-y-auto max-h-[600px]">
              {!selectedBlockId ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-semibold py-12">
                  Selecciona una capa para editar sus propiedades
                </div>
              ) : (() => {
                const findBlock = (blocks: any[], id: string): any => {
                  for (const b of blocks) {
                    if (b.id === id) return b;
                    if (b.blocks?.length) {
                      const found = findBlock(b.blocks, id);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                const selectedBlock = findBlock(localData.blocks || [], selectedBlockId);
                if (!selectedBlock) return null;
                
                return (
                  <RecursiveBlockComposer
                    key={selectedBlockId}
                    block={selectedBlock}
                    schemas={schemas}
                    tokens={tokens}
                    hideChildren={true}
                    onUpdate={(patch) => {
                      setLocalData((prev: any) => ({
                        ...prev,
                        blocks: updateNodeInTree(prev.blocks || [], selectedBlockId, patch)
                      }));
                    }}
                    onRemove={() => {
                      if (!confirm('¿Eliminar este bloque del layout?')) return;
                      const removeFromTree = (blocks: any[], id: string): any[] =>
                        blocks
                          .filter(b => b.id !== id)
                          .map(b => b.blocks?.length
                            ? { ...b, blocks: removeFromTree(b.blocks, id) }
                            : b
                          );
                      setLocalData((prev: any) => ({
                        ...prev,
                        blocks: removeFromTree(prev.blocks || [], selectedBlockId)
                      }));
                      setSelectedBlockId(null);
                    }}
                  />
                );
              })()}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// 2. SCHEMA EDITOR (Estado local + botón explícito Guardar)
function SchemaEditor({
  schemaId,
  schemas,
  onSave,
  onRemove
}: {
  schemaId: string;
  schemas: any[];
  onSave: (id: string, data: any) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const schema = useMemo(() => schemas.find((s: any) => s.id === schemaId), [schemas, schemaId]);

  const [localName, setLocalName] = useState('');
  const [localFields, setLocalFields] = useState<SchemaField[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [openFieldSettingsIdx, setOpenFieldSettingsIdx] = useState<number | null>(null);

  const existingSections = useMemo(() => {
    return [...new Set(localFields.map((f: any) => f.section).filter(Boolean))] as string[];
  }, [localFields]);

  const schemaIdRef = useRef(schemaId);
  const localNameRef = useRef(localName);
  const localFieldsRef = useRef(localFields);

  const isDirty =
    !!schema &&
    schema.id === schemaId &&
    (localName !== (schema.data?.name || '') ||
      JSON.stringify(localFields) !== JSON.stringify(schema.data?.fields || []));

  const isDirtyRef = useRef(isDirty);

  useEffect(() => {
    schemaIdRef.current = schemaId;
    localNameRef.current = localName;
    localFieldsRef.current = localFields;
    isDirtyRef.current = isDirty;
  }, [schemaId, localName, localFields, isDirty]);

  const saveImmediately = async (targetId: string, name: string, fields: any[]) => {
    if (!name.trim()) return;
    setSaveStatus('saving');
    try {
      await onSave(targetId, { name, fields });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('idle');
    }
  };

  // Sincronizar estado local cuando se cambia de schema seleccionado
  useEffect(() => {
    if (isDirtyRef.current && schemaIdRef.current && schemaIdRef.current !== schemaId) {
      saveImmediately(schemaIdRef.current, localNameRef.current, localFieldsRef.current);
    }

    if (schema) {
      setLocalName(schema.data?.name || '');
      setLocalFields(schema.data?.fields || []);
    }
  }, [schemaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar al desmontar
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && schemaIdRef.current) {
        onSave(schemaIdRef.current, { name: localNameRef.current, fields: localFieldsRef.current });
      }
    };
  }, []);

  const debouncedName = useDebounce(localName, 800);
  const debouncedFields = useDebounce(localFields, 800);

  useEffect(() => {
    if (!isDirty) return;
    saveImmediately(schemaId, debouncedName, debouncedFields);
  }, [debouncedName, debouncedFields]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schema) return <div className="text-sm font-semibold opacity-40">Buscando blueprint del DNA...</div>;

  const handleAddField = () => {
    setLocalFields(prev => [...prev, {
      id: crypto.randomUUID(),
      key: `campo_${Date.now().toString().slice(-4)}`,
      label: 'Nuevo Campo',
      type: 'text',
      width: 'full'
    }]);
  };

  const handleUpdateField = (idx: number, patch: any) => {
    setLocalFields(prev => {
      const fields = [...prev];
      fields[idx] = { ...fields[idx], ...patch };
      return fields;
    });
  };

  const handleRemoveField = (fieldId: string) => {
    setLocalFields(prev => prev.filter((f: any) => f.id !== fieldId));
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Cabecera */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <FileJson size={16} className="text-primary" /> Esquema en Edición
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
            Arquitectura de estructuras de datos y planos de información
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            {saveStatus === 'saving' && <span className="text-muted-foreground animate-pulse">Guardando...</span>}
            {saveStatus === 'saved' && <span className="text-primary/60">✓ Guardado</span>}
          </div>

          {/* Dynamic Live Data Capture Form Trigger (REQ 6) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/5 font-bold uppercase text-[10px] tracking-widest gap-2 shadow-sm"
              >
                <Database size={14} /> Capturar Datos (Live)
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background border-l shadow-2xl">
              <SheetHeader className="border-b pb-4 mb-4 text-left">
                <SheetTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Database size={16} /> Capturar en Caliente: {localName || 'Silo'}
                </SheetTitle>
                <SheetDescription className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Generar y simular registros instantáneos en la base de datos a partir del blueprint actual.
                </SheetDescription>
              </SheetHeader>
              <AgnosticFormEmbed
                schemaName={localName}
                fields={localFields}
                isDirty={isDirty}
              />
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(schemaId)}
            className="text-destructive/50 hover:text-destructive hover:bg-destructive/5 font-bold uppercase text-[10px] tracking-widest"
          >
            <Trash2 size={14} className="mr-2" /> Eliminar Esquema
          </Button>
        </div>
      </div>

      {/* Editor de Nombre Principal */}
      <div className="bg-background border rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
          <FileJson size={20} />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Blueprint (Namespace)</label>
          <Input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            className="font-bold text-xs h-9"
          />
        </div>
      </div>

      {/* Lista de Átomos (Inline Row Editor) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Campos Estructurales (Átomos)
          </h3>
        </div>

        {localFields.length === 0 ? (
          <div className="text-center py-12 text-xs font-semibold text-muted-foreground border border-dashed rounded-2xl bg-background flex flex-col items-center justify-center gap-4">
            <span>Este esquema no tiene campos aún. Diseña los primeros campos de información.</span>
            <Button
              onClick={handleAddField}
              variant="outline"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest border-dashed gap-2 w-48"
            >
              <Plus size={12} /> Diseñar Primer Campo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {localFields.map((field: any, idx: number) => {
              const autoSlug = (field.label || '')
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '_')
                .replace(/[^\w-]+/g, '');

              return (
                <div key={field.id || idx} className="bg-background border rounded-xl p-4 shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4 relative group">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
                    {/* Etiqueta Visual */}
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Etiqueta Visual</label>
                      <Input
                        value={field.label || ''}
                        onChange={(e) => {
                          const newLabel = e.target.value;
                          const newKey = newLabel.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');
                          handleUpdateField(idx, { label: newLabel, key: newKey });
                        }}
                        placeholder="Ej. Nombre del Cliente"
                        className="font-bold text-xs h-9 bg-muted/5 border-muted/80 focus-visible:ring-primary/20"
                      />
                    </div>

                    {/* Tipo de Dato */}
                    <div className="w-full md:w-44 space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Dato</label>
                      <Select
                        value={field.type || 'text'}
                        onValueChange={(val) => {
                          const patch: any = { type: val };
                          if (val === 'relation') {
                            patch.config = {
                              ...(field.config || {}),
                              relation: { entity: '', parent_key: 'id' }
                            };
                          }
                          handleUpdateField(idx, patch);
                        }}
                      >
                        <SelectTrigger className="h-9 font-bold text-xs bg-muted/5 border-muted/80 focus:ring-primary/20">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text" className="font-bold text-xs">Texto Plano</SelectItem>
                          <SelectItem value="number" className="font-bold text-xs">Numérico</SelectItem>
                          <SelectItem value="select" className="font-bold text-xs">Opciones (Select)</SelectItem>
                          <SelectItem value="date" className="font-bold text-xs">Fecha</SelectItem>
                          <SelectItem value="boolean" className="font-bold text-xs">Booleano</SelectItem>
                          <SelectItem value="textarea" className="font-bold text-xs">Área de Texto</SelectItem>
                          <SelectItem value="relation" className="font-bold text-xs">Relación (FK)</SelectItem>
                          <SelectItem value="object" className="font-bold text-xs">Objeto Anidado</SelectItem>
                          <SelectItem value="array_of_objects" className="font-bold text-xs">Lista de Objetos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Relación Agnóstica (FK) */}
                    {field.type === 'relation' && (
                      <div className="w-full md:w-44 space-y-1 animate-in fade-in zoom-in-95 duration-200">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Blueprint Relacionado</label>
                        <Select
                          value={field.config?.relation?.entity || ''}
                          onValueChange={(val) => {
                            const updatedConfig = {
                              ...(field.config || {}),
                              relation: { entity: val, parent_key: 'id' }
                            };
                            handleUpdateField(idx, { config: updatedConfig });
                          }}
                        >
                          <SelectTrigger className="h-9 font-bold text-xs bg-primary/5 border-primary/20 text-primary focus:ring-primary/20">
                            <SelectValue placeholder="Elegir parent blueprint" />
                          </SelectTrigger>
                          <SelectContent>
                            {schemas.filter((s: any) => s.data?.name).map((s: any) => (
                              <SelectItem key={s.id} value={s.data.name} className="font-bold text-xs">
                                {s.data.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Slug del Campo (Read-Only) */}
                    <div className="w-full md:w-44 space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Slug (JSON Key)</label>
                      <div className="h-9 px-3 border bg-muted/20 rounded-lg flex items-center justify-between text-xs font-mono font-bold text-primary truncate border-muted/80 select-all">
                        <span>{field.key || autoSlug || 'sin_clave'}</span>
                      </div>
                    </div>

                    {/* ¿Es Obligatorio? Checkbox en Línea (Ultra-usable) */}
                    <div className="shrink-0 flex items-center gap-2 pt-5 md:pt-0">
                      <input
                        type="checkbox"
                        id={`req-${field.id || idx}`}
                        checked={!!field.required}
                        onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                        className="w-4 h-4 rounded border-muted/80 bg-muted/5 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                      />
                      <label htmlFor={`req-${field.id || idx}`} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground select-none cursor-pointer">
                        Obligatorio
                      </label>
                    </div>

                    {/* Acciones */}
                    <div className="shrink-0 flex items-end gap-1 pt-5 md:pt-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenFieldSettingsIdx(openFieldSettingsIdx === idx ? null : idx)}
                        className={cn(
                          "w-9 h-9 rounded-xl transition-colors",
                          openFieldSettingsIdx === idx ? "text-primary bg-primary/5 border border-primary/10" : "text-muted-foreground/60 hover:text-primary hover:bg-muted"
                        )}
                        title="Ajustes Avanzados"
                      >
                        <Settings2 size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveField(field.id)}
                        className="w-9 h-9 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                        title="Eliminar Campo"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Sub-campos anidados (REQ 4) */}
                  {(field.type === 'object' || field.type === 'array_of_objects') && (
                    <SubFieldEditor
                      fields={field.fields || []}
                      onChange={(updated) => handleUpdateField(idx, { fields: updated })}
                      schemas={schemas}
                    />
                  )}

                  {/* 🧬 COLLAPSIBLE ADVANCED SETTINGS PANEL (REQ 1 + REQ 5) */}
                  {openFieldSettingsIdx === idx && (
                    <div className="w-full border-t border-dashed border-border/60 pt-4 mt-2 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      
                      {/* Sección Organizativa (Tab) */}
                      <div className="space-y-1 max-w-xs">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                          Sección Visual (Tab)
                        </label>
                        <SectionCombobox
                          value={field.section ?? ''}
                          options={existingSections}
                          onChange={(val) => handleUpdateField(idx, { section: val })}
                        />
                      </div>

                      {/* Resto de Ajustes Proyectados */}
                      <div className="border-t border-border/10 pt-4">
                        <AgnosticConfigProjector
                          schema={FIELD_META_SCHEMA}
                          data={field}
                          onUpdate={(patch) => {
                            // Mitigación: Escribir isPrimary en ambos lugares por compatibilidad
                            if (patch.isPrimary !== undefined) {
                              handleUpdateField(idx, { 
                                isPrimary: patch.isPrimary,
                                config: { ...(field.config || {}), isPrimary: patch.isPrimary }
                              });
                            } else {
                              handleUpdateField(idx, patch);
                            }
                          }}
                        />
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
            <div className="pt-2">
              <Button
                onClick={handleAddField}
                variant="outline"
                size="sm"
                className="w-full border-dashed text-[10px] font-black uppercase tracking-widest gap-2 py-5 rounded-xl hover:bg-muted/10 transition-colors"
              >
                <Plus size={12} /> Añadir Nuevo Campo
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// 3. SCRIPT EDITOR (Estado local + botón explícito Guardar)
function ScriptEditor({
  scriptId,
  scripts,
  onSave,
  onRemove
}: {
  scriptId: string;
  scripts: any[];
  onSave: (id: string, data: any) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const script = useMemo(() => scripts.find((s: any) => s.id === scriptId), [scripts, scriptId]);

  const [localName, setLocalName] = useState('');
  const [localTrigger, setLocalTrigger] = useState('onSave');
  const [localDescription, setLocalDescription] = useState('');
  const [localCode, setLocalCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado local al cambiar el script seleccionado
  useEffect(() => {
    if (script) {
      setLocalName(script.data?.name || '');
      setLocalTrigger(script.data?.trigger || 'onSave');
      setLocalDescription(script.data?.description || '');
      setLocalCode(script.data?.code || '');
    }
  }, [scriptId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!script) return <div className="text-sm font-semibold opacity-40">Buscando script de evento...</div>;

  const isDirty =
    localName !== (script.data?.name || '') ||
    localTrigger !== (script.data?.trigger || 'onSave') ||
    localDescription !== (script.data?.description || '') ||
    localCode !== (script.data?.code || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(scriptId, {
        name: localName,
        trigger: localTrigger,
        description: localDescription,
        code: localCode
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Cabecera */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap size={16} className="text-primary animate-bounce" /> Lógica en Edición
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
            Control de eventos funcionales y automatizaciones puras
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest h-9 rounded-xl gap-2"
            >
              <Sparkles size={12} />
              {isSaving ? 'Guardando...' : 'Guardar Script'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(scriptId)}
            className="text-destructive/50 hover:text-destructive hover:bg-destructive/5 font-bold uppercase text-[10px] tracking-widest"
          >
            <Trash2 size={14} className="mr-2" /> Eliminar Script
          </Button>
        </div>
      </div>

      {/* Editor de Propiedades */}
      <div className="bg-background border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre Único del Script</label>
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="font-bold text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trigger de Ejecución</label>
            <Select
              value={localTrigger}
              onValueChange={(val) => setLocalTrigger(val)}
            >
              <SelectTrigger className="text-xs font-semibold h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onSave">onSave — Al guardar registro</SelectItem>
                <SelectItem value="onDelete">onDelete — Al eliminar registro</SelectItem>
                <SelectItem value="onOpen">onOpen — Al abrir interfaz</SelectItem>
                <SelectItem value="onLoad">onLoad — Al cargar datos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descripción Operacional</label>
          <Input
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>

      {/* Editor de Código */}
      <div className="bg-background border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
        <div className="bg-muted/30 px-6 py-3 border-b flex items-center justify-between shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">function run(record, api)</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
        </div>
        <Textarea
          value={localCode}
          onChange={(e) => setLocalCode(e.target.value)}
          className="flex-1 w-full font-mono text-xs p-6 leading-relaxed resize-none rounded-none border-0 focus-visible:ring-0 bg-muted/30 text-foreground min-h-0 h-full"
          spellCheck={false}
          placeholder="// function run(record, api) { ... }"
        />
        <div className="bg-muted/10 px-6 py-2 border-t text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
          Entorno Isomórfico Protegido
        </div>
      </div>

    </div>
  );
}

// 4. EMPTY DESIGNER STATE (Placeholder Premium)
function EmptyEditorState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-lg mx-auto">
      <div className="h-16 w-16 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/[0.02]">
        <Sparkles size={28} className="animate-pulse" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
          Studio de Composición Paramétrica
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Selecciona cualquier ruta, blueprint de datos o script de control en el panel central de jerarquía para habilitar las consolas avanzadas de edición y diseño visual en tiempo real.
        </p>
      </div>
    </div>
  );
}

// 5. SECTION COMBOBOX FOR FIELD EDITING (REQ 1 - Lightweight Custom Combobox)
interface SectionComboboxProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

function SectionCombobox({ value, options, onChange }: SectionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-bold text-xs h-9 bg-muted/5 border-muted/80 hover:bg-muted/10 text-left px-3"
        >
          <span className="truncate">{value || 'Seleccionar Sección...'}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-card border rounded-xl shadow-lg z-50">
        <div className="flex gap-1.5 mb-2">
          <Input
            placeholder="Buscar o crear..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs font-semibold"
          />
          {search.trim() && !options.includes(search.trim()) && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 shrink-0"
              onClick={() => {
                onChange(search.trim());
                setSearch('');
                setOpen(false);
              }}
              title="Añadir nueva sección"
            >
              <Plus size={14} />
            </Button>
          )}
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filteredOptions.length === 0 && !search.trim() && (
            <div className="text-[10px] text-muted-foreground p-2 text-center uppercase tracking-wider font-bold">
              Sin secciones
            </div>
          )}
          {filteredOptions.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors",
                value === opt
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{opt}</span>
              {value === opt && <Check size={12} className="text-primary" />}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// 6. SUBFIELD EDITOR (REQ 4 - Depth 1 Nested Editor)
interface SubFieldEditorProps {
  fields: SchemaField[];
  onChange: (updatedFields: SchemaField[]) => void;
  schemas: any[];
}

function SubFieldEditor({ fields = [], onChange, schemas }: SubFieldEditorProps) {
  const handleAddSub = () => {
    const newSub = {
      id: crypto.randomUUID(),
      key: `sub_${Date.now().toString().slice(-4)}`,
      label: 'Sub Campo',
      type: 'text' as const
    };
    onChange([...fields, newSub]);
  };

  const handleUpdateSub = (idx: number, patch: any) => {
    const updated = [...fields];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const handleRemoveSub = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full bg-muted/5 border border-dashed rounded-xl p-4 space-y-3 animate-in slide-in-from-top-1 duration-200 mt-2">
      <div className="flex items-center justify-between border-b border-border/20 pb-2">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          Estructura de Sub-campos Anidados
        </label>
      </div>

      {fields.length === 0 ? (
        <div className="text-[9px] text-center text-muted-foreground/60 py-4 font-bold uppercase tracking-wider">
          Sin sub-campos definidos
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((sub, idx) => {
            const autoSlug = (sub.label || '')
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '_')
              .replace(/[^\w-]+/g, '');

            return (
              <div key={sub.id || idx} className="flex flex-col md:flex-row md:items-center gap-3 bg-background border p-3 rounded-lg shadow-sm">
                
                {/* Etiqueta */}
                <div className="flex-1 space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Etiqueta</label>
                  <Input
                    value={sub.label || ''}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      const newKey = newLabel
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, '_')
                        .replace(/[^\w-]+/g, '');
                      handleUpdateSub(idx, { label: newLabel, key: newKey });
                    }}
                    placeholder="Ej. Nombre"
                    className="font-bold text-xs h-8"
                  />
                </div>

                {/* Tipo de dato simple */}
                <div className="w-full md:w-36 space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Tipo</label>
                  <Select
                    value={sub.type || 'text'}
                    onValueChange={(val) => {
                      const patch: any = { type: val };
                      if (val === 'relation') {
                        patch.config = {
                          relation: { entity: '', parent_key: 'id' }
                        };
                      }
                      handleUpdateSub(idx, patch);
                    }}
                  >
                    <SelectTrigger className="h-8 font-bold text-xs bg-muted/5 border-muted/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text" className="font-bold text-xs">Texto</SelectItem>
                      <SelectItem value="number" className="font-bold text-xs">Número</SelectItem>
                      <SelectItem value="date" className="font-bold text-xs">Fecha</SelectItem>
                      <SelectItem value="boolean" className="font-bold text-xs">Booleano</SelectItem>
                      <SelectItem value="relation" className="font-bold text-xs">Relación (FK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Relación simple */}
                {sub.type === 'relation' && (
                  <div className="w-full md:w-36 space-y-1 animate-in fade-in duration-200">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Relacionado</label>
                    <Select
                      value={sub.config?.relation?.entity || ''}
                      onValueChange={(val) => {
                        handleUpdateSub(idx, {
                          config: {
                            relation: { entity: val, parent_key: 'id' }
                          }
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 font-bold text-xs bg-primary/5 border-primary/20 text-primary">
                        <SelectValue placeholder="Blueprint" />
                      </SelectTrigger>
                      <SelectContent>
                        {schemas.filter((s: any) => s.data?.name).map((s: any) => (
                          <SelectItem key={s.id} value={s.data.name} className="font-bold text-xs">
                            {s.data.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Slug key */}
                <div className="w-full md:w-28 space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Key (Slug)</label>
                  <div className="h-8 px-2 border bg-muted/20 rounded-md flex items-center justify-between text-[10px] font-mono font-bold text-primary truncate select-all">
                    <span>{sub.key || autoSlug || 'key'}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="shrink-0 flex items-end pt-4 md:pt-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSub(idx)}
                    className="w-8 h-8 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          onClick={handleAddSub}
          variant="outline"
          size="sm"
          className="text-[9px] font-black uppercase tracking-widest border-dashed gap-1 h-8 rounded-lg"
        >
          <Plus size={10} /> Añadir Sub-campo
        </Button>
      </div>
    </div>
  );
}

// 7. AGNOSTIC FORM EMBED (REQ 6 - Dynamic Live Data Capture Form)
interface AgnosticFormEmbedProps {
  schemaName: string;
  fields: any[];
  isDirty: boolean;
}

function AgnosticFormEmbed({ schemaName, fields, isDirty }: AgnosticFormEmbedProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { saveItem } = useAppDispatch();

  const handleInputChange = (key: string, val: any) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    // Validar requeridos
    const missing = fields
      .filter(f => f.required && (formData[f.key] === undefined || formData[f.key] === ''))
      .map(f => f.label || f.key);

    if (missing.length > 0) {
      toast.error(`Campos requeridos pendientes: ${missing.join(', ')}`);
      return;
    }

    try {
      await saveItem(schemaName, {
        id: crypto.randomUUID(),
        context: schemaName,
        data: formData
      });

      toast.success(
        <div className="space-y-1 text-left">
          <p className="font-bold text-xs uppercase tracking-wider text-primary">¡Registro Guardado en Caliente!</p>
          <pre className="text-[9px] font-mono p-2 bg-muted/20 rounded border border-border/40 leading-tight max-h-32 overflow-y-auto w-64 select-all">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>,
        { duration: 5000 }
      );
      // Limpiar form
      setFormData({});
    } catch (e: any) {
      toast.error(`Error al persistir registro: ${e.message || e}`);
    }
  };

  return (
    <div className="space-y-6 py-4">
      {isDirty && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl p-3 text-[9px] uppercase tracking-widest font-black leading-relaxed flex items-center gap-2">
          <Info size={14} className="shrink-0" />
          <span>Advertencia: Tienes cambios locales sin guardar. El formulario usa la última versión guardada.</span>
        </div>
      )}

      <div className="space-y-4">
        {fields.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
            Este esquema no tiene campos definidos para capturar.
          </div>
        ) : (
          fields.map((field) => {
            const label = field.label || field.key;
            const key = field.key;

            return (
              <div key={field.id} className="space-y-1.5 text-left">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  {label} {field.required && <span className="text-destructive">*</span>}
                </label>

                {field.type === 'boolean' ? (
                  <div className="flex items-center gap-2 py-1.5">
                    <input
                      type="checkbox"
                      id={`embed-${key}`}
                      checked={!!formData[key]}
                      onChange={(e) => handleInputChange(key, e.target.checked)}
                      className="w-4 h-4 rounded border-muted/80 bg-muted/5 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                    />
                    <label htmlFor={`embed-${key}`} className="text-xs font-semibold text-foreground select-none cursor-pointer">
                      Activo / Verdadero
                    </label>
                  </div>
                ) : field.type === 'select' ? (
                  <Select
                    value={formData[key] || ''}
                    onValueChange={(val) => handleInputChange(key, val)}
                  >
                    <SelectTrigger className="h-9 font-semibold text-xs bg-muted/5 border-muted/80 focus:ring-primary/20">
                      <SelectValue placeholder="Seleccionar opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || field.config?.options || []).map((opt: any) => (
                        <SelectItem key={opt.value} value={opt.value} className="font-semibold text-xs">
                          {opt.label || opt.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    value={formData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className="font-semibold text-xs bg-muted/5 border-muted/80 min-h-20"
                  />
                ) : field.type === 'date' ? (
                  <Input
                    type="date"
                    value={formData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="font-semibold text-xs h-9 bg-muted/5 border-muted/80"
                  />
                ) : field.type === 'number' ? (
                  <Input
                    type="number"
                    value={formData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className="font-semibold text-xs h-9 bg-muted/5 border-muted/80"
                  />
                ) : field.type === 'object' || field.type === 'array_of_objects' ? (
                  <div className="border border-dashed rounded-xl p-3 bg-muted/5 space-y-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">
                      Estructura Interna ({field.type === 'object' ? 'Objeto' : 'Lista'})
                    </p>
                    {(field.fields || []).map((subField: any) => (
                      <div key={subField.id} className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                          {subField.label || subField.key}
                        </label>
                        <Input
                          value={formData[`${key}.${subField.key}`] || ''}
                          onChange={(e) => handleInputChange(`${key}.${subField.key}`, e.target.value)}
                          placeholder="Sub-valor..."
                          className="font-semibold text-xs h-8 bg-background border-muted/80"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Input
                    type="text"
                    value={formData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    className="font-semibold text-xs h-9 bg-muted/5 border-muted/80"
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={fields.length === 0}
          className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md"
        >
          <Sparkles size={12} /> Guardar Registro
        </Button>
      </div>
    </div>
  );
}

