# Plan: Frame Primitive — Compositor de Layouts Axiomatic

## Contexto y diagnóstico

El sistema actual tiene 3 problemas estructurales:

1. **Tipos semánticos hardcodeados** (`hero`, `cta_banner`) — decisiones de diseño disfrazadas de primitivos. Un "hero" no es un tipo de bloque, es una composición de frame + texto + imagen.

2. **Dead code en AgnosticRenderer** — Las líneas 103–129 (renderizado de frames compuestos) son código MUERTO. El `return null` en línea 101 mata cualquier ejecución antes de llegar a ellas. Esta feature no funciona aunque parece que sí.

3. **RecursiveBlockComposer muestra 15+ tipos sin jerarquía** — El picker llama a `registry.getRegisteredTypes()` y los lista planos. La categoría `category` existe en el registry pero no se expone en la UI.

---

## Modelo de datos del nodo (sin cambios en storage API)

Un frame en `page_routes.json`:

```json
{
  "id": "uuid-generado-con-crypto.randomUUID()",
  "type": "frame",
  "title": "Hero Section",
  "direction": "vertical",
  "align_items": "center",
  "justify": "start",
  "gap": 1.5,
  "padding": [6, 1.5, 6, 1.5],
  "sizing": "fill",
  "blocks": [
    {
      "id": "uuid",
      "type": "text",
      "title": "Título principal",
      "visual": { "variant": "h1", "content": "Mi Título" }
    },
    {
      "id": "uuid",
      "type": "image",
      "title": "Imagen principal",
      "visual": { "src": "/imagen.jpg", "aspect": "video" }
    }
  ]
}
```

La ruta en sí ya tiene `direction`, `gap`, `padding` implícitos (vertical, sin gap, sin padding). No cambia el formato raíz.

---

## Archivos a CREAR (2)

### Archivo 1: `src/components/agnostic/blocks/AgnosticFrame.tsx`

```typescript
'use client';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const AgnosticRenderer = dynamic(
  () => import('../engine/AgnosticRenderer').then(m => m.AgnosticRenderer),
  { ssr: false }
);

interface FrameProps {
  blocks?: any[];
  direction?: 'horizontal' | 'vertical';
  align_items?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  gap?: number;
  padding?: [number, number, number, number];
  sizing?: 'fill' | 'hug' | 'fixed';
  min_height?: number;
  record?: any;
}

function paddingToCss(p?: [number, number, number, number]): string {
  if (!p || p.length < 4) return '';
  return `${p[0]}rem ${p[1]}rem ${p[2]}rem ${p[3]}rem`;
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
        gap: gap ? `${gap}rem` : undefined,
        padding: padding ? paddingToCss(padding) : undefined,
        alignItems: align_items,
        justifyContent: justify,
        minHeight: min_height ? `${min_height}rem` : undefined,
      }}
    >
      {blocks.map((block, i) => (
        <AgnosticRenderer key={block.id || i} block={block} record={record} />
      ))}
    </div>
  );
}
```

**Nota**: Usa `dynamic` para romper la dependencia circular AgnosticFrame → AgnosticRenderer → registry → AgnosticFrame. Este es el mismo patrón que ya usa `AgnosticColumns.tsx`.

---

### Archivo 2: `src/core/designer/dna/schemas/frame.settings.json`

