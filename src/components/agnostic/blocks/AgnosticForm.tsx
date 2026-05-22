/**
 * 🏛️ ARTEFACTO: AgnosticForm.tsx
 * ────────────
 * CAPA: Projection (Decentralized Blocks)
 * VERSIÓN: 8.0
 * COMMIT: P3-M4.2-ATOMIC-FORM
 * ADR: [adr_v8_0_deterministic_state.md]
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Proyección de interfaces de captura de datos (Forms) vía DNA/Schemas.
 * - Sincronización atómica de materia con la capa de persistencia.
 * - Inferencia de contexto operativo (Axiomatic Gravity).
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Ser ciego a la navegación (delegar redirecciones al Orchestrator).
 * - NEVER: Importar 'useRouter' o hooks de navegación de Next.js.
 * - NEVER: Gestionar lógica de negocio compleja (usar AgnosticLogicEngine).
 * 
 * 📜 ADR: [2026-05-07] DYNAMIC_CONTEXT_INFERENCE
 * - DECISIÓN: Permitir que el formulario infiera el contexto de datos desde el sistema si no se provee un schemaId.
 * - MOTIVO: Aumentar la agilidad de desarrollo y reducir la verbosidad del DNA (Axioma 2).
 * - IMPACTO: Capacidad de proyectar formularios CRUD instantáneos sobre cualquier materia.
 * 
 * 🔗 RELATIONSHIPS:
 * - UPSTREAM: [useMateriaStore, useDNAStore, useActiveRecord]
 * - DOWNSTREAM: [AgnosticRenderer]
 */
'use client';

import React from 'react';
import { useMateriaStore, useDNAStore } from '@/lib/agnostic/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Shadcn/UI Components
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Sparkles, Box, ArrowRight, ChevronRight, Plus, Check, AlertCircle } from 'lucide-react';
import { getModuleIcon } from '@/lib/agnostic/constants';
import { AgnosticLogicEngine } from '@/lib/agnostic/AgnosticLogicEngine';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// import { useAppDispatch } from '@/context/AppContext'; // 🚫 ELIMINADO PARA ROMPER BUCLE CIRCULAR

import { useRelationData } from '@/lib/agnostic/hooks/useRelationData';
import { SmartImageInput } from '@/components/ui/SmartImageInput';
import { registerForm } from '@/lib/agnostic/formRegistry';

interface AgnosticFormProps {
  schemaId?: string;
  schema?: any; // 🧬 Manual Schema Injection
  record?: any; // 🏺 Manual Record Injection
  activeRecord?: any; // 🏺 Manual Active Record Injection
  context?: string; 
  section?: string;
  className?: string;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  defaultCollapsed?: boolean;
  defaultExpanded?: boolean; // 👁️ Added from Designer settings
  isCollapsible?: boolean;   // 👁️ Added from Designer settings
  projection?: string[];
  onSubmit?: (data: any) => void;
  onSuccess?: (record: any) => void;
  onFieldChange?: (key: string, value: any, allData: any) => void; // ⚡ Live Preview Hook
  onSave?: (updatedRecord: any) => void; // 💾 Direct Save Hook
  segmentation_key?: string;
  segmentation_strategy?: 'none' | 'tabs' | 'steps' | 'select';
  segmentation_zap?: string;
  blockConfig?: any;
  api?: any;
  hideSubmit?: boolean;
  visible_fields?: string[];
}

