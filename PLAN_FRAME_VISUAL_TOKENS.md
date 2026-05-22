# Plan Unificado: Vocabulario de Campos + Tokens Visuales + Fix Estructural Frame

## Diagnóstico crítico previo al plan

### BUG BLOQUEANTE — Frame settings completamente rotos

`AgnosticConfigProjector.tsx` línea 110:
```tsx
{field.fields?.map((f: any) => (
  <div key={f.key}>{renderField(f, field.key)}</div>  // field.key = "layout"
))}
```

Cuando `frame.settings.json` declara sections con keys `"layout"`, `"dimensiones"`, `"espaciado"`:
- ConfigProjector escribe: `{ layout: { direction: "horizontal" } }` (namespaced)
- Bloque guardado: `block.layout = { direction: "horizontal" }`
- `AgnosticRenderer.effectiveConfig` spread: `...(block.visual || {})`, `...(block.behavior || {})` — NUNCA spread `block.layout`
- `AgnosticFrame` recibe `layout={object}` como prop inútil, nunca `direction`

**Las propiedades de frame configuradas desde el designer nunca llegan al render. El frame visual es ciego a su propia configuración.**

El mecanismo de namespacing existe por una razón legítima: `columns.settings.json` usa `"key": "visual"` → datos en `block.visual` → `effectiveConfig` los spread → `AgnosticColumns` los recibe ✅. El error es que frame.settings.json usa keys que no están en el spread de `effectiveConfig`.

### Fix: `ns: false` en secciones que no deben namespacear

Un flag declarativo en el schema. Sin tocar el comportamiento existente de columnas.

---

## Árbol de cambios — 6 archivos, 0 nuevos

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `AgnosticConfigProjector.tsx` | Fix ns:false + token_category early check + toggle_group + divider + number explícito |
| 2 | `frame.settings.json` | Reescritura completa: ns:false, toggle_group, token_category, sección apariencia |
| 3 | `resolveToken.ts` | Fix resolveColor para HSL estático |
| 4 | `TokenOrStaticInput.tsx` | Fix input estático para colores |
| 5 | `AgnosticFrame.tsx` | Añadir props visuales + resolveColor |
| 6 | `TokensEditor.tsx` | Edición inline de tokens existentes |

---

## Archivo 1: `src/components/agnostic/modules/AgnosticConfigProjector.tsx`

### 1a — Añadir import de LucideIcons para toggle_group

```tsx
import * as LucideIcons from 'lucide-react';
```

Mantener los imports existentes individuales. Añadir el wildcard para resolución dinámica en toggle_group.

### 1b — Fix ns:false en `case 'section'`

**CAMBIAR** la línea 110 de:
```tsx
<div key={f.key}>{renderField(f, field.key)}</div>
```
**A:**
```tsx
<div key={f.key}>{renderField(f, field.ns !== false ? field.key : undefined)}</div>
```

Cuando `field.ns === false`: sección puramente visual, datos planos. Cuando no especificado: comportamiento actual (namespaced). Retrocompatible — `columns.settings.json` sin `ns` sigue igual.

### 1c — token_category como check prioritario antes del switch

Añadir al inicio de `renderField`, ANTES del `switch (field.type)`:

```tsx
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
```

**ELIMINAR** el bloque actual del `default:` que contiene el array hardcodeado:
```tsx
const isTokenAware = ['gap', 'min_height', 'padding_top', ...].includes(field.key);
if (isTokenAware) { ... }
```

### 1d — Añadir `case 'toggle_group'`

Antes del `default:`, añadir:

```tsx
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
          const IconComp = opt.icon ? (LucideIcons as any)[opt.icon] : null;
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
```

### 1e — Añadir `case 'divider'`

Para sub-agrupación visual dentro de una sección sin crear namespace. Antes del `default:`:

```tsx
case 'divider':
  return (
    <div key={field.key} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 border-b border-border/10 pb-1 pt-3">
      {field.label}
    </div>
  );
```

### 1f — Añadir `case 'number'` explícito

Antes del `default:`. Los campos `number` sin `token_category` obtienen un `<Input type="number">` semántico:

```tsx
case 'number':
  return (
    <div key={field.key} className="space-y-1">
      {label}
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => updateValue(e.target.value === '' ? undefined : parseFloat(e.target.value))}
        placeholder={field.placeholder || '0'}
        min={field.min}
        max={field.max}
        step={field.step ?? 'any'}
        className="h-8 text-xs font-mono"
      />
      {field.description && <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>}
    </div>
  );
```