```json
{
  "id": "frame_settings_def",
  "name": "frame_settings",
  "fields": [
    {
      "key": "layout",
      "label": "Layout",
      "type": "section",
      "fields": [
        {
          "key": "direction",
          "label": "Dirección",
          "type": "select",
          "width": "half",
          "options": [
            { "label": "Vertical (columna)", "value": "vertical" },
            { "label": "Horizontal (fila)", "value": "horizontal" }
          ]
        },
        {
          "key": "align_items",
          "label": "Alineación de hijos",
          "type": "select",
          "width": "half",
          "options": [
            { "label": "Inicio", "value": "start" },
            { "label": "Centro", "value": "center" },
            { "label": "Fin", "value": "end" },
            { "label": "Estirar", "value": "stretch" }
          ]
        },
        {
          "key": "justify",
          "label": "Distribución",
          "type": "select",
          "width": "half",
          "options": [
            { "label": "Inicio", "value": "start" },
            { "label": "Centro", "value": "center" },
            { "label": "Fin", "value": "end" },
            { "label": "Espacio entre", "value": "space-between" },
            { "label": "Espacio alrededor", "value": "space-around" }
          ]
        },
        {
          "key": "gap",
          "label": "Separación entre hijos (rem)",
          "type": "number",
          "width": "half",
          "placeholder": "1.5"
        }
      ]
    },
    {
      "key": "dimensiones",
      "label": "Dimensiones",
      "type": "section",
      "fields": [
        {
          "key": "sizing",
          "label": "Ancho",
          "type": "select",
          "width": "half",
          "options": [
            { "label": "Llenar (100%)", "value": "fill" },
            { "label": "Ajustar contenido", "value": "hug" }
          ]
        },
        {
          "key": "min_height",
          "label": "Altura mínima (rem)",
          "type": "number",
          "width": "half",
          "placeholder": "0"
        }
      ]
    },
    {
      "key": "espaciado",
      "label": "Espaciado interno (padding rem)",
      "type": "section",
      "fields": [
        { "key": "padding_top",    "label": "Arriba",   "type": "number", "width": "half", "placeholder": "0" },
        { "key": "padding_right",  "label": "Derecha",  "type": "number", "width": "half", "placeholder": "0" },
        { "key": "padding_bottom", "label": "Abajo",    "type": "number", "width": "half", "placeholder": "0" },
        { "key": "padding_left",   "label": "Izquierda","type": "number", "width": "half", "placeholder": "0" }
      ]
    }
  ]
}
```

**Nota sobre `padding`**: El JSON del nodo usa `padding: [top, right, bottom, left]` como array. El settings schema usa 4 campos individuales (`padding_top`, `padding_right`, etc.) para facilitar la edición en el designer. `RecursiveBlockComposer` debe consolidar los 4 en un array al hacer `onUpdate`. Ver instrucción específica más abajo.

---

## Archivos a MODIFICAR (4)

### Modificación 1: `src/lib/agnostic/init.ts`

**Agregar import** (después del import de AgnosticColumns):
```typescript
import { AgnosticFrame } from '@/components/agnostic/blocks/AgnosticFrame';
import frameSettingsSchema from '@/core/designer/dna/schemas/frame.settings.json';
```

**Agregar registro** dentro de `initializeRegistry()`, en la sección de Layout Projectors, ANTES de `columns`:
```typescript
registry.register('frame', AgnosticFrame, { category: 'layout', name: 'Frame', settings_schema: frameSettingsSchema });
```

**No tocar** el array `VISUAL_BLOCKS` ni ningún otro registro existente.

---

### Modificación 2: `src/components/agnostic/engine/AgnosticRenderer.tsx`

**Eliminar el bloque de código MUERTO** (líneas 103–129 actuales). Es código inalcanzable:

```typescript
// ELIMINAR COMPLETAMENTE este bloque:
// ─── COMPOSITE FRAME: tiene sub-bloques, solo posiciona si no es un componente registrado en la UI ───────────────────────
if (!BlockComponent && Array.isArray(block.blocks) && block.blocks.length > 0) {
  return (
    <div ...>
      {block.blocks.map(...)}
    </div>
  );
}
```

**Motivo**: Esta condición nunca se cumple porque `!BlockComponent` retorna `null` en la línea anterior (98–101). Con `frame` ahora registrado explícitamente, este bloque es permanentemente inalcanzable. Su presencia confunde a cualquiera que lea el código creyendo que los frames genéricos sin tipo funcionan.

