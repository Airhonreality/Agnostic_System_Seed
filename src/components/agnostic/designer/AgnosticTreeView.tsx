'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, ExternalLink, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

/**
 * 🏛️ ARTEFACTO: AgnosticTreeView.tsx
 * ────────────
 * CAPA: Designer (Universal Components)
 * VERSIÓN: 1.0
 * COMMIT: P3-M2.1-TREEVIEW-REUSABLE
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Renderizar de forma interactiva y jerárquica las estructuras del sistema (rutas, schemas, scripts).
 * - Proveer navegación limpia y unificada con soporte de expansiones y estados visuales premium.
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Ser un componente puro libre de peticiones de red directas.
 * - NEVER: Duplicar lógica de pintado jerárquico; consumir recursivamente la estructura de nodos.
 * - ALWAYS: Usar tokens estandarizados de diseño de shadcn/ui.
 */

export interface TreeNode {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  badge?: string | number;           // "3 blocks", "5 fields"
  children?: TreeNode[];
  isExpandable?: boolean;
  data?: any;                        // el record completo para el editor (null si no es seleccionable)
  isVirtualRoot?: boolean;           // Indica si es una raíz virtual estática (no seleccionable, abierta por defecto)
  onAdd?: () => void;                // Callback para creación rápida inline
  addLabel?: string;                 // Tooltip para el botón de creación rápida
}

interface AgnosticTreeViewProps {
  nodes: TreeNode[];
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  onReorder?: (category: 'routes' | 'schemas' | 'scripts', activeId: string, overId: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  emptyMessage?: string;
}

export function AgnosticTreeView({
  nodes,
  selectedId,
  onSelect,
  onReorder,
  onAdd,
  addLabel = 'Agregar',
  emptyMessage = 'No hay elementos disponibles.'
}: AgnosticTreeViewProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const category = active.data.current?.category;
      if (category && onReorder) {
        onReorder(category, active.id as string, over.id as string);
      }
    }
  };

  const renderContent = () => {
    return (
      <div className="space-y-1">
        {nodes.map(node => {
          const category =
            node.id === 'root-routes'
              ? 'routes'
              : node.id === 'root-schemas'
              ? 'schemas'
              : node.id === 'root-logic'
              ? 'scripts'
              : undefined;

          return (
            <TreeItem
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={onSelect}
              category={category}
              onReorder={onReorder}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {onAdd && (
        <Button 
          onClick={onAdd} 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 border-dashed border-primary/20 hover:border-primary/50 text-xs font-black tracking-widest uppercase py-4"
        >
          <Plus size={14} />
          {addLabel}
        </Button>
      )}

      {nodes.length === 0 ? (
        <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl bg-muted/10">
          {emptyMessage}
        </div>
      ) : isMounted && onReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          {renderContent()}
        </DndContext>
      ) : (
        renderContent()
      )}
    </div>
  );
}

function TreeItem({ 
  node, 
  selectedId, 
  onSelect,
  category,
  onReorder
}: { 
  node: TreeNode; 
  selectedId: string | null; 
  onSelect: (node: TreeNode) => void; 
  category?: 'routes' | 'schemas' | 'scripts';
  onReorder?: (category: 'routes' | 'schemas' | 'scripts', activeId: string, overId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(!!node.isVirtualRoot);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isExpandable = node.isExpandable || hasChildren;
  const Icon = node.icon;

  const isSortable = !!category && !node.isVirtualRoot && node.data !== null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable(isSortable ? { id: node.id, data: { category } } : { id: 'dummy' });

  const style = isSortable ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  } : undefined;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isVirtualRoot) {
      setIsOpen(!isOpen);
      return;
    }
    if (node.data === null) {
      setIsOpen(!isOpen);
      return; // No es seleccionable
    }
    onSelect(node);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const renderItemContent = () => (
    <div 
      className={cn(
        "flex items-center w-full px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors group",
        isSelected 
          ? "bg-accent text-accent-foreground font-bold" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        node.isVirtualRoot && "hover:bg-transparent cursor-default font-black uppercase tracking-wider text-[10px] text-primary/80 mt-2 border-b border-border/10 pb-1"
      )}
      onClick={handleSelect}
    >
      {/* Drag Handle for sortable elements */}
      {isSortable && (
        <div 
          {...attributes} 
          {...listeners} 
          className="p-1 rounded cursor-grab hover:bg-accent/80 active:cursor-grabbing text-muted-foreground/50 hover:text-foreground shrink-0 mr-1 transition-colors"
          title="Arrastrar para reordenar"
        >
          <GripVertical size={12} />
        </div>
      )}

      {/* Toggle Chevron */}
      {isExpandable ? (
        <div 
          onClick={handleToggle}
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mr-1 cursor-pointer"
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      ) : (
        <div className="w-6 shrink-0" />
      )}

      {/* Node Icon */}
      {Icon && (
        <Icon 
          size={14} 
          className={cn(
            "mr-2 shrink-0", 
            isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
            node.isVirtualRoot && "text-primary/70"
          )} 
        />
      )}

      {/* Label */}
      <span className={cn("flex-1 truncate", node.isVirtualRoot && "select-none")}>{node.label}</span>

      {/* Inline Creation Button (REQ 2) */}
      {node.isVirtualRoot && node.onAdd && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            node.onAdd!();
          }}
          variant="ghost"
          size="icon"
          className="w-5 h-5 rounded-md hover:bg-primary/10 hover:text-primary text-muted-foreground shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title={node.addLabel || 'Añadir'}
        >
          <Plus size={12} />
        </Button>
      )}

      {/* Hover Link Button for Routes only */}
      {node.data?.data?.path && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            window.open(node.data.data.path, '_blank');
          }}
          className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
          title="Abrir Ruta en pestaña nueva"
        >
          <ExternalLink size={11} />
        </div>
      )}

      {/* Badge */}
      {node.badge !== undefined && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40 ml-2 group-hover:bg-muted/80">
          {node.badge}
        </span>
      )}
    </div>
  );

  const renderChildren = () => {
    if (!isExpandable || !isOpen || !hasChildren) return null;

    const childrenContent = (
      <div className="pl-4 border-l border-border ml-3.5 mt-1 space-y-1">
        {node.children!.map(child => (
          <TreeItem 
            key={child.id} 
            node={child} 
            selectedId={selectedId} 
            onSelect={onSelect} 
            category={category}
            onReorder={onReorder}
          />
        ))}
      </div>
    );

    if (node.isVirtualRoot && category) {
      const sortableItems = node.children!
        .filter(c => c.data !== null)
        .map(c => c.id);

      return (
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {childrenContent}
        </SortableContext>
      );
    }

    return childrenContent;
  };

  return (
    <div 
      ref={isSortable ? setNodeRef : undefined} 
      style={style} 
      className="select-none space-y-1"
    >
      {renderItemContent()}
      {renderChildren()}
    </div>
  );
}
