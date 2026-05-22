# Plan: Design Tokens — Sistema de Variables Globales Parametrizadas

## Contexto y diagnóstico

`layout.tsx` ya lee `storage/{tenant}/styles/tokens.css` e inyecta el CSS inline en `<head>` (líneas 42-46). El archivo no existe en los tenants actuales pero el sistema lo maneja con try/catch sin fallar. La infraestructura de inyección ya existe — solo falta el editor y la capa de persistencia.

**El objetivo**: que cualquier parámetro numérico, de color, o tipográfico en el designer pueda referenciar una variable CSS en vez de un valor estático, y que esas variables se definan desde una UI centralizada que genera automáticamente `tokens.css`.

---

## Modelo de datos del token

Namespace estándar de storage: `design_tokens`. Cada token es un `DataItem`:

```json
{
  "id": "uuid",
  "context": "design_tokens",
  "data": {
    "name": "gap-forms",
    "category": "spacing",
    "value": "0.9375rem",
    "description": "Separación entre campos de formulario"
  }
}
```

**Categorías válidas**: `spacing` | `color` | `typography` | `radius` | `shadow` | `custom`

**Reglas de valor por categoría**:
- `spacing`: valor CSS completo — `"0.9375rem"`, `"15px"`, `"1.5rem"`
- `color`: **HSL sin wrapper** — `"220 90% 56%"` (igual que shadcn/ui: `--primary: 222 47% 11%`)
- `typography`: family CSS — `"Inter, sans-serif"` o tamaño `"1.125rem"`
- `radius`: valor CSS — `"0.5rem"`, `"1rem"`
- `shadow`: valor CSS completo — `"0 1px 3px rgba(0,0,0,0.1)"`
- `custom`: cualquier valor CSS válido

---

## CSS generado por el sistema

El sync genera `storage/{tenant}/styles/tokens.css` con este formato:

```css
/* Agnostic Design Tokens — generated file, do not edit manually */
:root {
  --gap-forms: 0.9375rem;
  --color-marca: 220 90% 56%;
  --radius-card: 0.75rem;
  --font-heading: "Inter", sans-serif;
}
```

**Por qué HSL sin `hsl()` para colores**: para que funcione la sintaxis de opacidad de Tailwind (`bg-[hsl(var(--color-marca)/0.5)]`) y sea consistente con el sistema de tokens de shadcn/ui en `globals.css`.

**Este archivo NO reemplaza `globals.css`**. Extiende/sobreescribe en una capa separada inyectada por `layout.tsx`. El `id="agnostic-tokens"` ya existe en layout para identificar el tag.

---

## Formato del valor en JSON cuando se usa token

Cuando un parámetro referencia un token, el JSON almacena el string `var(--nombre)`:

```json
{
  "type": "frame",
  "gap": "var(--gap-forms)",
  "padding": ["var(--space-section)", 1.5, "var(--space-section)", 1.5]
}
```

El renderer recibe `string | number`. La función `resolveValue` maneja ambos.

---

## Archivos a CREAR (4)

---

### Archivo 1: `src/lib/agnostic/resolveToken.ts`

```typescript
/**
 * Converts a token reference or static number to a CSS value string.
 * Accepts: number (→ rem), string var() reference (→ as-is), or undefined.
 */
export function resolveValue(
  value: string | number | undefined,
  suffix = 'rem'
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;   // 'var(--gap-forms)' → as-is
  if (value === 0) return '0';
  return `${value}${suffix}`;
}

/**
 * Converts a color token reference or static color to a CSS color value.
 * var() references are wrapped in hsl() because color tokens store HSL components.
 * Static values (hex, hsl(), rgb()) pass through unchanged.
 */
export function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('var(')) return `hsl(${value})`;
  return value;
}

/**
 * Converts a padding array where each entry can be a number or var() reference.
 * Returns a CSS shorthand padding string.
 */
export function resolvePadding(
  padding: Array<string | number> | undefined
): string | undefined {
  if (!padding || padding.length < 4) return undefined;
  return padding.map(v => resolveValue(v) ?? '0').join(' ');
}
```

---

### Archivo 2: `src/components/ui/TokenOrStaticInput.tsx`