**No cambiar nada más** en `AgnosticRenderer.tsx`. El renderizado de `AgnosticFrame` se hace igual que cualquier otra `BlockComponent`.

---

### Modificación 3: `src/components/agnostic/designer/components/RecursiveBlockComposer.tsx`

Este es el cambio más extenso. Tres sub-cambios:

#### 3a — Reemplazar el picker plano por categorías

El picker actual (`SelectContent` con todos los `availableBlocks`) debe reemplazarse por un picker con 4 opciones fijas:

```typescript
// REEMPLAZAR el <SelectContent> del tipo de bloque por:
<SelectContent>
  <SelectItem value="frame">
    Frame (Contenedor)
  </SelectItem>
  
  {/* Separador visual */}
  <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
    Contenido Visual
  </div>
  <SelectItem value="text">Texto</SelectItem>
  <SelectItem value="image">Imagen</SelectItem>
  <SelectItem value="divider">Divisor</SelectItem>
  <SelectItem value="spacer">Espacio</SelectItem>
  <SelectItem value="card_static">Tarjeta</SelectItem>
  <SelectItem value="stats_grid">Métricas</SelectItem>
  <SelectItem value="testimonial">Testimonio</SelectItem>
  <SelectItem value="cta_banner">CTA</SelectItem>
  <SelectItem value="markdown">Markdown</SelectItem>
  <SelectItem value="faq">FAQ</SelectItem>

  {/* Separador visual */}
  <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
    Datos
  </div>
  <SelectItem value="form">Formulario</SelectItem>
  <SelectItem value="table">Tabla</SelectItem>
  <SelectItem value="collection">Colección</SelectItem>
  <SelectItem value="action">Acción</SelectItem>
</SelectContent>
```

**Eliminar** el `useMemo` de `availableBlocks` que llama a `registry.getRegisteredTypes()` — ya no se necesita para el picker. Mantener `registry.getMetadata(block.type)` para el panel de configuración en el Sheet.

#### 3b — Consolidar padding en el `onUpdate` del frame

Cuando el usuario edita `padding_top`, `padding_right`, `padding_bottom`, `padding_left` en el Sheet de un frame, el `onUpdate` debe construir el array `padding` antes de llamar a `updateBlock`:

```typescript
// En el handler del AgnosticConfigProjector para frames:
const handleFrameConfigUpdate = (patch: Record<string, any>) => {
  const { padding_top, padding_right, padding_bottom, padding_left, ...rest } = patch;
  
  const hasNewPadding = [padding_top, padding_right, padding_bottom, padding_left]
    .some(v => v !== undefined);
  
  if (hasNewPadding) {
    const current = block.padding || [0, 0, 0, 0];
    rest.padding = [
      padding_top    ?? current[0],
      padding_right  ?? current[1],
      padding_bottom ?? current[2],
      padding_left   ?? current[3],
    ];
  }
  
  updateBlock(rest);
};
```

Pasar `handleFrameConfigUpdate` como `onUpdate` del `AgnosticConfigProjector` cuando `block.type === 'frame'`. Para otros tipos, usar `updateBlock` directamente como antes.

#### 3c — Cuando se añade un sub-bloque, usar `type: 'frame'` como default

```typescript
// REEMPLAZAR la línea que crea el sub-bloque:
// ANTES:
onClick={() => updateBlock({ blocks: [...(block.blocks || []), { id: crypto.randomUUID(), type: 'form', title: 'Nuevo Sub-Bloque' }] })}

// DESPUÉS:
onClick={() => updateBlock({ blocks: [...(block.blocks || []), { id: crypto.randomUUID(), type: 'frame', title: 'Nuevo Frame', direction: 'vertical', blocks: [] }] })}
```

---

### Modificación 4: `src/components/agnostic/designer/AgnosticDesigner.tsx`

Solo dentro de la función `RouteEditor`. Cambiar el área de composición de bloques (la sección que está después del formulario de metadata de ruta) a un layout de 2 columnas:

#### Estado adicional necesario en RouteEditor:

```typescript
const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
```

#### Función helper: construir TreeNode[] desde blocks (recursiva)

Añadir esta función dentro o fuera de `RouteEditor`:

```typescript
function buildLayerTree(blocks: any[]): TreeNode[] {
  return blocks.map(block => ({
    id: block.id || crypto.randomUUID(),
    label: block.title || block.type,
    icon: block.type === 'frame' ? Box
        : block.type === 'text'  ? Layout
        : block.type === 'image' ? Palette
        : block.type === 'form'  ? FileJson
        : Shield,
    data: block,
    children: block.blocks?.length > 0 ? buildLayerTree(block.blocks) : undefined,
    isExpandable: (block.blocks?.length ?? 0) > 0,
  }));
}
```

#### Función helper: actualizar un nodo por id en el árbol (recursiva)

```typescript
function updateNodeInTree(blocks: any[], targetId: string, patch: any): any[] {
  return blocks.map(block => {
    if (block.id === targetId) return { ...block, ...patch };
    if (block.blocks?.length > 0) {
      return { ...block, blocks: updateNodeInTree(block.blocks, targetId, patch) };
    }
    return block;
  });
}
```

#### Layout de 2 columnas (reemplaza el área de composición actual):

```typescript
{/* Reemplazar el bloque actual de "Composición de Bloques" por: */}
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
    <div className="grid grid-cols-[220px_1fr] gap-4 min-h-[400px]">
      
      {/* Panel izquierdo: árbol de capas */}
      <div className="border rounded-2xl p-3 bg-muted/10 overflow-y-auto">
        <AgnosticTreeView
          nodes={buildLayerTree(localData.blocks || [])}
          selectedId={selectedBlockId}
          onSelect={(node) => setSelectedBlockId(node.id)}
        />
      </div>

      {/* Panel derecho: propiedades del nodo seleccionado */}
      <div className="border rounded-2xl p-5 bg-background overflow-y-auto">
        {!selectedBlockId ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-semibold">
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
              onUpdate={(patch) => {
                setLocalData((prev: any) => ({
                  ...prev,
                  blocks: updateNodeInTree(prev.blocks || [], selectedBlockId, patch)
                }));
              }}
              onRemove={() => {
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
```

---

## Entropía anticipada y cómo prevenirla

### E1 — `handleAddBlock` en RouteEditor ahora es obsoleto
El botón "Añadir Bloque al Layout" y la función `handleAddBlock` que crean bloques tipo `form` hardcodeado deben **eliminarse completamente**. El nuevo botón añade frames. El handler inline es suficiente.

### E2 — `handleUpdateBlock` y `handleRemoveBlock` en RouteEditor quedan obsoletos
Con `updateNodeInTree` y `removeFromTree` inline en el panel derecho, los handlers indexados por `idx` dejan de ser necesarios. **Eliminarlos**.

### E3 — La variable `availableBlocks` en RecursiveBlockComposer
Con el picker categorizado estático, el `useMemo` que llama a `registry.getRegisteredTypes()` ya no alimenta el picker. Sin embargo, `registry.getMetadata(block.type)?.settings_schema` sigue usándose para el Sheet de configuración. **Mantener la importación de `registry` pero eliminar el `useMemo` de `availableBlocks`**.

### E4 — El bloque `handleAddBlock` añade `{ type: 'form', schema_id: '', config: {} }`
Este default hardcodeado desaparece al eliminar `handleAddBlock`. El nuevo default es `{ type: 'frame', direction: 'vertical', blocks: [] }`.

### E5 — `AgnosticColumns` coexiste con `AgnosticFrame`
Son modelos diferentes: `columns` usa CSS Grid (N columnas iguales), `frame` usa flexbox (dirección + alineación libre). Ambos tienen casos de uso válidos. **No eliminar `columns`**.

