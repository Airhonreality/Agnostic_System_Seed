/**
 * 🏛️ ARTEFACTO: RecursiveBlockComposer.tsx
 * ────────────
 * CAPA: Staging (Block Architecture)
 * VERSIÓN: 4.5
 * COMMIT: P3-M3.4-RELATIONAL-INFERENCE
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Composición jerárquica y recursiva de bloques de interfaz (Fractal UI).
 * - Orquestación de ajustes dinámicos basados en DNA y Bóvedas.
 * - Motor de Inferencia Relacional (Auto-discovery of Foreign Keys).
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Utilizar nomenclatura snake_case para todas las claves de arquitectura.
 * - MUST: Intentar inferir la relación jerárquica basándose en el contexto del padre.
 * - ALWAYS: Proveer una vista previa en tiempo real (Live Preview) de la proyección.
 * 
 * 📜 ADR: [2026-05-11] AUTOMATED_RELATION_INFERENCE
 * - DECISIÓN: Implementar un motor de descubrimiento de claves foráneas en el diseñador.
 * - MOTIVO: Reducir el error humano y la carga cognitiva al configurar estructuras fractales complejas.
 * - IMPACTO: Flujo de trabajo acelerado; el arquitecto solo confirma lo que el sistema infiere.
 */
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Trash2, Plus, ChevronDown, ChevronRight, Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/core/i18n/useTranslation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AgnosticLogicEngine } from '@/lib/agnostic/AgnosticLogicEngine';
import { AgnosticConfigProjector } from '@/components/agnostic/modules/AgnosticConfigProjector';
import { registry } from '@/lib/agnostic/Registry';
import blockSettingsSchema from '@/core/designer/dna/block_settings.schema.json';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface RecursiveBlockComposerProps {
  block: any;
  schemas: any[];
  tokens?: any[];
  onUpdate: (patch: any) => void;
  onRemove: () => void;
  depth?: number;
  parentContext?: string; // 🛰️ Context of the parent block for inference
  hideChildren?: boolean;
}