```typescript
'use client';
import React, { useState } from 'react';
import { Sparkles, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DesignToken {
  id: string;
  name: string;
  category: string;
  value: string;
}

interface TokenOrStaticInputProps {
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  category: 'spacing' | 'color' | 'typography' | 'radius' | 'shadow' | 'custom';
  tokens: DesignToken[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export function TokenOrStaticInput({
  value,
  onChange,
  category,
  tokens,
  placeholder = '0',
  label,
  className,
}: TokenOrStaticInputProps) {
  const isTokenMode = typeof value === 'string' && value.startsWith('var(');
  const [mode, setMode] = useState<'static' | 'token'>(isTokenMode ? 'token' : 'static');

  const matchingTokens = tokens.filter(t => t.category === category);

  const toggleMode = () => {
    const next = mode === 'static' ? 'token' : 'static';
    setMode(next);
    if (next === 'static') {
      onChange(0);
    } else if (matchingTokens.length > 0) {
      onChange(`var(--${matchingTokens[0].name})`);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {label && (
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 shrink-0 w-16">
          {label}
        </span>
      )}

      {/* Mode toggle */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className={cn(
          'w-6 h-6 rounded-md shrink-0 transition-colors',
          mode === 'token'
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'
        )}
        title={mode === 'token' ? 'Usando token de variable' : 'Usando valor estático'}
      >
        {mode === 'token' ? <Sparkles size={10} /> : <Type size={10} />}
      </Button>

      {/* Input area */}
      {mode === 'static' ? (
        <Input
          type={category === 'color' ? 'color' : 'text'}
          value={typeof value === 'number' ? value : (value ?? '')}
          onChange={e => {
            const raw = e.target.value;
            const num = parseFloat(raw);
            onChange(isNaN(num) ? raw : num);
          }}
          placeholder={placeholder}
          className="h-7 text-xs font-mono flex-1 min-w-0"
        />
      ) : (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={val => onChange(val)}
        >
          <SelectTrigger className="h-7 text-[10px] font-mono flex-1 min-w-0 bg-primary/5 border-primary/20">
            <SelectValue placeholder="— seleccionar token —" />
          </SelectTrigger>
          <SelectContent>
            {matchingTokens.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-muted-foreground">
                Sin tokens de tipo {category}
              </div>
            ) : (
              matchingTokens.map(token => (
                <SelectItem key={token.id} value={`var(--${token.name})`} className="text-[10px] font-mono">
                  <span className="text-primary">--{token.name}</span>
                  <span className="text-muted-foreground ml-2">{token.value}</span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
```

---

### Archivo 3: `src/app/api/tokens/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getStrategy } from '@/server/getStrategy';
import { getSiloPath } from '@/server/activeProject';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/tokens/sync
 * Reads all design_tokens records and regenerates tokens.css for the active tenant.
 * Called by TokensEditor after every token save or delete.
 */