### 1g — Actualizar `default:` final

Después de eliminar el bloque token-aware hardcodeado, el `default:` queda simplificado:

```tsx
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
```

---

## Archivo 2: `src/core/designer/dna/schemas/frame.settings.json`

Reescritura completa. Estrategia: sección exterior `"key": "visual"` (SIN `ns: false`) con sub-agrupación visual via `type: "divider"`. Datos almacenados en `block.visual` → `effectiveConfig` los spread → `AgnosticFrame` los recibe planos ✅.

```json
{
  "id": "frame_settings_def",
  "name": "frame_settings",
  "fields": [
    {
      "key": "visual",
      "label": "Frame",
      "type": "section",
      "fields": [

        { "key": "_g_layout", "type": "divider", "label": "Layout" },

        {
          "key": "direction",
          "label": "Dirección",
          "type": "toggle_group",
          "options": [
            { "value": "vertical",   "icon": "AlignLeft",  "label": "Columna" },
            { "value": "horizontal", "icon": "AlignRight", "label": "Fila" }
          ]
        },
        {
          "key": "align_items",
          "label": "Alineación de hijos",
          "type": "toggle_group",
          "options": [
            { "value": "start",   "icon": "ArrowUp",    "label": "Inicio" },
            { "value": "center",  "icon": "AlignCenter","label": "Centro" },
            { "value": "end",     "icon": "ArrowDown",  "label": "Fin" },
            { "value": "stretch", "icon": "Maximize2",  "label": "Estirar" }
          ]
        },
        {
          "key": "justify",
          "label": "Distribución",
          "type": "toggle_group",
          "options": [
            { "value": "start",         "icon": "AlignLeft",    "label": "Inicio" },
            { "value": "center",        "icon": "AlignCenter",  "label": "Centro" },
            { "value": "end",           "icon": "AlignRight",   "label": "Fin" },
            { "value": "space-between", "icon": "AlignJustify", "label": "Entre" }
          ]
        },
        {
          "key": "gap",
          "label": "Separación (gap)",
          "type": "number",
          "placeholder": "0",
          "token_category": "spacing"
        },

        { "key": "_g_dims", "type": "divider", "label": "Dimensiones" },

        {
          "key": "sizing",
          "label": "Ancho",
          "type": "toggle_group",
          "options": [
            { "value": "fill", "icon": "Maximize2", "label": "Llenar" },
            { "value": "hug",  "icon": "Minimize2", "label": "Ajustar" }
          ]
        },
        {
          "key": "min_height",
          "label": "Altura mínima",
          "type": "number",
          "placeholder": "0",
          "token_category": "spacing"
        },

        { "key": "_g_pad", "type": "divider", "label": "Padding" },

        { "key": "padding_top",    "label": "Arriba",    "type": "number", "placeholder": "0", "token_category": "spacing" },
        { "key": "padding_right",  "label": "Derecha",   "type": "number", "placeholder": "0", "token_category": "spacing" },
        { "key": "padding_bottom", "label": "Abajo",     "type": "number", "placeholder": "0", "token_category": "spacing" },
        { "key": "padding_left",   "label": "Izquierda", "type": "number", "placeholder": "0", "token_category": "spacing" },

        { "key": "_g_app", "type": "divider", "label": "Apariencia" },

        {
          "key": "background_color",
          "label": "Color de fondo",
          "type": "text",
          "placeholder": "220 90% 56%",
          "token_category": "color"
        },
        {
          "key": "text_color",
          "label": "Color de texto",
          "type": "text",
          "placeholder": "0 0% 10%",
          "token_category": "color"
        },
        {
          "key": "border_radius",
          "label": "Radio de borde",
          "type": "number",
          "placeholder": "0",
          "token_category": "radius"
        }
      ]
    }
  ]
}
```

### Impacto en el flujo de datos

Con esta estructura, ConfigProjector escribe:
```
{ visual: { direction: "horizontal", gap: 1.5, background_color: "var(--brand-primary)", padding_top: 2, ... } }
```

`AgnosticRenderer.effectiveConfig` spread `block.visual`:
```
effectiveConfig = { direction: "horizontal", gap: 1.5, background_color: "var(--brand-primary)", padding_top: 2, ... }
```

`AgnosticFrame` recibe props planas ✅.