export function RecursiveBlockComposer({ 
  block, 
  schemas, 
  tokens = [],
  onUpdate, 
  onRemove, 
  depth = 0,
  parentContext,
  hideChildren = false
}: RecursiveBlockComposerProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  
// Categorized block options (E1 Fix)
const BLOCK_CATEGORIES = [
  { label: 'Layout / Contenedores', items: [{ value: 'frame', label: 'Frame (Contenedor)' }] },
  { label: 'Contenido Visual', items: [
    { value: 'text', label: 'Texto' }, { value: 'image', label: 'Imagen' },
    { value: 'card_static', label: 'Tarjeta Estática' }, { value: 'stats_grid', label: 'Métricas' },
    { value: 'testimonial', label: 'Testimonio' }, { value: 'cta_banner', label: 'CTA Banner' },    
    { value: 'divider', label: 'Divisor' }, { value: 'spacer', label: 'Espacio' },
  ]},
  { label: 'Datos del DNA', items: [
    { value: 'form', label: 'Formulario' }, { value: 'table', label: 'Tabla' },
    { value: 'collection', label: 'Colección' }, { value: 'action', label: 'Acción' },
  ]},
];

// Flat representation for internal registries mapping
const staticBlockOptions = BLOCK_CATEGORIES.flatMap(cat => cat.items);



  const updateBlock = (patch: any) => onUpdate(patch);

  // 🧠 RELATION INFERENCE ENGINE
  useEffect(() => {
    if (depth > 0 && parentContext && block.schema_id && !block.config?.parent_key) {
      // 🧬 Búsqueda Dual/Triple (ID, Slug o Name)
      const selectedSchema = schemas.find(s => s.id === block.schema_id || s.data?.slug === block.schema_id || s.data?.name === block.schema_id);
      if (selectedSchema) {
        const relationField = selectedSchema.data.fields?.find((f: any) => 
          f.type === 'relation' && 
          f.config?.relation?.entity === parentContext
        );
        
        const parentKeyCandidate = relationField?.key || `${parentContext.replace('_def', '')}_id`;
        const hasMatch = selectedSchema.data.fields?.some((f: any) => f.key === parentKeyCandidate);
        
        if (hasMatch) {
          console.log(`[Inference] Auto-linking ${block.title} to ${parentContext} via ${parentKeyCandidate}`);
          updateBlock({ config: { ...(block.config || {}), parent_key: parentKeyCandidate } });
        }
      }
    }
  }, [block.schema_id, parentContext, depth]);

  // 🏛️ SYNC LOGIC: Cuando cambia schema_id, inferimos el context desde el schema
  useEffect(() => {
    if (block.schema_id) {
      const selectedSchema = schemas.find(s => s.id === block.schema_id || s.data?.slug === block.schema_id || s.data?.name === block.schema_id);
      const schemaName = selectedSchema?.data?.name;
      
      if (schemaName && schemaName !== block.context) {
        console.log(`[Sovereignty] Auto-linking context: ${schemaName} for schema: ${block.schema_id}`);
        updateBlock({ context: schemaName });
      }
    }
  }, [block.schema_id, schemas]);

  const dnaSections = React.useMemo(() => {
    const selectedSchema = schemas.find(s => s.id === block.schema_id || s.data?.slug === block.schema_id || s.data?.name === block.schema_id);
    if (!selectedSchema) return [];
    const sections = new Set(selectedSchema.data?.fields?.map((f: any) => f.section).filter(Boolean));
    return Array.from(sections).map(s => ({ label: s, value: s }));
  }, [block.schema_id, schemas]);

  const dnaFields = React.useMemo(() => {
    const selectedSchema = schemas.find(s => s.id === block.schema_id || s.data?.slug === block.schema_id || s.data?.name === block.schema_id);
    if (!selectedSchema) return [];
    return (selectedSchema.data?.fields || []).map((f: any) => ({ 
      label: `${f.label} (${f.key})`, 
      value: f.key 
    }));
  }, [block.schema_id, schemas]);

  const canonicalSchemaId = React.useMemo(() => {
    if (!block.schema_id) return '';
    const match = schemas.find(
      (s: any) =>
        s.id === block.schema_id ||
        s.data?.slug === block.schema_id ||
        s.data?.name === block.schema_id
    );
    return match?.id || block.schema_id;
  }, [block.schema_id, schemas]);

  const configResolvers = {
    block_registry: staticBlockOptions.map((b: any) => ({ label: b.label, value: b.value })),
    dna_registry: schemas.map(s => ({ label: s.data?.name || s.id, value: s.id })),
    logic_engine_registry: AgnosticLogicEngine.getRegisteredFunctions(),
    style_registry: ['system', 'brand', 'luxury', 'info'],
    dna_sections: dnaSections,
    dna_fields: dnaFields
  };



  return (
    <div className={cn(
      "group relative flex flex-col mb-6 transition-all duration-300",
      depth > 0 && "ml-8 pl-6 border-l-2 border-dashed border-primary/20 bg-primary/[0.002]"
    )}>
      
      {/* 🛠️ SITEMAP NODE ROW (Fila simplificada y ultra usable) */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-background border rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all relative">
        
        {/* Selector de Tipo de Bloque */}
        <div className="w-32 shrink-0">
          <Select
            value={block.type || ''}
            onValueChange={(val) => updateBlock({ type: val })}   
          >
            <SelectTrigger className="h-9 text-[10px] font-black uppercase tracking-wider border-primary/20 bg-primary/5 focus:ring-0">
              <SelectValue placeholder="Tipo..." />
            </SelectTrigger>
            <SelectContent>
              {BLOCK_CATEGORIES.map((cat, idx) => (
                <SelectGroup key={idx}>
                  <SelectLabel className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 px-2 py-1.5">
                    {cat.label}
                  </SelectLabel>
                  {cat.items.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="text-xs font-semibold pl-4">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input de Título del Bloque — escribe en block.config.label (fuente única) */}
        <div className="flex-1 min-w-0">
          <Input
            value={block.config?.label ?? block.title ?? ''}
            onChange={(e) => onUpdate({ config: { ...(block.config || {}), label: e.target.value } })}
            placeholder="Etiqueta del bloque..."
            className="font-bold text-xs h-9 border-none bg-transparent hover:bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/20 px-2 rounded-lg"
          />
        </div>

        {/* Selector de DNA Schema Directo (Solo para bloques que proyectan datos) */}
        {['form', 'table', 'collection'].includes(block.type) && (
          <div className="w-56 shrink-0 flex items-center gap-2 animate-in fade-in duration-200">
            <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">DNA:</span>
            <Select 
              value={canonicalSchemaId || undefined} 
              onValueChange={(val) => updateBlock({ schema_id: val })}
            >
              <SelectTrigger className="h-8 text-xs font-semibold bg-muted/10 border-muted/50 focus:ring-0">
                <SelectValue placeholder="Seleccionar esquema..." />
              </SelectTrigger>
              <SelectContent>
                {schemas.map((s: any) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">
                    {s.data?.name || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Acciones de Nodo */}
        <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsConfigOpen(true)}
            className="w-8 h-8 rounded-xl text-primary/70 hover:text-primary hover:bg-primary/5"
            title="Configurar Parámetros"
          >
            <Settings2 size={15} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRemove}
            className="w-8 h-8 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/5"
            title="Eliminar Bloque"
          >
            <Trash2 size={15} />
          </Button>
        </div>

      </div>

      {/* 🧬 LATERAL CONFIGURATION SHEET (Revelación Progresiva - Cero Colapsación) */}
      <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <SheetContent className="sm:max-w-xl md:max-w-2xl overflow-y-auto h-full p-8 rounded-l-3xl border-l shadow-2xl space-y-6">
          <SheetHeader className="border-b pb-4 mb-6">
            <SheetTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-primary animate-pulse" /> Configuración Paramétrica
            </SheetTitle>
            <SheetDescription className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
              Personaliza el comportamiento, diseño y relaciones de datos
            </SheetDescription>
          </SheetHeader>



          {/* Formulario de Configuración Proyectado Verticalmente */}
          <div className="space-y-4">
            <AgnosticConfigProjector
              schema={registry.getMetadata(block.type)?.settings_schema || blockSettingsSchema}
              data={block.config || {}}
              onUpdate={(patch) => onUpdate({ config: { ...(block.config || {}), ...patch } })}
              resolvers={configResolvers}
              tokens={tokens}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 🌲 RECURSIVIDAD Y SUB-BLOQUES */}
      {block.type === 'frame' && (
        <div className="mt-4 pl-4 border-l border-muted/30">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              Hijos del Contenedor ({block.blocks?.length || 0})
            </div>
            
            <Button 
              onClick={() => updateBlock({ blocks: [...(block.blocks || []), { id: crypto.randomUUID(), type: 'frame', title: 'Nuevo Frame', direction: 'vertical', blocks: [] }] })}
              variant="outline" 
              size="sm" 
              className="h-8 rounded-xl border-dashed border-primary/20 text-[9px] font-black tracking-widest gap-2 px-3 hover:bg-primary/5 transition-all"
            >
              <Plus size={12} /> AÑADIR HIJO AL FRAME
            </Button>
          </div>

          {!hideChildren && isExpanded && block.blocks?.map((subBlock: any, subIdx: number) => (
            <RecursiveBlockComposer
              key={subBlock.id || subIdx}
              block={subBlock}
              schemas={schemas}
              tokens={tokens}
              depth={depth + 1}
              parentContext={block.context}
              onUpdate={(patch) => {
                const newBlocks = [...(block.blocks || [])];
                newBlocks[subIdx] = { ...newBlocks[subIdx], ...patch };
                updateBlock({ blocks: newBlocks });
              }}
              onRemove={() => {
                updateBlock({ blocks: (block.blocks || []).filter((_: any, i: number) => i !== subIdx) });
              }}
            />
          ))}
        </div>
      )}

    </div>
  );
}