export async function POST(_req: NextRequest) {
  try {
    const strategy = await getStrategy();
    const tokens = await strategy.read('design_tokens');

    const lines = tokens
      .filter((t: any) => t.data?.name && t.data?.value)
      .map((t: any) => `  --${t.data.name}: ${t.data.value};`);

    const css = [
      '/* Agnostic Design Tokens — generated file, do not edit manually */',
      ':root {',
      ...lines,
      '}',
      '',
    ].join('\n');

    const siloPath = getSiloPath();
    const stylesDir = path.join(siloPath, 'styles');
    await fs.mkdir(stylesDir, { recursive: true });
    await fs.writeFile(path.join(stylesDir, 'tokens.css'), css, 'utf-8');

    return NextResponse.json({ ok: true, count: lines.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
```

---

### Archivo 4: `src/components/agnostic/designer/TokensEditor.tsx`

```typescript
'use client';
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'spacing',    label: 'Espaciado' },
  { value: 'color',      label: 'Color' },
  { value: 'typography', label: 'Tipografía' },
  { value: 'radius',     label: 'Radio de Borde' },
  { value: 'shadow',     label: 'Sombra' },
  { value: 'custom',     label: 'Custom' },
] as const;

interface Token {
  id: string;
  data: { name: string; category: string; value: string; description?: string };
}

interface TokensEditorProps {
  tokens: Token[];
  onSave:   (id: string, data: Token['data']) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAdd:    (data: Token['data']) => Promise<void>;
}

export function TokensEditor({ tokens, onSave, onRemove, onAdd }: TokensEditorProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newToken, setNewToken] = useState({ name: '', category: 'spacing', value: '', description: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const syncTokensCss = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/tokens/sync', { method: 'POST' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success(`tokens.css actualizado — ${json.count} variables`);
    } catch (e: any) {
      toast.error(`Error al sincronizar CSS: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdd = async () => {
    if (!newToken.name.trim() || !newToken.value.trim()) {
      toast.error('Nombre y valor son requeridos');
      return;
    }
    // Sanitize name: slug lowercase sin espacios
    const safeName = newToken.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    await onAdd({ ...newToken, name: safeName });
    await syncTokensCss();
    setNewToken({ name: '', category: 'spacing', value: '', description: '' });
  };

  const handleRemove = async (id: string) => {
    await onRemove(id);
    await syncTokensCss();
  };

  const filtered = useMemo(() =>
    filterCategory === 'all' ? tokens : tokens.filter(t => t.data?.category === filterCategory),
    [tokens, filterCategory]
  );

  const grouped = useMemo(() => {
    const map: Record<string, Token[]> = {};
    for (const t of filtered) {
      const cat = t.data?.category || 'custom';
      if (!map[cat]) map[cat] = [];
      map[cat].push(t);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Sparkles size={16} /> Design Tokens
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
            Variables CSS globales — afectan a todos los frames del proyecto
          </p>
        </div>
        <Button
          onClick={syncTokensCss}
          disabled={isSyncing}
          size="sm"
          variant="outline"
          className="text-[10px] font-black uppercase tracking-widest h-9 gap-2"
        >
          <Sparkles size={12} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar CSS'}
        </Button>
      </div>

      {/* Nuevo token */}
      <div className="bg-background border rounded-2xl p-5 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Nuevo Token
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nombre (slug)</label>
            <Input
              value={newToken.name}
              onChange={e => setNewToken(p => ({ ...p, name: e.target.value }))}
              placeholder="gap-forms"
              className="font-mono text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Categoría</label>
            <Select value={newToken.category} onValueChange={v => setNewToken(p => ({ ...p, category: v }))}>
              <SelectTrigger className="h-9 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Valor CSS {newToken.category === 'color' ? '(HSL sin hsl(): "220 90% 56%")' : ''}
            </label>
            <Input
              value={newToken.value}
              onChange={e => setNewToken(p => ({ ...p, value: e.target.value }))}
              placeholder={newToken.category === 'color' ? '220 90% 56%' : '0.9375rem'}
              className="font-mono text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descripción (opcional)</label>
            <Input
              value={newToken.description}
              onChange={e => setNewToken(p => ({ ...p, description: e.target.value }))}
              placeholder="Para qué se usa este token"
              className="text-xs h-9"
            />
          </div>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 text-[10px] font-black uppercase tracking-widest">
          <Plus size={12} /> Agregar Token
        </Button>
      </div>

      {/* Filtro de categoría */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...CATEGORIES.map(c => c.value)].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
              filterCategory === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {cat === 'all' ? 'Todos' : CATEGORIES.find(c => c.value === cat)?.label ?? cat}
          </button>
        ))}
      </div>

      {/* Lista de tokens agrupados */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b pb-2">
            {CATEGORIES.find(c => c.value === category)?.label ?? category}
          </h3>
          <div className="space-y-2">
            {items.map(token => (
              <div
                key={token.id}
                className="flex items-center gap-3 bg-background border rounded-xl px-4 py-3 hover:border-primary/20 transition-all group"
              >
                {/* Color swatch para tokens de color */}
                {token.data?.category === 'color' && (
                  <div
                    className="w-6 h-6 rounded-md border border-border shrink-0"
                    style={{ backgroundColor: `hsl(${token.data.value})` }}
                  />
                )}

                <code className="text-[11px] font-mono text-primary font-bold shrink-0">
                  --{token.data?.name}
                </code>
                <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
                  {token.data?.value}
                </span>
                {token.data?.description && (
                  <span className="text-[10px] text-muted-foreground/50 truncate max-w-[200px]">
                    {token.data.description}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(token.id)}
                  className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 text-destructive/40 hover:text-destructive hover:bg-destructive/5 shrink-0 transition-all"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {tokens.length === 0 && (
        <div className="text-center py-12 text-xs font-semibold text-muted-foreground border border-dashed rounded-2xl">
          Sin tokens definidos. Añade tu primera variable para empezar.
        </div>
      )}
    </div>
  );
}
```

---

## Archivos a MODIFICAR (4)

---

### Modificación 1: `src/lib/agnostic/constants.ts`

**Añadir** `TOKENS` al objeto `SYSTEM_NS`:

```typescript
export const SYSTEM_NS = {
  ROUTES:  'page_routes',
  SCHEMAS: 'schema_definitions',
  CONFIG:  'system_config',
  TOKENS:  'design_tokens',  // ← AÑADIR
} as const;
```

No tocar nada más en este archivo.

---

### Modificación 2: `src/app/layout.tsx`

**Cambiar** la línea 37 para incluir `SYSTEM_NS.TOKENS`:

```typescript
// ANTES:
const vaultData = await getVaultData([SYSTEM_NS.ROUTES, SYSTEM_NS.SCHEMAS, SYSTEM_NS.CONFIG]);

// DESPUÉS:
const vaultData = await getVaultData([SYSTEM_NS.ROUTES, SYSTEM_NS.SCHEMAS, SYSTEM_NS.CONFIG, SYSTEM_NS.TOKENS]);
```

Un solo cambio de 1 línea. La colección de tokens es pequeña (10-50 items) — sin impacto en payload.

---

### Modificación 3: `src/components/agnostic/designer/AgnosticDesigner.tsx`

Cuatro sub-cambios:

#### 3a — Estado adicional

Añadir después de `selectedScriptId`:

```typescript
const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
```

#### 3b — Datos de tokens

Añadir junto a `routes`, `schemas`, `scripts`:

```typescript
const tokens = useMemo(() => materia[SYSTEM_NS.TOKENS] ?? [], [materia]);
```

#### 3c — Handlers CRUD de tokens

```typescript
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
```

#### 3d — 4º nodo virtual en `unifiedNodes`

Añadir como cuarto elemento del array (después de `root-logic`):

```typescript
{
  id: 'root-tokens',
  label: 'Design Tokens',
  icon: Palette,
  badge: tokens.length,
  isVirtualRoot: true,
  children: [],  // Los tokens no son items seleccionables individualmente — se editan en panel
  onAdd: () => {
    setSelectedTokenId('__tokens_editor__');
    setSelectedRouteId(null);
    setSelectedSchemaId(null);
    setSelectedScriptId(null);
  },
  addLabel: 'Administrar Variables'
}
```

**Nota**: Los tokens NO son items seleccionables individualmente en el árbol (a diferencia de rutas/schemas/scripts). El árbol los agrupa como categoría y el botón `+` abre el editor global.

#### 3e — Actualizar `handleSelectNode` para el nuevo nodo

Añadir dentro del `handleSelectNode` el caso para `root-tokens`:

```typescript
const handleSelectNode = (node: TreeNode) => {
  if (node.isVirtualRoot) {
    // Solo root-tokens activa el editor de tokens
    if (node.id === 'root-tokens') {
      setSelectedTokenId('__tokens_editor__');
      setSelectedRouteId(null);
      setSelectedSchemaId(null);
      setSelectedScriptId(null);
    }
    return;
  }
  // ... resto del handler sin cambios
};
```

#### 3f — Render del TokensEditor en Panel 3

Añadir dentro de `<main>` junto a los demás editores condicionales:

```typescript
{selectedTokenId === '__tokens_editor__' && (
  <TokensEditor
    tokens={tokens as any[]}
    onAdd={handleAddToken}
    onSave={handleSaveToken}
    onRemove={handleRemoveToken}
  />
)}
```

Y actualizar el empty state condition:

```typescript
// ANTES:
{!selectedRouteId && !selectedSchemaId && !selectedScriptId && (

// DESPUÉS:
{!selectedRouteId && !selectedSchemaId && !selectedScriptId && !selectedTokenId && (
```

#### 3g — Añadir import de TokensEditor

```typescript
import { TokensEditor } from './TokensEditor';
```

---

### Modificación 4: `src/components/agnostic/blocks/AgnosticFrame.tsx`

**Este archivo es NUEVO en el plan PLAN_FRAME_PRIMITIVE.md.** Debe construirse con `resolveValue` desde el inicio. El código correcto para `AgnosticFrame.tsx`:

```typescript
'use client';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { resolveValue, resolvePadding } from '@/lib/agnostic/resolveToken';

const AgnosticRenderer = dynamic(
  () => import('../engine/AgnosticRenderer').then(m => m.AgnosticRenderer),
  { ssr: false }
);

interface FrameProps {
  blocks?: any[];
  direction?: 'horizontal' | 'vertical';
  align_items?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  gap?: number | string;
  padding?: Array<number | string>;
  sizing?: 'fill' | 'hug' | 'fixed';
  min_height?: number | string;
  record?: any;
}

export function AgnosticFrame({
  blocks = [],
  direction = 'vertical',
  align_items,
  justify,
  gap = 0,
  padding,
  sizing,
  min_height,
  record,
}: FrameProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col',
        sizing === 'hug' ? 'w-auto' : 'w-full'
      )}
      style={{
        gap:        resolveValue(gap),
        padding:    resolvePadding(padding as Array<string | number>),
        alignItems: align_items,
        justifyContent: justify,
        minHeight:  resolveValue(min_height),
      }}
    >
      {blocks.map((block, i) => (
        <AgnosticRenderer key={block.id || i} block={block} record={record} />
      ))}
    </div>
  );
}
```

---

## Integración de TokenOrStaticInput en el editor de frames

`TokenOrStaticInput` se usa en el panel de propiedades del RouteEditor (el panel derecho del layout de 2 columnas de `PLAN_FRAME_PRIMITIVE.md`). Cuando el nodo seleccionado es `type: 'frame'`, los inputs de `gap`, `padding_top/right/bottom/left` y `min_height` son `TokenOrStaticInput` con `category="spacing"`.

El widget recibe la lista de tokens del store vía prop desde `RouteEditor`:

```typescript
// En RouteEditor — añadir prop tokens
function RouteEditor({ routeId, routes, schemas, tokens, ... }) {
  // ... pasar tokens al panel de propiedades de frame
}
```

```typescript
// En el panel derecho de propiedades, cuando selectedBlock.type === 'frame':
<TokenOrStaticInput
  label="Gap"
  value={selectedBlock.gap}
  onChange={v => updateSelectedBlock({ gap: v })}
  category="spacing"
  tokens={tokens.map((t: any) => ({
    id: t.id,
    name: t.data?.name,
    category: t.data?.category,
    value: t.data?.value
  }))}
/>
```

**Alcance de fase 1**: `TokenOrStaticInput` solo se usa en propiedades de layout de frames (gap, padding, min_height). Los configs de data blocks (form, table) mantienen `AgnosticConfigProjector` sin token-awareness por ahora.

---

## Entropía anticipada y cómo prevenirla

### E1 — `tokens.css` es ahora un archivo generado
El archivo es sobreescrito en cada sync. Si existe contenido manual previo, se pierde. El header del archivo generado dice explícitamente `do not edit manually`. Para variables que el usuario quiera escribir manualmente (CSS avanzado), deben usar `globals.css` o un archivo separado.

### E2 — Formato de color: HSL sin wrapper
El sistema usa `220 90% 56%` (no `hsl(220, 90%, 56%)`). `resolveColor` añade `hsl()` al usar el valor. Documentar claramente en `TokensEditor` con un placeholder y hint. **El token de color siempre se guarda sin `hsl()` wrapper**.

### E3 — Colisión de nombres con tokens shadcn
Los tokens de shadcn/ui usan nombres como `--primary`, `--background`, `--radius`. Si el usuario crea un token llamado `primary`, generaría `--primary` y colisionaría. Sanitización en `handleAdd`: **no permitir names que sean nombres reservados de shadcn**. Lista de nombres reservados a validar: `primary`, `secondary`, `background`, `foreground`, `card`, `popover`, `border`, `input`, `ring`, `radius`, `muted`, `accent`, `destructive`.

Implementar en `TokensEditor.handleAdd`:

```typescript
const RESERVED_NAMES = ['primary','secondary','background','foreground','card','popover',
  'border','input','ring','radius','muted','accent','destructive'];
if (RESERVED_NAMES.some(r => safeName === r || safeName.startsWith(r + '-'))) {
  toast.error(`"${safeName}" colisiona con tokens de shadcn/ui. Usa un prefijo: ej. "brand-primary"`);
  return;
}
```

### E4 — `selectedTokenId = '__tokens_editor__'` es un sentinel string
No es un UUID real — es un identificador especial para activar el TokensEditor. Esto es limpio pero debe documentarse. Alternativa más limpia: usar `selectedSection: 'routes' | 'schemas' | 'scripts' | 'tokens' | null` en lugar de los 4 `selectedXXXId` separados. Pero esto requeriría refactor de todo el handleSelectNode. Por ahora, el sentinel string es aceptable. **Gemini NO debe cambiar la arquitectura de estados del designer** — solo añadir el caso de tokens.

### E5 — Pallete icon en sidebar ya abre `isConfigOpen`
El ícono `<Palette>` en la barra izquierda colapsable (línea ~449) actualmente llama a `setIsConfigOpen(true)`. Este comportamiento se MANTIENE — el panel de config del sistema sigue siendo independiente del editor de tokens. No cambiar el sidebar icon behavior.

### E6 — `tokens` prop en RouteEditor requiere actualizar su interface y llamada
Al pasar `tokens` como prop a `RouteEditor`, la interfaz del componente debe actualizarse:

```typescript
function RouteEditor({
  routeId, routes, schemas, tokens, onSave, onRemove
}: {
  routeId: string;
  routes: any[];
  schemas: any[];
  tokens: any[];     // ← AÑADIR
  onSave: (id: string, patch: any) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
```

Y la llamada desde el main panel:

```typescript
<RouteEditor
  routeId={selectedRouteId}
  routes={routes}
  schemas={schemas}
  tokens={tokens}   // ← AÑADIR
  onSave={handleSaveRoute}
  onRemove={handleRemoveRoute}
/>
```

### E7 — El sync API usa `getStrategy()` que requiere el contexto de tenant activo
`getStrategy()` lee el passport del tenant activo vía `readPassport()`. Esto funciona en el servidor en el contexto de Next.js API routes. No hay riesgo — es el mismo patrón que usa `/api/vault`.

---

## Archivos a NO tocar

| Archivo | Motivo |
|---|---|
| `src/app/api/vault/route.ts` | Los tokens se persisten igual que cualquier otro namespace |
| `AgnosticVisual.tsx` | Leaf renderers — en futuras fases podrán usar `resolveColor` |
| `AgnosticRenderer.tsx` | Sin cambios |
| `RecursiveBlockComposer.tsx` | TokenOrStaticInput se integra desde RouteEditor, no desde aquí |
| `AgnosticConfigProjector.tsx` | Sin cambios en fase 1 — token-awareness en config sheets es fase 2 |
| `globals.css` | Tokens shadcn base intocables |
| Cualquier archivo de storage | Backward compatible |

---

## Verificación post-implementación

Gemini debe confirmar:

1. `npx tsc --noEmit` pasa sin errores
2. En el designer, el árbol lateral izquierdo muestra "Design Tokens" como 4º nodo virtual con ícono Palette
3. Al hacer click en el nodo raíz "Design Tokens", el panel derecho muestra el TokensEditor
4. Crear un token `gap-forms` con valor `0.9375rem` y categoría `spacing` → aparece en la lista
5. Al hacer click en "Sincronizar CSS", se crea `storage/{tenant}/styles/tokens.css` con la variable `--gap-forms: 0.9375rem;`
6. En el editor de un frame (del plan PLAN_FRAME_PRIMITIVE), el input de Gap muestra el botón de toggle `⚡` y al activarlo lista el token `--gap-forms`
7. Guardar una ruta con `"gap": "var(--gap-forms)"` en el JSON → el frame renderiza con el gap correcto en la página
8. Intentar crear un token con nombre `primary` → muestra error de colisión con shadcn
9. Búsqueda en codebase: `'design_tokens'` como string literal → 0 resultados (siempre usar `SYSTEM_NS.TOKENS`)