### Ajuste necesario en `AgnosticDesigner.tsx` — RouteEditor

El expand de padding al abrir el panel de propiedades actualmente lee `selectedBlock.padding?.[0]`:
```tsx
const frameData = selectedBlock.type === 'frame' ? {
  ...selectedBlock,
  padding_top:    selectedBlock.padding?.[0] ?? 0,
  ...
```

Con la nueva estructura, padding está en `selectedBlock.visual?.padding_top` (no en el array). Cambiar a:
```tsx
const frameData = selectedBlock.type === 'frame' ? {
  ...selectedBlock,
  // Flatten visual for ConfigProjector (ConfigProjector reads data["visual"]["gap"] etc.)
  // Nothing to do — selectedBlock.visual already has padding_top flat
} : selectedBlock;
```

Es decir: `frameData = selectedBlock` sin transformación. La expansión de padding ya no es necesaria porque los campos son planos dentro de `visual`. La lógica del `handleUpdate` en `RecursiveBlockComposer` que convierte `padding_top/right/bottom/left` → `padding: [T,R,B,L]` TAMBIÉN debe eliminarse — ya no se usa el array de padding. El componente `AgnosticFrame` recibirá `padding_top`, `padding_right`, etc. directamente y usará `resolvePadding` con datos distintos.

### Ajuste en `AgnosticFrame.tsx` — padding plano vs. array

Con la nueva estructura, `AgnosticFrame` recibe `padding_top`, `padding_right`, `padding_bottom`, `padding_left` como props individuales (de `block.visual` spread), NO como `padding: [T,R,B,L]`. El componente debe construir el string de padding internamente:

```tsx
// Las props llegan planas
interface FrameProps {
  ...
  padding_top?:    number | string;
  padding_right?:  number | string;
  padding_bottom?: number | string;
  padding_left?:   number | string;
  // Eliminar: padding?: Array<number | string>
  ...
}

// En el componente:
const paddingCss = [padding_top, padding_right, padding_bottom, padding_left]
  .every(v => v === undefined || v === 0 || v === '')
  ? undefined
  : `${resolveValue(padding_top) ?? '0'} ${resolveValue(padding_right) ?? '0'} ${resolveValue(padding_bottom) ?? '0'} ${resolveValue(padding_left) ?? '0'}`;

// style={{ padding: paddingCss, ... }}
```

Y eliminar `resolvePadding` del import (ya no se necesita). La función puede quedarse en `resolveToken.ts` para uso futuro.

### Ajuste en `RecursiveBlockComposer.tsx` — eliminar merge de padding

**ELIMINAR** el `handleUpdate` wrapper que mergea padding:
```tsx
// ELIMINAR todo esto:
const handleUpdate = (patch: any) => {
  const { padding_top, padding_right, padding_bottom, padding_left, ...rest } = patch;
  const hasPadding = [...].some(v => v !== undefined);
  if (hasPadding) { rest.padding = [...]; }
  onUpdate(rest);
};
```

**REEMPLAZAR** todas las llamadas `handleUpdate` por `onUpdate` directamente. El ConfigProjector emite patches planos dentro del namespace visual; no se necesita merge especial.

---

## Archivo 3: `src/lib/agnostic/resolveToken.ts`

Fix en `resolveColor`: el color estático como `"220 90% 56%"` debe envolver en `hsl()`.

```ts
export function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('var('))  return `hsl(${value})`;           // token → hsl(var(--x))
  if (value.startsWith('#'))     return value;                      // hex → as-is
  if (value.startsWith('rgb'))   return value;                      // rgb/rgba → as-is
  if (value.startsWith('hsl'))   return value;                      // hsl() ya completo → as-is
  return `hsl(${value})`;                                           // "220 90% 56%" → hsl(220 90% 56%)
}
```

---

## Archivo 4: `src/components/ui/TokenOrStaticInput.tsx`

Fix del input estático: eliminar `type="color"`. Un input de texto universal con placeholder contextual.

