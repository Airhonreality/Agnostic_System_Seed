'use client';

/**
 * 🏛️ ARTEFACTO: AgnosticConfigProjector.tsx
 * ────────────
 * CAPA: Projection (Visual Interface)
 * VERSIÓN: 3.0
 * COMMIT: P2-M2.2-ADR-HIERARCHICAL-PROJECTION
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Proyección dinámica de estructuras DNA en formularios e interfaces visuales.
 * - Resolución híbrida de opciones (Strings vs Objetos) para selectores.
 * - Filtrado y segmentación por secciones de ADN (Fractal Rendering).
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Garantizar la integridad de renderizado ante datos malformados (Objects-as-children safety).
 * - NEVER: Inyectar estilos hardcoded que rompan la puricidad visual de Shadcn UI.
 * - ALWAYS: Respetar la rejilla responsiva definida en el DNA (Full/Half/Third).
 * 
 * 📜 ADR: [2026-05-11] HYBRID_OPTION_RESOLUTION
 * - DECISIÓN: Implementar una lógica de resolución de opciones que soporte tanto arrays de strings como objetos de metadatos.
 * - MOTIVO: Permitir que los selectores se alimenten de fuentes de datos heterogéneas sin colapsar.
 * - IMPACTO: Robustez total ante cambios en el esquema de datos de origen.
 * 
 * 🔗 RELATIONSHIPS:
 * - UPSTREAM: [RecursiveBlockComposer, SovereigntyOrchestrator]
 * - DOWNSTREAM: [Shadcn UI Components, Agnostic Logic Engine]
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import * as LayoutIcons from '@/components/ui/icons/layout';
import { 
  Activity, 
  Palette, 
  Zap, 
  Layout, 
  HelpCircle, 
  ChevronDown, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  AlignJustify,
  Check
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

import { TokenOrStaticInput } from '@/components/ui/TokenOrStaticInput';
import { ScrubInput } from '@/components/ui/ScrubInput';
import { SmartImageInput } from '@/components/ui/SmartImageInput';

const IconMap: Record<string, any> = { Activity, Palette, Zap, Layout };

interface ConfigProjectorProps {
  schema: any;      
  data: any;        
  onUpdate: (patch: any) => void;
  resolvers?: Record<string, any[]>; 
  filterSection?: string | null;
  layout?: 'grid' | 'vertical';
  tokens?: any[];
}

export function AgnosticConfigProjector({ 
  schema, 
  data = {}, 
  onUpdate, 
  resolvers = {},
  filterSection = null,
  layout = 'vertical',
  tokens = []
}: ConfigProjectorProps) {
  
  const updateField = (key: string, value: any) => {
    onUpdate({ [key]: value });
  };

  // 🏛️ ORGANIZACIÓN: Agrupar por secciones para la vista jerárquica
  const groupedFields = React.useMemo(() => {
    const fields = schema.fields || [];
    return fields.reduce((acc: any, field: any) => {
      // Si el campo es una sección, lo tratamos como su propia sección para que sea un bloque de primer nivel
      const section = field.type === 'section' ? field.key : (field.section || '');
      if (!acc[section]) acc[section] = [];
      acc[section].push(field);
      return acc;
    }, {});
  }, [schema.fields]);

  const sections = Object.keys(groupedFields);

  const renderField = (field: any, nsKey?: string): React.ReactNode => {
    const value = nsKey
      ? (data[nsKey]?.[field.key] ?? field.default)
      : (data[field.key] ?? field.default);

    const updateValue = (val: any) =>
      nsKey
        ? onUpdate({ [nsKey]: { ...(data[nsKey] || {}), [field.key]: val } })
        : onUpdate({ [field.key]: val });

    const label = <label className="text-[10px] font-bold uppercase text-muted-foreground/50 tracking-wider block mb-1">{field.label}</label>;

    // token_category declared → TokenOrStaticInput regardless of field.type
    if (field.token_category) {
      return (
        <div key={field.key} className="space-y-1">
          {label}
          <TokenOrStaticInput
            value={value}
            onChange={(val) => updateValue(val)}
            category={field.token_category as 'spacing' | 'color' | 'typography' | 'radius' | 'shadow' | 'custom'}
            tokens={tokens.map((t: any) => ({
              id: t.id,
              name: t.data?.name,
              category: t.data?.category,
              value: t.data?.value,
            }))}
            placeholder={field.placeholder}
          />
          {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
        </div>
      );
    }

    switch (field.type) {
      case 'section':
        const Icon = (LucideIcons as any)[field.icon] || HelpCircle;
        return (
          <div className="space-y-4">
             <div className="flex items-center gap-3 border-b border-border/10 pb-2">
                <Icon size={14} className="text-muted-foreground/60" />
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{field.label}</h4>
                  {field.description && <p className="text-[8px] text-muted-foreground/40">{field.description}</p>}
                </div>
             </div>
             <div className="space-y-4 pl-2">
               {field.fields?.map((f: any) => (
                 <div key={f.key}>{renderField(f, field.ns !== false ? field.key : undefined)}</div>
               ))}
             </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between gap-4 py-3 px-4 bg-muted/20 rounded-lg border border-border/5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground/80 tracking-wide block">{field.label}</span>
              {field.description && <p className="text-[8px] text-muted-foreground/40">{field.description}</p>}
            </div>
            <Checkbox 
              checked={!!value} 
              onCheckedChange={(checked) => updateValue(checked)}
            />
          </div>
        );

      case 'switch':
        return (
          <div className="flex items-center justify-between gap-4 py-3 px-4 bg-muted/20 rounded-lg border border-border/5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground/80 tracking-wide block">{field.label}</span>
              {field.description && <p className="text-[8px] text-muted-foreground/40">{field.description}</p>}
            </div>
            <Switch 
              checked={!!value} 
              onCheckedChange={(checked) => updateValue(checked)}
            />
          </div>
        );

      case 'align':
        return (
          <div className="space-y-1">
            {label}
            <ToggleGroup 
              type="single" 
              value={value || 'left'} 
              onValueChange={(val) => { if (val) updateValue(val); }}
              className="justify-start bg-muted/20 p-0.5 rounded-lg border border-border/5 w-fit"
            >
              <ToggleGroupItem value="left" aria-label="Align left" className="h-8 w-8 p-0 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Align center" className="h-8 w-8 p-0 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Align right" className="h-8 w-8 p-0 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );

      case 'slider':
        const min = field.min ?? 1;
        const max = field.max ?? 20;
        const step = field.step ?? 1;
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              {label}
              <span className="text-[9px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {value ?? field.default ?? min}
              </span>
            </div>
            <Slider 
              min={min} 
              max={max} 
              step={step} 
              value={[value ?? field.default ?? min]} 
              onValueChange={([val]) => updateValue(val)}
              className="py-2"
            />
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );

      case 'swatch':
        const swatches = field.colors || [
          { label: 'Principal', value: 'primary', className: 'bg-primary' },
          { label: 'Secundario', value: 'secondary', className: 'bg-secondary' },
          { label: 'Destacado', value: 'accent', className: 'bg-accent' },
          { label: 'Muted', value: 'muted', className: 'bg-muted' }
        ];
        return (
          <div className="space-y-1.5">
            {label}
            <div className="flex items-center gap-2 flex-wrap">
              {swatches.map((sw: any, idx: number) => {
                const isActive = value === sw.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => updateValue(sw.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border border-border/40 transition-all focus:outline-none focus:ring-1 focus:ring-ring flex items-center justify-center hover:scale-105",
                      sw.className,
                      isActive ? "ring-2 ring-ring ring-offset-2 scale-110" : "opacity-80"
                    )}
                    title={sw.label}
                  />
                );
              })}
            </div>
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );

      case 'select':
        let options = field.options || [];
        if (field.options_source && resolvers[field.options_source]) {
          // Resolve external options and discard any with empty value to avoid Select errors
          options = resolvers[field.options_source]
            .map(opt => (typeof opt === 'string' ? { label: opt, value: opt } : opt))
            .filter((opt: any) => opt.value !== '' && opt.value !== undefined);
        }

        return (
          <div className="space-y-1">
            {label}
            <Select
              value={value === '' || value === undefined ? undefined : value}
              onValueChange={(v) => updateValue(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Seleccionar...`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                {options.map((opt: any, idx: number) => (
                  <SelectItem key={idx} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );

      case 'multi-select': {
        let multiOptions = field.options || [];
        if (field.options_source && resolvers[field.options_source]) {
          multiOptions = resolvers[field.options_source]
            .map((opt: any) => (typeof opt === 'string' ? { label: opt, value: opt } : opt))
            .filter((opt: any) => opt.value !== '' && opt.value !== undefined);
        }

        const selectedValues: string[] = typeof value === 'string'
          ? value.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (Array.isArray(value) ? value : []);

        const addValue = (v: string) => {
          if (v && !selectedValues.includes(v)) {
            updateValue([...selectedValues, v].join(','));
          }
        };

        const removeValue = (v: string) => {
          updateValue(selectedValues.filter((s: string) => s !== v).join(','));
        };

        const availableOptions = multiOptions.filter(
          (opt: any) => !selectedValues.includes(opt.value)
        );

        return (
          <div className="space-y-2">
            {label}
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedValues.map((v: string) => {
                  const optLabel = multiOptions.find((o: any) => o.value === v)?.label ?? v;
                  return (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20"
                    >
                      {optLabel}
                      <button
                        type="button"
                        onClick={() => removeValue(v)}
                        className="text-primary/50 hover:text-primary ml-0.5 leading-none"
                        aria-label={`Quitar ${optLabel}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {availableOptions.length > 0 && (
              <Select value="" onValueChange={addValue}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Agregar campo..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOptions.map((opt: any, idx: number) => (
                    <SelectItem key={idx} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {field.description && (
              <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>
            )}
          </div>
        );
      }

      case 'textarea':
        return (
          <div className="space-y-1">
            {label}
            <Textarea
              value={value || ''}
              onChange={(e) => updateValue(e.target.value)}
              placeholder={field.label}
              className="min-h-[72px] text-xs resize-y"
            />
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );

      case 'toggle_group':
        return (
          <div key={field.key} className="space-y-1">
            {label}
            <ToggleGroup
              type="single"
              value={value !== undefined && value !== null ? String(value) : ''}
              onValueChange={(val) => { if (val) updateValue(val); }}
              className="justify-start gap-1 flex-wrap"
            >
              {(field.options || []).map((opt: any) => {
                const IconComp = opt.icon
                  ? ((LayoutIcons as any)[opt.icon] || (LucideIcons as any)[opt.icon] || null)
                  : null;
                return (
                  <ToggleGroupItem
                    key={opt.value}
                    value={String(opt.value)}
                    className="h-8 px-2 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border/20 hover:bg-muted/50 transition-colors"
                    title={opt.label || opt.value}
                  >
                    {IconComp
                      ? <IconComp size={13} />
                      : <span className="text-[10px] font-bold">{opt.label ?? opt.value}</span>
                    }
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );

      case 'fill_group':
        {
          const keys: Record<string, string> = field.keys || {};
          const fillVal = value || {};
          const typeKey = keys.type || 'fill_type';
          const colorKey = keys.color || 'fill_color';
          const srcKey = keys.src || 'fill_src';
          const fitKey = keys.fit || 'fill_fit';
          const posKey = keys.position || 'fill_position';
          const gradKey = keys.gradient || 'fill_gradient';
          const opacityKey = keys.opacity || 'fill_opacity';

          const fillType = fillVal[typeKey];

          const setFill = (patch: any) => updateValue({ ...(fillVal || {}), ...patch });

          return (
            <div key={field.key} className="space-y-2">
              {label}

              {/* Selector de tipo */}
              <ToggleGroup
                type="single"
                value={String(fillType || '')}
                onValueChange={(val) => setFill({ [typeKey]: val })}
                className="justify-start gap-1 flex-wrap"
              >
                <ToggleGroupItem value="none" className="h-8 px-2 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border/20 hover:bg-muted/50 transition-colors">
                  <LayoutIcons.IconFillNone size={13} />
                </ToggleGroupItem>
                <ToggleGroupItem value="color" className="h-8 px-2 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border/20 hover:bg-muted/50 transition-colors">
                  <LayoutIcons.IconFillColor size={13} />
                </ToggleGroupItem>
                <ToggleGroupItem value="image" className="h-8 px-2 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border/20 hover:bg-muted/50 transition-colors">
                  <LayoutIcons.IconFillImage size={13} />
                </ToggleGroupItem>
                <ToggleGroupItem value="gradient" className="h-8 px-2 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border/20 hover:bg-muted/50 transition-colors">
                  <LayoutIcons.IconFillGradient size={13} />
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Subcampos condicionales */}
              <div className="pt-2">
                {fillType === 'color' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <TokenOrStaticInput
                          value={fillVal[colorKey]}
                          onChange={(v) => setFill({ [colorKey]: v })}
                          category={'color'}
                          tokens={tokens.map((t: any) => ({ id: t.id, name: t.data?.name, category: t.data?.category, value: t.data?.value }))}
                          placeholder={field.placeholder}
                        />
                      </div>
                      <div>
                        <input
                          type="color"
                          value={ (typeof fillVal[colorKey] === 'string' && String(fillVal[colorKey]).startsWith('#')) ? String(fillVal[colorKey]) : '#000000' }
                          onChange={(e) => setFill({ [colorKey]: e.target.value })}
                          className="w-8 h-8 p-0 rounded"
                          aria-label="Color picker"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {fillType === 'image' && (
                  <div className="space-y-2">
                    <Input value={fillVal[srcKey] || ''} onChange={(e) => setFill({ [srcKey]: e.target.value })} placeholder="URL de imagen" />

                    <div className="flex items-center gap-2">
                      <div className="flex gap-2">
                        <Select value={fillVal[fitKey] || ''} onValueChange={(v) => setFill({ [fitKey]: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Fit" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cover">cover</SelectItem>
                            <SelectItem value="contain">contain</SelectItem>
                            <SelectItem value="auto">auto</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={fillVal[posKey] || ''} onValueChange={(v) => setFill({ [posKey]: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Posición" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="center">center</SelectItem>
                            <SelectItem value="top">top</SelectItem>
                            <SelectItem value="bottom">bottom</SelectItem>
                            <SelectItem value="left">left</SelectItem>
                            <SelectItem value="right">right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="h-8 px-3 rounded bg-muted/10 border border-border/10 text-xs"
                          onClick={() => {
                            const el = document.getElementById(`file-input-${field.key}`) as HTMLInputElement | null;
                            el?.click();
                          }}
                        >
                          Seleccionar archivo
                        </button>
                        <input
                          id={`file-input-${field.key}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e: any) => {
                            const f = e?.target?.files && e.target.files[0];
                            if (!f) return;
                            try {
                              const fd = new FormData();
                              fd.append('file', f);
                              const res = await fetch('/api/upload', { method: 'POST', body: fd });
                              const j = await res.json();
                              if (j?.url) {
                                setFill({ [srcKey]: j.url });
                              } else if (j?.error) {
                                console.error('Upload error', j.error);
                                alert(`Upload failed: ${j.error}`);
                              }
                            } catch (err) {
                              console.error('Upload exception', err);
                              alert('Upload failed');
                            }
                            // reset input so selecting same file again triggers change
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {fillType === 'gradient' && (
                  <div className="space-y-1">
                    <Textarea value={fillVal[gradKey] || ''} onChange={(e) => setFill({ [gradKey]: e.target.value })} placeholder="linear-gradient(...)" />
                  </div>
                )}

                {/* Compartido: Opacidad del fondo */}
                <div className="pt-2">
                  <ScrubInput
                    value={fillVal[opacityKey] !== undefined ? Number(fillVal[opacityKey]) : undefined}
                    onChange={(v) => setFill({ [opacityKey]: v })}
                    min={0}
                    max={100}
                    step={1}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
          );
        }

      case 'divider':
        return (
          <div key={field.key} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 pb-1 pt-3">
            {field.label}
          </div>
        );

      case 'number': {
        const numVal = value !== undefined && value !== null && value !== ''
          ? parseFloat(String(value))
          : undefined;
        return (
          <div key={field.key} className="space-y-1">
            {label}
            <ScrubInput
              value={isNaN(numVal as number) ? undefined : numVal}
              onChange={(v) => updateValue(v)}
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              placeholder={field.placeholder || '0'}
            />
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );
      }

      case 'anchor_grid': {
        const keyY: string = field.key_y;
        const keyX: string = field.key_x;
        const gapKey: string | undefined = field.gap_key;
        const valuesY: string[] = field.values_y || ['start', 'center', 'end'];
        const valuesX: string[] = field.values_x || ['start', 'center', 'end'];

        const currentY: string | undefined = nsKey ? data[nsKey]?.[keyY] : data[keyY];
        const currentX: string | undefined = nsKey ? data[nsKey]?.[keyX] : data[keyX];
        const currentGap = gapKey ? (nsKey ? data[nsKey]?.[gapKey] : data[gapKey]) : undefined;

        const cssJustify: Record<string, string> = {
          start: 'flex-start', center: 'center', end: 'flex-end', 'space-between': 'space-between',
        };
        const cssAlign: Record<string, string> = {
          start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch',
        };

        const setAlignment = (vy: string, vx: string) => {
          const patch: Record<string, string> = { [keyY]: vy, [keyX]: vx };
          nsKey
            ? onUpdate({ [nsKey]: { ...(data[nsKey] || {}), ...patch } })
            : onUpdate(patch);
        };

        const updateGap = (val: number | undefined) => {
          if (!gapKey) return;
          const patch = { [gapKey]: val };
          nsKey
            ? onUpdate({ [nsKey]: { ...(data[nsKey] || {}), ...patch } })
            : onUpdate(patch);
        };

        const gapNum = currentGap !== undefined && currentGap !== null && currentGap !== ''
          ? parseFloat(String(currentGap))
          : undefined;

        return (
          <div className="space-y-1.5">
            {label}
            <div className="flex items-start gap-2">
              <div
                className="inline-grid gap-[3px] p-[3px] bg-muted/20 rounded-lg border border-border/5 shrink-0"
                style={{ gridTemplateColumns: `repeat(${valuesX.length}, 1.625rem)` }}
              >
                {valuesY.flatMap((vy: string) =>
                  valuesX.map((vx: string) => {
                    const isActive = currentY === vy && currentX === vx;
                    return (
                      <button
                        key={`${vy}-${vx}`}
                        type="button"
                        onClick={() => setAlignment(vy, vx)}
                        title={`align: ${vy} / justify: ${vx}`}
                        className={cn(
                          'w-[1.625rem] h-[1.625rem] rounded border transition-all flex shrink-0',
                          isActive
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'border-border/10 text-muted-foreground/25 hover:border-border/30 hover:bg-muted/30 hover:text-muted-foreground/60',
                        )}
                        style={{
                          justifyContent: cssJustify[vx] || 'flex-start',
                          alignItems: cssAlign[vy] || 'flex-start',
                          padding: '4px',
                          gap: vx === 'space-between' ? '0px' : '2px',
                        }}
                      >
                        <div className="w-[4px] h-[9px] rounded-[2px] bg-current shrink-0" />
                        <div className="w-[4px] h-[6px] rounded-[2px] bg-current shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
              {gapKey && (
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 leading-none">Gap</span>
                  <ScrubInput
                    value={isNaN(gapNum as number) ? undefined : gapNum}
                    onChange={updateGap}
                    min={0}
                    step={0.25}
                    placeholder="0"
                    className="w-12"
                  />
                </div>
              )}
            </div>
            {field.description && (
              <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>
            )}
          </div>
        );
      }

      case 'padding_group': {
        const keys: string[] = field.keys || ['padding_top', 'padding_right', 'padding_bottom', 'padding_left'];
        // Cross layout: T at top-center, R at mid-right, B at bottom-center, L at mid-left
        const padConfig = [
          { key: keys[0], Icon: LayoutIcons.IconPaddingTop,    col: 2, row: 1 },
          { key: keys[1], Icon: LayoutIcons.IconPaddingRight,  col: 3, row: 2 },
          { key: keys[2], Icon: LayoutIcons.IconPaddingBottom, col: 2, row: 3 },
          { key: keys[3], Icon: LayoutIcons.IconPaddingLeft,   col: 1, row: 2 },
        ];
        return (
          <div className="space-y-1.5">
            {label}
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, auto)' }}>
              {padConfig.map(({ key: k, Icon: PadIcon, col, row }) => {
                const raw = nsKey ? data[nsKey]?.[k] : data[k];
                const kVal = raw !== undefined && raw !== null && raw !== ''
                  ? parseFloat(String(raw))
                  : undefined;
                return (
                  <div key={k} style={{ gridColumn: col, gridRow: row }}>
                    <ScrubInput
                      value={isNaN(kVal as number) ? undefined : kVal}
                      onChange={(val) => {
                        nsKey
                          ? onUpdate({ [nsKey]: { ...(data[nsKey] || {}), [k]: val } })
                          : onUpdate({ [k]: val });
                      }}
                      min={0}
                      step={0.25}
                      placeholder="0"
                      icon={PadIcon}
                    />
                  </div>
                );
              })}
            </div>
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );
      }

      case 'image':
        return (
          <div key={field.key} className="space-y-1">
            {label}
            <SmartImageInput
              value={value || ''}
              onChange={(url) => updateValue(url)}
            />
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );

      case 'fill_group': {
        const k = field.keys || {};
        const typeKey     = k.type     || 'fill_type';
        const colorKey    = k.color    || 'fill_color';
        const srcKey      = k.src      || 'fill_src';
        const fitKey      = k.fit      || 'fill_fit';
        const positionKey = k.position || 'fill_position';
        const gradientKey = k.gradient || 'fill_gradient';
        const opacityKey  = k.opacity  || 'fill_opacity';

        const get = (key: string) => nsKey ? (data[nsKey]?.[key]) : data[key];
        const set = (patch: Record<string, any>) =>
          nsKey
            ? onUpdate({ [nsKey]: { ...(data[nsKey] || {}), ...patch } })
            : onUpdate(patch);

        const fillType = get(typeKey) || 'none';
        const fillOpacity = get(opacityKey);
        const opacityNum = fillOpacity !== undefined && fillOpacity !== null && fillOpacity !== ''
          ? parseFloat(String(fillOpacity)) : undefined;

        const TYPES = [
          { value: 'none',     Icon: LayoutIcons.IconFillNone,     label: 'Sin fondo' },
          { value: 'color',    Icon: LayoutIcons.IconFillColor,    label: 'Color' },
          { value: 'image',    Icon: LayoutIcons.IconFillImage,    label: 'Imagen' },
          { value: 'gradient', Icon: LayoutIcons.IconFillGradient, label: 'Degradado' },
        ];

        const FIT_OPTIONS  = ['cover', 'contain', 'auto'];
        const POS_OPTIONS  = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];

        return (
          <div key={field.key} className="space-y-3">
            {label}
            {/* Type selector */}
            <div className="flex gap-1">
              {TYPES.map(({ value: tv, Icon, label: tl }) => (
                <button
                  key={tv}
                  type="button"
                  title={tl}
                  onClick={() => set({ [typeKey]: tv })}
                  className={cn(
                    'h-8 w-9 rounded-md border transition-colors flex items-center justify-center',
                    fillType === tv
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-border/15 text-muted-foreground/40 hover:bg-muted/30 hover:border-border/30 hover:text-muted-foreground/70',
                  )}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Color sub-fields */}
            {fillType === 'color' && (
              <TokenOrStaticInput
                value={get(colorKey) || ''}
                onChange={(v) => set({ [colorKey]: v })}
                category="color"
                tokens={tokens.map((t: any) => ({ id: t.id, name: t.data?.name, category: t.data?.category, value: t.data?.value }))}
                placeholder="220 90% 56%"
              />
            )}

            {/* Image sub-fields */}
            {fillType === 'image' && (
              <div className="space-y-2">
                <SmartImageInput
                  value={get(srcKey) || ''}
                  onChange={(url) => set({ [srcKey]: url })}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 block">Ajuste</span>
                    <Select value={get(fitKey) || 'cover'} onValueChange={(v) => set({ [fitKey]: v })}>
                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIT_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 block">Posición</span>
                    <Select value={get(positionKey) || 'center'} onValueChange={(v) => set({ [positionKey]: v })}>
                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POS_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Gradient sub-fields */}
            {fillType === 'gradient' && (
              <textarea
                value={get(gradientKey) || ''}
                onChange={(e) => set({ [gradientKey]: e.target.value })}
                placeholder="linear-gradient(135deg, hsl(220 90% 56%) 0%, hsl(280 60% 40%) 100%)"
                className="w-full h-16 text-[11px] font-mono px-2 py-1.5 rounded-md border border-border/20 bg-muted/20 resize-none outline-none focus:border-primary/30 text-foreground placeholder:text-muted-foreground/30"
              />
            )}

            {/* Opacity — shared for color / image / gradient */}
            {fillType !== 'none' && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 shrink-0">Opacidad %</span>
                <ScrubInput
                  value={isNaN(opacityNum as number) ? undefined : opacityNum}
                  onChange={(v) => set({ [opacityKey]: v })}
                  min={0}
                  max={100}
                  step={1}
                  placeholder="100"
                  className="flex-1"
                />
              </div>
            )}

            {field.description && <p className="text-[8px] text-muted-foreground/30">{field.description}</p>}
          </div>
        );
      }

      default:
        return (
          <div key={field.key} className="space-y-1">
            {label}
            <Input
              value={value ?? ''}
              onChange={(e) => updateValue(e.target.value)}
              placeholder={field.placeholder || field.label}
              className="h-8 text-xs"
            />
            {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
          </div>
        );
    }
  };

  const renderGrid = (fields: any[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
      {fields.map((field: any) => (
        <div key={field.key} className={cn(
          "col-span-1",
          (field.width === 'full' || field.type === 'section') && "sm:col-span-2 lg:col-span-3 xl:col-span-4 2xl:col-span-5"
        )}>
          {renderField(field)}
        </div>
      ))}
    </div>
  );

  // 🎯 RENDER FILTRADO (Un solo bloque plano)
  if (filterSection && filterSection !== 'none') {
    return (
      <div className="p-10 bg-background/20 rounded-[3rem] border border-border/5">
        {renderGrid(groupedFields[filterSection] || [])}
      </div>
    );
  }

  // 🌳 RENDER DE ALTA DENSIDAD (Grupos en columnas, campos en filas)
  const containerClass = layout === 'grid'
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
    : "flex flex-col gap-6";

  return (
    <div className={containerClass}>
      {sections.map((sectionName) => (
        <div key={sectionName} className={cn(
          "bg-background/20 rounded-[2.5rem] px-8 py-8 border border-border/5 flex flex-col h-full",
          !sectionName && "bg-transparent border-none p-0 px-4"
        )}>
          {/* Renderizamos los campos de esta sección apilados verticalmente */}
          <div className="space-y-6">
            {groupedFields[sectionName].map((field: any) => (
              <div key={field.key}>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