function RelationField({ 
  field, 
  formData, 
  handleFieldChange, 
  searchQuery,
  setSearchQuery
}: { 
  field: any; 
  formData: Record<string, any>; 
  handleFieldChange: (key: string, value: any) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const { schemas } = useDNAStore();
  const rel = field.config?.relation;
  const { data: options, isLoading } = useRelationData(rel?.entity);

  const relatedSchema = rel
    ? schemas.find((s: any) => s.id === rel.entity || s.data?.name === rel.entity || s.data?.slug === rel.entity)?.data
    : null;
  const relFields = Array.isArray(relatedSchema?.fields) ? (relatedSchema.fields as any[]) : [];
  const displayKey = field.config?.relation?.displayField ||
                     field.config?.relation?.display_field ||
                     relFields.find((f: any) => f.isPrimary || f.config?.isPrimary)?.key ||
                     relFields.find((f: any) => ['name','nombre','descripcion','label','title'].includes(f.key))?.key ||
                     'name';

  const q = searchQuery.toLowerCase();
  const filtered = q
    ? options.filter((item: any) => String(item.data?.[displayKey] || '').toLowerCase().includes(q))
    : options;

  return (
    <Select
      name={field.key}
      value={String(formData[field.key] || '')}
      onValueChange={(val) => handleFieldChange(field.key, val)}
      required={field.required}
    >
      <SelectTrigger className="flex-1 rounded-md border-border/30 bg-secondary/5 h-9 font-bold text-xs focus:ring-0 focus:border-primary/40 px-3">
        <SelectValue placeholder={isLoading ? 'Cargando...' : 'Seleccionar...'} />
      </SelectTrigger>
      <SelectContent className="rounded-md border border-border bg-popover shadow-md max-h-60 overflow-y-auto z-[9999]">
        <div className="p-2 border-b sticky top-0 bg-popover z-50">
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-8 text-[10px] font-bold uppercase tracking-wider"
          />
        </div>
        {isLoading ? (
          <div className="p-3 text-[10px] text-center text-muted-foreground font-bold uppercase tracking-wider animate-pulse">
            Cargando opciones...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-[10px] text-center text-muted-foreground font-bold uppercase tracking-wider">
            No se encontraron resultados
          </div>
        ) : (
          <>
            {filtered.map((item: any) => {
              const label = (() => {
                for (const k of [displayKey, 'name', 'nombre', 'descripcion', 'label', 'title']) {
                  const val = item.data?.[k];
                  if (val !== undefined && val !== null && String(val).trim() !== '') return String(val);
                }
                return item.id;
              })();
              return (
                <SelectItem key={item.id} value={String(item.id)} className="text-xs font-semibold text-foreground">
                  {label}
                </SelectItem>
              );
            })}
            {filtered.length > 100 && (
              <div className="p-2 text-[9px] text-center text-muted-foreground/60 font-semibold bg-muted/20 border-t uppercase tracking-wider">
                {filtered.length} resultados — usa la búsqueda para filtrar
              </div>
            )}
          </>
        )}
      </SelectContent>
    </Select>
  );
}

export function AgnosticForm({ 
  schema, 
  activeRecord,
  context = 'system', 
  section, 
  className,
  title,
  subtitle,
  hideHeader = false,
  defaultCollapsed = false,
  defaultExpanded, // 👁️ Destructured
  isCollapsible,   // 👁️ Destructured
  projection,
  onSubmit,
  onSuccess,
  onFieldChange,
  onSave,
  segmentation_key,
  segmentation_strategy = 'none',
  segmentation_zap,
  schemaId, // Still kept in props but used primarily for ID generation
  blockConfig,
  api,
  hideSubmit,
  visible_fields
}: AgnosticFormProps) {
  const { data: materiaStore } = useMateriaStore();
  const { schemas } = useDNAStore();
  // const { saveItem } = useAppDispatch(); // 🚫 DESACOPLADO AXIOMÁTICAMENTE
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = React.useRef(false);
  const effectiveHideSubmit = !!(hideSubmit || blockConfig?.hideSubmit || blockConfig?.visual?.hide_submit || blockConfig?.switches?.includes('hide_submit'));
  const [isExpanded, setIsExpanded] = React.useState(
    defaultExpanded !== undefined ? !!defaultExpanded : !defaultCollapsed
  );
  const [activeSegment, setActiveSegment] = React.useState<string | null>(null);
  const [visibleSegments, setVisibleSegments] = React.useState<string[]>([]);
  const [relationModalField, setRelationModalField] = React.useState<any | null>(null);
  const [searchQueries, setSearchQueries] = React.useState<Record<string, string>>({});
  
  // Initialize form data from record. No useEffect sync needed because key strategy handles remounts.
  const [formData, setFormData] = React.useState<Record<string, any>>(activeRecord?.data || {});

  // Refs updated synchronously each render so registry/save always reads latest values
  const persistDataRef = React.useRef<any>(null);
  const formDataRef = React.useRef(formData);
  formDataRef.current = formData;

  const formId = React.useId();
  React.useEffect(() => {
    return registerForm(formId, () => persistDataRef.current(formDataRef.current));
  }, [formId]);

  // ⚡ HOT LOOP: Compute derivations on every change
  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      const computed = AgnosticLogicEngine.compute(schema, next, materiaStore);
      if (onFieldChange) onFieldChange(key, value, computed);
      return computed;
    });
    if (effectiveHideSubmit) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        persistDataRef.current(formDataRef.current, { silent: true });
      }, 800);
    }
  };

  // 🧩 RESOLVE ALL POTENTIAL SEGMENTS
  const allSegments = React.useMemo(() => {
    if (!segmentation_key) return [];
    const field = schema?.fields?.find((f: any) => f.key === segmentation_key);
    return field?.options?.map((o: any) => o.value) || [];
  }, [segmentation_key, schema]);

  // 🧠 Fase 7: LOGIC-DRIVEN PIVOT (System Capability)
  React.useEffect(() => {
    async function resolveReality() {
      const filtered = await AgnosticLogicEngine.getVisibleSegments(
        context, 
        activeRecord || { data: formData }, 
        allSegments, 
        segmentation_zap
      );
      setVisibleSegments(filtered);
      if (filtered.length > 0 && (!activeSegment || !filtered.includes(activeSegment))) {
        setActiveSegment(filtered[0]);
      }
    }
    resolveReality();
  }, [allSegments, activeRecord, formData, context, segmentation_zap]);

  // 🛡️ AXIOMATIC GUARD: No schema, no form. (Colocado después de los hooks para cumplir con las Rules of Hooks)
  if (!schema) {
    return (
      <div className="p-8 border border-dashed rounded-xl text-center">
        <p className="text-xs font-bold uppercase opacity-30">Definición de esquema no encontrada</p>
      </div>
    ); 
  }



  // 🛰️ DEFENSIVE FIELD RESOLUTION
  const fields = Array.isArray(schema.fields) ? schema.fields : [];

  let allFields = fields;

  // Normalize: Designer stores as comma-string, direct JSON can be string[].
  const rawVF = visible_fields || blockConfig?.visible_fields || blockConfig?.visual?.visible_fields;
  const effectiveVisibleFields: string[] | undefined = typeof rawVF === 'string'
    ? rawVF.split(',').map((s: string) => s.trim()).filter(Boolean)
    : rawVF;
  if (Array.isArray(effectiveVisibleFields) && effectiveVisibleFields.length > 0) {
    allFields = allFields.filter((f: any) => effectiveVisibleFields.includes(f.key));
  } else if (section) {
    allFields = allFields.filter((f: any) => f.section === section || (f.section === undefined && section === 'General'));
  }

  const sections: Record<string, any[]> = {};
  allFields.forEach((f: any) => {
    const sectionName = f.section || 'General';
    if (!sections[sectionName]) sections[sectionName] = [];
    sections[sectionName].push(f);
  });

  const noFieldsAvailable = allFields.length === 0;

  const persistData = async (currentData: Record<string, any>, options?: { silent?: boolean }) => {
    const isSilent = !!options?.silent;
    
    if (isSaving) {
      if (isSilent) {
        pendingSaveRef.current = true;
      }
      return;
    }
    
    setIsSaving(true);
    if (isSilent) {
      setSaveStatus('saving');
    }
    
    try {
      const { id: formId, ...data } = currentData;
      const savedRecord = { id: formId || activeRecord?.id, context, data };
      
      if (onSave) {
        // Direct save hook for internal components (System, DNS, etc.)
        await onSave(savedRecord);
        if (!isSilent) toast.success(`Sincronización Interna Completa`);
      } else if (onSubmit) {
        onSubmit(data);
      } else if (api) {
        // 🏛️ AXIOMATIC ALIGNMENT: Utilizar el bridge unificado para despachar
        await api.dispatch({
          action: 'UPSERT',
          context,
          payload: savedRecord
        });
        if (!isSilent) toast.success(`Persistencia Atómica Exitosa`);
      } else {
        // 🛡️ FALLBACK: Si no hay onSave/onSubmit/api, el bloque tonto no puede persistir por sí solo
        console.warn(`[AgnosticForm] Intento de persistencia sin dispatcher. Context: ${context}`);
        if (!isSilent) toast.error("Persistencia no configurada para este bloque");
      }

      if (isSilent) {
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus(current => current === 'saved' ? 'idle' : current);
        }, 2000);
      }

      // ⚡ post-save event triggers execution loop
      const triggers = blockConfig?.triggers || [];
      if (triggers.length > 0) {
        const scripts = useMateriaStore.getState().data['scripts'] ?? [];
        const mockAPI = {
          getContext: () => context,
          getSchema: () => schema,
          notify: {
            success: (msg: string) => !isSilent && toast.success(msg),
            error: (msg: string) => !isSilent && toast.error(msg)
          }
        };
        for (const triggerName of triggers) {
          const scriptRecord = scripts.find(s => (s.data as any)?.name === triggerName);
          if ((scriptRecord?.data as any)?.code) {
            try {
              const fn = new Function('record', 'api', String((scriptRecord?.data as any)?.code));
              fn(savedRecord, mockAPI);
            } catch (e) {
              console.error(`[Trigger] Script "${triggerName}" failed:`, e);
            }
          }
        }
      }
    } catch (err) {
      if (isSilent) {
        setSaveStatus('error');
      } else {
        toast.error("Error al guardar en el servidor");
      }
    } finally {
      setIsSaving(false);
      // Handle pending save race conditions
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        setTimeout(() => {
          persistDataRef.current(formDataRef.current, { silent: true });
        }, 50);
      }
    }
  };

  persistDataRef.current = persistData;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    persistData(Object.fromEntries(formData.entries()));
  };

  const renderGrid = (fieldList: any[]) => (
    <div className="grid grid-cols-12 gap-x-4 gap-y-4">
      {fieldList.map((field) => {
        const spanMap: Record<string, string> = {
          'full':    'col-span-12',
          'half':    'col-span-12 @lg:col-span-6',
          'third':   'col-span-12 @lg:col-span-4',
          'quarter': 'col-span-12 @lg:col-span-3'
        };
        const isSection = field.type === 'section';
        const isInfo = field.type === 'info';
        const isDerived = !!field.config?.derivation;
        const colSpan = (isSection || isInfo) ? 'col-span-12' : (spanMap[field.width] || 'col-span-12 @lg:col-span-4');

        if (isSection) {
          return (
            <div key={field.key} className="col-span-12 mt-6 mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 whitespace-nowrap">
                  {field.label}
                </span>
                <Separator className="flex-1 opacity-20" />
              </div>
            </div>
          );
        }

        return (
          <div key={field.key} className={cn("space-y-1 group/field", colSpan, isDerived && "is-derived")}>
            {!isInfo && (
              <div className="flex items-center justify-between px-0.5">
                <Label className="text-[8px] font-black uppercase tracking-widest opacity-30 group-focus-within/field:opacity-100 group-focus-within/field:text-primary transition-all">
                  {field.label} {field.required && <span className="text-primary">*</span>}
                </Label>
                {isDerived && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Sparkles className="w-2.5 h-2.5 text-primary/40 animate-pulse" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] bg-background/95 backdrop-blur-xl border-primary/20">
                        Campo calculado por el motor
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
            <div className="relative group/input">
              {field.type === 'select' ? (
                <Select 
                  name={field.key} 
                  value={String(formData[field.key] || '')}
                  onValueChange={(val) => handleFieldChange(field.key, val)}
                  required={field.required} 
                >
                  <SelectTrigger className={cn(
                    "rounded-md border-border/30 bg-secondary/5 h-9 font-bold text-xs focus:ring-0 focus:border-primary/40 px-3",
                    isDerived && "opacity-80 grayscale-[0.5]"
                  )}>
                    <SelectValue placeholder={formData[field.key] || '...'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-md border border-border bg-popover shadow-md">
                    {field.options
                      ?.filter((opt: any) => (typeof opt === 'object' ? opt.value : opt) !== undefined)
                      .map((opt: any, idx: number) => {
                        const value = typeof opt === 'object' ? opt.value : opt;
                        const label = typeof opt === 'object' ? opt.label : opt;
                        return (
                          <SelectItem 
                            key={`${value}-${idx}`} 
                            value={String(value)} 
                            className="text-xs font-medium"
                          >
                            {String(label)}
                          </SelectItem>
                        );
                      })
                    }
                  </SelectContent>
                </Select>
              ) : field.type === 'relation' ? (
                <div className="flex items-center gap-1.5">
                  <RelationField
                    field={field}
                    formData={formData}
                    handleFieldChange={handleFieldChange}
                    searchQuery={searchQueries[field.key] || ''}
                    setSearchQuery={(q) => setSearchQueries(prev => ({ ...prev, [field.key]: q }))}
                  />
                  {field.config?.relation && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setRelationModalField(field)}
                      className="h-9 w-9 shrink-0 rounded-md border-border/30 bg-secondary/5 text-muted-foreground hover:text-primary transition-all duration-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ) : field.type === 'textarea' ? (
                <Textarea
                  name={field.key}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  readOnly={isDerived || field.readOnly}
                  required={field.required}
                  className={cn(
                    "rounded-md border-border/30 bg-secondary/5 min-h-[80px] py-2 font-bold text-xs focus:ring-0 focus:border-primary/40 resize-none px-3",
                    isDerived && "cursor-default opacity-80"
                  )}
                />
              ) : field.type === 'image' ? (
                <SmartImageInput
                  value={formData[field.key] || ''}
                  onChange={(url) => handleFieldChange(field.key, url)}
                  placeholder={field.placeholder}
                />
              ) : field.type === 'info' ? (
                <div className="p-4 rounded-xl border border-primary/10 bg-primary/[0.03] space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{field.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    {field.description}
                  </p>
                </div>
              ) : (
                  <Input
                    type={field.type}
                    name={field.key}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    readOnly={isDerived || field.readOnly}
                    required={field.required}
                    autoComplete="off"
                    className={cn(
                      "rounded-md border-border/30 bg-secondary/5 h-9 font-bold text-xs focus:ring-0 focus:border-primary/40 px-3",
                      isDerived && "cursor-default opacity-80 font-black text-primary/80"
                    )}
                  />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <Card className={cn(
        "@container overflow-hidden border border-border/50 bg-card shadow-md transition-all duration-300",
        "flex flex-col",
        className
      )}>
        
        {!hideHeader && (
          <CardHeader 
            className={cn(
              "py-4 px-6 border-b bg-muted/50 select-none",
              isCollapsible !== false ? "cursor-pointer" : "cursor-default"
            )}
            onClick={isCollapsible !== false ? () => setIsExpanded(!isExpanded) : undefined}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isCollapsible !== false ? (
                  <ChevronRight className={cn("w-4 h-4 transition-transform duration-300 text-muted-foreground", isExpanded && "rotate-90 text-primary")} />
                ) : (
                  <div className="w-1" />
                )}
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-bold tracking-tight">
                    {title || `Forjar ${schema.name}`}
                  </CardTitle>
                  {subtitle && (
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-40">
                 {React.createElement(getModuleIcon('form'), { className: "w-4 h-4" })}
                 <Separator orientation="vertical" className="h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-wider">{schema.name}</span>
              </div>
            </div>
          </CardHeader>
        )}

        {isExpanded && (
          <form 
            id={`form-${schemaId}-${section || ''}`}
            onSubmit={handleSubmit} 
            className="flex-1 animate-in fade-in duration-300"
          >
            {/* 🆔 PRO IDENTITY FIELD: Hidden ID anchor */}
            <input type="hidden" name="id" value={activeRecord?.id || ''} />

            <CardContent className="p-6">
            {noFieldsAvailable ? (
               <div className="py-12 flex flex-col items-center justify-center gap-4 text-muted-foreground/30">
                  <Box size={40} strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Cámara de Materia Vacía</p>
               </div>
            ) : (Object.keys(sections).length === 1 && Object.keys(sections)[0] === 'General') || section ? (
              renderGrid(allFields)
            ) : (
              <div className="space-y-6">
                {Object.entries(sections).map(([name, sectionFields]) => (
                  <div key={name} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {name.replace(/_/g, ' ')}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    {renderGrid(sectionFields)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {!noFieldsAvailable && !effectiveHideSubmit && (
            <CardFooter className="py-4 px-6 bg-muted/30 border-t flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="h-9 px-6 font-bold uppercase text-xs tracking-wider gap-2 transition-all active:scale-[0.98] group"
              >
                {isSaving ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    Sincronizar {section ? section.split('_')[0] : 'Materia'}
                    <ArrowRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </CardFooter>
          )}

          {!noFieldsAvailable && effectiveHideSubmit && (
            <CardFooter className="py-2.5 px-6 bg-muted/10 border-t flex justify-end items-center h-10 select-none">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300">
                {saveStatus === 'saving' && (
                  <span className="text-muted-foreground/60 flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-primary/50" />
                    Guardando...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-500/80 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Guardado
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Error de Conexión
                  </span>
                )}
              </div>
            </CardFooter>
          )}
        </form>
        )}
      </Card>
      
      {relationModalField && (() => {
        const rel = relationModalField.config?.relation;
        const relatedSchema = rel ? schemas.find((s: any) => s.id === rel.entity || s.data?.name === rel.entity || s.data?.slug === rel.entity)?.data : null;

        return (
          <Dialog open={true} onOpenChange={() => setRelationModalField(null)}>
            <DialogContent className="sm:max-w-[500px] bg-background border border-border shadow-2xl rounded-xl p-6">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-wider">
                  Crear Nuevo {relatedSchema?.name || relationModalField.label}
                </DialogTitle>
                <DialogDescription className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Registra un nuevo elemento en la colección de {relationModalField.label}
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-2" />
              {relatedSchema ? (
                <AgnosticForm
                  schema={relatedSchema}
                  context={rel.entity}
                  api={api}
                  hideSubmit={false}
                  onSubmit={async (newData) => {
                    try {
                      if (api) {
                        const saved = await api.dispatch({
                          action: 'UPSERT',
                          context: rel.entity,
                          payload: { data: newData }
                        });
                        // Extract newly created ID
                        const newId = saved?.id || (saved as any)?.payload?.id || (saved as any)?.data?.id;
                        if (newId) {
                          handleFieldChange(relationModalField.key, newId);
                          toast.success(`Elemento Creado y Relacionado`);
                        } else {
                          // Fallback to fetch new record from materia store by matching some text field
                          setTimeout(() => {
                            const latestList = useMateriaStore.getState().data[rel.entity] || [];
                            if (latestList.length > 0) {
                              const sorted = [...latestList].sort((a: any, b: any) => 
                                new Date(b.updated_at || b.created_at || 0).getTime() - 
                                new Date(a.updated_at || a.created_at || 0).getTime()
                              );
                              if (sorted[0]?.id) {
                                handleFieldChange(relationModalField.key, sorted[0].id);
                                toast.success(`Elemento Creado y Relacionado`);
                              }
                            }
                          }, 500);
                        }
                      }
                      setRelationModalField(null);
                    } catch (err) {
                      toast.error("Error al crear elemento relacionado");
                    }
                  }}
                />
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No se encontró el esquema del elemento relacionado.
                </div>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}
    </>
  );
}