**CAMBIAR** en el bloque `mode === 'static'`:
```tsx
// DE:
<Input
  type={category === 'color' ? 'color' : 'text'}
  value={typeof value === 'number' ? value : (value ?? '')}
  onChange={e => {
    const raw = e.target.value;
    const num = parseFloat(raw);
    onChange(isNaN(num) ? raw : num);
  }}
  ...
/>

// A:
<Input
  type="text"
  value={typeof value === 'number' ? String(value) : (value ?? '')}
  onChange={e => {
    const raw = e.target.value;
    // spacing/radius: parsear como número si es posible
    if (category !== 'color' && category !== 'typography' && category !== 'custom') {
      const num = parseFloat(raw);
      onChange(!isNaN(num) && raw.trim() !== '' ? num : raw);
    } else {
      onChange(raw);
    }
  }}
  placeholder={
    category === 'color'      ? '220 90% 56%'  :
    category === 'radius'     ? '0.5'           :
    category === 'typography' ? '1rem'          :
    category === 'shadow'     ? '0 4px 6px ...' :
    placeholder
  }
  className="h-7 text-xs font-mono flex-1 min-w-0"
/>
```

---

## Archivo 5: `src/components/agnostic/blocks/AgnosticFrame.tsx`

Actualizar interface y render con props visuales y padding plano.

```tsx
'use client';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { resolveValue, resolveColor } from '@/lib/agnostic/resolveToken';

const AgnosticRenderer = dynamic(
  () => import('../engine/AgnosticRenderer').then(m => m.AgnosticRenderer),
  { ssr: false }
);

interface FrameProps {
  blocks?:          any[];
  direction?:       'horizontal' | 'vertical';
  align_items?:     'start' | 'center' | 'end' | 'stretch';
  justify?:         'start' | 'center' | 'end' | 'space-between' | 'space-around';
  gap?:             number | string;
  padding_top?:     number | string;
  padding_right?:   number | string;
  padding_bottom?:  number | string;
  padding_left?:    number | string;
  sizing?:          'fill' | 'hug' | 'fixed';
  min_height?:      number | string;
  background_color?: string;
  text_color?:       string;
  border_radius?:    number | string;
  record?:           any;
}

export function AgnosticFrame({
  blocks = [],
  direction = 'vertical',
  align_items,
  justify,
  gap,
  padding_top,
  padding_right,
  padding_bottom,
  padding_left,
  sizing,
  min_height,
  background_color,
  text_color,
  border_radius,
  record,
}: FrameProps) {
  const sides = [padding_top, padding_right, padding_bottom, padding_left];
  const hasPadding = sides.some(v => v !== undefined && v !== 0 && v !== '');
  const paddingCss = hasPadding
    ? sides.map(v => resolveValue(v) ?? '0').join(' ')
    : undefined;

  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col',
        sizing === 'hug' ? 'w-auto' : 'w-full'
      )}
      style={{
        gap:             resolveValue(gap),
        padding:         paddingCss,
        alignItems:      align_items,
        justifyContent:  justify,
        minHeight:       resolveValue(min_height),
        backgroundColor: resolveColor(background_color),
        color:           resolveColor(text_color),
        borderRadius:    resolveValue(border_radius),
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

## Archivo 6: `src/components/agnostic/designer/TokensEditor.tsx`

Añadir edición inline. Añadir `Check` a los imports de lucide.

**Añadir estados** al inicio del componente:
```tsx
const [editingId, setEditingId] = useState<string | null>(null);
const [editingData, setEditingData] = useState({ value: '', description: '' });
```

**Añadir función** de guardar edición:
```tsx
const handleSaveEdit = async () => {
  if (!editingId) return;
  const token = tokens.find(t => t.id === editingId);
  if (!token) return;
  await onSave(editingId, { ...token.data, value: editingData.value.trim(), description: editingData.description.trim() });
  await syncTokensCss();
  setEditingId(null);
};
```

**Reemplazar** la fila del token en el map:
```tsx
<div
  key={token.id}
  onClick={() => {
    if (editingId !== token.id) {
      setEditingId(token.id);
      setEditingData({ value: token.data?.value || '', description: token.data?.description || '' });
    }
  }}
  className="flex flex-col gap-2 bg-background border rounded-xl px-4 py-3 hover:border-primary/20 cursor-pointer transition-all group shadow-sm"