### E6 — Bloques semánticos en VISUAL_BLOCKS siguen en el picker
`hero`, `cta_banner`, `stats_grid`, etc. siguen registrados y disponibles en el picker categorizado bajo "Contenido Visual". Son hojas válidas — no son reemplazados por frames. Un frame con texto + imagen ES la alternativa componible, pero los bloques semánticos siguen siendo atajos útiles.

### E7 — `header` type en `empresa-2/db/page_routes.json`
Hay un bloque `type: "header"` que no está registrado. Esta es entropía **pre-existente**, no introducida por este plan. No tocar — el renderer ya lo maneja con `console.warn` y `return null`.

### E8 — El `AgnosticRenderer` buscará `AgnosticFrame` vía registry
Cuando el renderer encuentra `type: 'frame'`, llamará a `registry.get('frame')` → `AgnosticFrame`. `AgnosticFrame` importa dinámicamente `AgnosticRenderer`. El ciclo es: `AgnosticRenderer → registry.get('frame') → AgnosticFrame → dynamic(AgnosticRenderer)`. Next.js resuelve esto correctamente porque el `dynamic` se evalúa en tiempo de render, no en tiempo de módulo. **Sin riesgo de circular import en build**.

### E9 — El `padding` en frame.settings.json usa 4 campos separados
El nodo en JSON usa `padding: [top, right, bottom, left]`. El settings schema usa `padding_top/right/bottom/left` individuales. La consolidación en `handleFrameConfigUpdate` debe también LEER el array actual para pre-llenar valores al abrir el Sheet. Esto requiere que `AgnosticConfigProjector` reciba `data` con los valores expandidos:

```typescript
// Al abrir el Sheet de un frame, expandir el array antes de pasarlo a AgnosticConfigProjector:
const frameData = block.type === 'frame' ? {
  ...block,
  padding_top:    block.padding?.[0] ?? 0,
  padding_right:  block.padding?.[1] ?? 0,
  padding_bottom: block.padding?.[2] ?? 0,
  padding_left:   block.padding?.[3] ?? 0,
} : block;
```

Pasar `frameData` en vez de `block` al `AgnosticConfigProjector` dentro del Sheet cuando `block.type === 'frame'`.

---

## Archivos a NO tocar

| Archivo | Motivo |
|---|---|
| `AgnosticVisual.tsx` | Leaf renderers sin cambios |
| `AgnosticTreeView.tsx` | Se reutiliza sin cambios |
| `AgnosticRenderer.tsx` líneas 131–165 | Leaf rendering sin cambios |
| `AgnosticDesigner.tsx` SchemaEditor | Solo cambia RouteEditor |
| `AgnosticDesigner.tsx` ScriptEditor | Sin cambios |
| `storage/**/page_routes.json` | Backward compatible — bloques existentes no requieren migración |
| Todos los settings JSON existentes | Sin cambios |
| `AgnosticColumns.tsx` | Coexiste con frame (grid vs flexbox) |

---

## Verificación post-implementación

Gemini debe confirmar:

1. `npx tsc --noEmit` pasa sin errores nuevos
2. En el designer, al editar una ruta, el área de bloques muestra 2 columnas: árbol izquierdo + propiedades derecha
3. Añadir un Frame crea un nodo en el árbol izquierdo y lo selecciona automáticamente
4. Dentro de un Frame, añadir un sub-bloque `text` lo agrega como hijo en el árbol
5. El picker de tipo muestra las 3 categorías (Frame / Contenido Visual / Datos) sin los 15+ ítems planos
6. Un frame anidado con texto renderiza correctamente en la página (no solo en el designer)
7. Búsqueda en codebase: `availableBlocks.map` → 0 resultados en RecursiveBlockComposer
8. Búsqueda en codebase: `COMPOSITE FRAME` → 0 resultados (el dead code fue eliminado)
9. Búsqueda: `type: 'form', schema_id: '', config: {}` → 0 resultados (el default hardcodeado fue eliminado)