>
  {/* Fila principal */}
  <div className="flex items-center gap-3">
    {token.data?.category === 'color' && (
      <div className="w-5 h-5 rounded-md border border-border shrink-0" style={{ backgroundColor: `hsl(${token.data.value})` }} />
    )}
    <code className="text-[11px] font-mono text-primary font-bold shrink-0">--{token.data?.name}</code>
    <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">{token.data?.value}</span>
    {token.data?.description && (
      <span className="text-[10px] text-muted-foreground/50 truncate max-w-[180px] hidden sm:block">{token.data.description}</span>
    )}
    <Button
      variant="ghost" size="icon"
      onClick={(e) => { e.stopPropagation(); handleRemove(token.id); }}
      className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 text-destructive/40 hover:text-destructive hover:bg-destructive/5 shrink-0 transition-all"
    >
      <Trash2 size={13} />
    </Button>
  </div>

  {/* Panel de edición inline */}
  {editingId === token.id && (
    <div className="flex items-end gap-2 pt-2 border-t border-border/50" onClick={e => e.stopPropagation()}>
      <div className="space-y-1 flex-1">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          Valor{token.data?.category === 'color' ? ' (HSL: "220 90% 56%")' : ''}
        </label>
        <Input
          value={editingData.value}
          onChange={e => setEditingData(p => ({ ...p, value: e.target.value }))}
          placeholder={token.data?.category === 'color' ? '220 90% 56%' : '1.5rem'}
          className="font-mono text-xs h-8"
          autoFocus
        />
      </div>
      <div className="space-y-1 flex-1">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descripción</label>
        <Input
          value={editingData.description}
          onChange={e => setEditingData(p => ({ ...p, description: e.target.value }))}
          placeholder="Para qué se usa"
          className="text-xs h-8"
        />
      </div>
      <Button size="sm" onClick={handleSaveEdit}
        className="h-8 text-[10px] font-black uppercase tracking-widest gap-1 shrink-0">
        <Check size={11} /> Guardar
      </Button>
      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
        className="h-8 text-[10px] font-black uppercase tracking-widest shrink-0">
        Cancelar
      </Button>
    </div>
  )}
</div>
```

---

## Registro de entropía anticipada

| Riesgo | Mitigation |
|--------|------------|
| Bloques frame existentes en storage con `block.layout = { direction }` (namespaced antiguo) | Al renderizar: `{...block}` spread da `layout={object}` (inútil pero inofensivo). Frame usa defaults. Usuario abre, reconfirma, guarda — datos migran a `block.visual` |
| `handleUpdate` eliminado en RecursiveBlockComposer — llamadas directas a `onUpdate` | Verificar que todas las llamadas a `handleUpdate` en el componente sean reemplazadas por `onUpdate`. No hay otras diferencias — el merge de padding ya no es necesario |
| `_g_layout`, `_g_dims`, `_g_pad`, `_g_app` son keys de divider sin valor — ConfigProjector intentará leer `data["_g_layout"]` | `renderField` para `divider` no llama `updateValue` ni lee `value`. Verificar que la lógica de token_category check no procese fields de tipo divider (no tendrán `token_category`, fallará silenciosamente al switch y hit `case 'divider':`) |
| `resolveValue(0)` → `'0'` pero `gap: '0'` en CSS es válido | Correcto ✅ |
| `resolveColor(undefined)` en `background_color` no definido | Retorna `undefined` → CSS `backgroundColor: undefined` → no aplica estilo ✅ |
| `Minimize2` puede no existir en la versión de lucide instalada | Alternativa: `Shrink` o `Square`. Verificar con `grep -r "Minimize2" node_modules/lucide-react` |

---

## Verificación post-implementación

```bash
npx tsc --noEmit    # cero errores
npm run build       # build limpio
```

1. Crear un frame nuevo → panel muestra toggle_group para dirección con iconos
2. Cambiar dirección a "Horizontal" → guardar → frame renderiza en fila
3. Crear token `spacing` `gap-content: 1.5rem` → sincronizar
4. En campo gap del frame → toggle ⚡ → dropdown muestra `--gap-content` 
5. Seleccionar token → guardar → frame tiene `gap: "hsl(var(...))"` — ESPERA, gap no es color
6. `resolveValue("var(--gap-content)")` → `"var(--gap-content)"` (string as-is) → CSS `gap: var(--gap-content)` → browser resuelve a `1.5rem` ✅
7. Crear token `color` `brand-primary: 220 90% 56%` → sincronizar  
8. En campo `background_color` → toggle ⚡ → seleccionar `var(--brand-primary)`
9. `resolveColor("var(--brand-primary)")` → `"hsl(var(--brand-primary))"` → CSS válido ✅
10. Editar token `brand-primary` → cambiar valor → Guardar → CSS se regenera → color del frame cambia en tiempo real al próximo reload
