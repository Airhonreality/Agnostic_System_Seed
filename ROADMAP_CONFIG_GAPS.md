# ROADMAP: Configuration Gaps — Agnostic Seed
**Ejecutor objetivo: GitHub Copilot**
**Fecha:** 2026-05-21
**Rama:** v2-sovereign-rebirth

---

## Diagnóstico

El sistema tiene la arquitectura correcta. Los resolvers existen (`dna_fields`, `dna_registry`,
`logic_engine_registry`, `block_registry`). El ConfigProjector sabe usarlos cuando un campo
declara `options_source`. El problema es que varios campos en los settings schemas siguen
declarados como `"type": "string"` cuando deberían referenciar esos resolvers — y el case
`multi-select` del ConfigProjector no está implementado como un selector de múltiples valores real.

**Nada arquitectónico cambia. Solo configuración y un caso de UI faltante.**

---

## Mapa de Brechas

| # | Archivo | Campo | Estado actual | Estado correcto |
|---|---------|-------|--------------|----------------|
| G1 | `block_settings.schema.json` | `visual.switches` | `type: string` | `type: multi-select, options_source: dna_fields` |
| G2 | `block_settings.schema.json` | `visual.blackout` | `type: string` | `type: multi-select, options_source: dna_fields` |
| G3 | `collection.settings.json` | `visual.switches` | `type: string` | `type: multi-select, options_source: dna_fields` |
| G4 | `collection.settings.json` | `visual.blackout` | `type: string` | `type: multi-select, options_source: dna_fields` |
| G5 | `form.settings.json` | `visual.switches` | `type: string` | `type: multi-select, options_source: dna_fields` |
| G6 | `form.settings.json` | `visual.blackout` | `type: string` | `type: multi-select, options_source: dna_fields` |
| G7 | `form.settings.json` | `data_architecture.visible_fields` | `type: string` | `type: multi-select, options_source: dna_fields` |
| G8 | `AgnosticConfigProjector.tsx` | `case 'multi-select'` | Alias de single-select | Selector de múltiples valores con chips removibles |
| G9 | `RecursiveBlockComposer.tsx` | DNA Select display | Muestra UUID o slug crudo | Siempre resuelve a UUID canónico antes de pasar al Select |

---

## Tarea 1 — JSON: Declarar `type: multi-select` en campos de whitelist

**Archivos a modificar:**
- `src/core/designer/dna/block_settings.schema.json`
- `src/core/designer/dna/schemas/collection.settings.json`
- `src/core/designer/dna/schemas/form.settings.json`

### `block_settings.schema.json` — sección `visual`

```json
// ANTES:
{ "key": "switches", "label": "Campos Visibles (Whitelist)", "type": "string", "description": "..." },
{ "key": "blackout", "label": "Campos Ocultos (Blacklist)", "type": "string", "description": "..." }

// DESPUÉS:
{ "key": "switches", "label": "Campos Visibles (Whitelist)", "type": "multi-select", "options_source": "dna_fields", "description": "Campos del DNA a proyectar. Vacío = todos." },
{ "key": "blackout", "label": "Campos Ocultos (Blacklist)", "type": "multi-select", "options_source": "dna_fields", "description": "Campos del DNA a ocultar de la proyección." }
```

### `collection.settings.json` — sección `visual`

```json
// ANTES:
{ "key": "switches", "label": "Campos Visibles (Whitelist de Columnas)", "type": "string", "description": "..." },
{ "key": "blackout", "label": "Campos Ocultos (Blacklist de Columnas)", "type": "string", "description": "..." }

// DESPUÉS:
{ "key": "switches", "label": "Campos Visibles (Whitelist)", "type": "multi-select", "options_source": "dna_fields", "description": "Columnas a proyectar en tabla/cards. Vacío = todas." },
{ "key": "blackout", "label": "Campos Ocultos (Blacklist)", "type": "multi-select", "options_source": "dna_fields", "description": "Columnas a ocultar de la proyección." }
```

### `form.settings.json` — sección `visual` y `data_architecture`

```json
// ANTES (visual):
{ "key": "switches", "label": "Campos Visibles en Tabla/Colección (Whitelist)", "type": "string", "description": "..." },
{ "key": "blackout", "label": "Campos Ocultos en Tabla/Colección (Blacklist)", "type": "string", "description": "..." }

// DESPUÉS (visual):
{ "key": "switches", "label": "Campos Visibles en Tabla/Colección (Whitelist)", "type": "multi-select", "options_source": "dna_fields", "description": "Columnas a proyectar en AgnosticTable y AgnosticGroupedCard. Vacío = todas." },
{ "key": "blackout", "label": "Campos Ocultos en Tabla/Colección (Blacklist)", "type": "multi-select", "options_source": "dna_fields", "description": "Columnas a ocultar de la proyección de tabla." }

// ANTES (data_architecture):
{ "key": "visible_fields", "label": "Campos del Formulario (Restricción)", "type": "string", "description": "..." }

// DESPUÉS (data_architecture):
{ "key": "visible_fields", "label": "Campos del Formulario (Restricción)", "type": "multi-select", "options_source": "dna_fields", "description": "Field keys que se renderizan en este formulario. Vacío = todos los campos del schema." }
```

---

## Tarea 2 — ConfigProjector: Implementar `case 'multi-select'` real

**Archivo:** `src/components/agnostic/modules/AgnosticConfigProjector.tsx`

El `case 'multi-select'` actual es un alias de `case 'select'` que solo guarda el último valor
seleccionado como array de un elemento. Necesita ser reemplazado por un UI de chips + dropdown.

**Contrato de almacenamiento:** los valores se guardan como string CSV (`"name,email,phone"`),
que es el formato que consumen `AgnosticTable`, `AgnosticGroupedCard` y `AgnosticForm`.

### Implementación del nuevo case

Ubicar el bloque `case 'select': case 'multi-select':` en el switch de `renderField` y separarlo:

```tsx
case 'multi-select': {
  // Resolve options from source or static list
  let multiOptions = field.options || [];
  if (field.options_source && resolvers[field.options_source]) {
    multiOptions = resolvers[field.options_source]
      .map((opt: any) => (typeof opt === 'string' ? { label: opt, value: opt } : opt))
      .filter((opt: any) => opt.value !== '' && opt.value !== undefined);
  }

  // Value is stored as CSV string; parse to array for manipulation
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
```

El `case 'select'` queda solo (sin fall-through con `multi-select`). Limpiar el case select
para quitar el manejo de `multi-select` que tenía (la línea `field.type === 'multi-select' ? [v] : v`):

```tsx
case 'select': {
  let options = field.options || [];
  if (field.options_source && resolvers[field.options_source]) {
    options = resolvers[field.options_source]
      .map((opt: any) => (typeof opt === 'string' ? { label: opt, value: opt } : opt))
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
          <SelectValue placeholder="Seleccionar..." />
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
      {field.description && (
        <p className="text-[8px] text-muted-foreground/30 pl-1">{field.description}</p>
      )}
    </div>
  );
}
```

---

## Tarea 3 — RecursiveBlockComposer: Normalizar schema_id en el selector DNA

**Archivo:** `src/components/agnostic/designer/components/RecursiveBlockComposer.tsx`

**Problema:** El `<Select>` del DNA usa `value={block.schema_id || ''}`. Cuando `block.schema_id`
es un slug (ej: `espacio_variantes`) en lugar de UUID, ningún `SelectItem` coincide porque todos
usan `value={s.id}` (UUID). Radix UI muestra el string crudo.

**Fix:** Resolver el UUID canónico antes de pasarlo al Select. El resolver ya existe
(`schemas.find(...)`) — solo falta usarlo para el `value` del trigger.

Localizar el bloque del DNA selector (condición `['form', 'table', 'collection'].includes(block.type)`):

```tsx
// AÑADIR estas líneas ANTES del return del componente (junto a los otros useMemo/useEffect)
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

// MODIFICAR el Select del DNA selector:
// ANTES:
<Select
  value={block.schema_id || ''}
  onValueChange={(val) => updateBlock({ schema_id: val })}
>

// DESPUÉS:
<Select
  value={canonicalSchemaId || undefined}
  onValueChange={(val) => updateBlock({ schema_id: val })}
>
```

Al seleccionar, `onValueChange` devuelve `s.id` (UUID), normalizando el dato para escrituras futuras.
Para bloques existentes con slug, el display se corrige inmediatamente en el designer sin migración.

---

## Orden de Ejecución

1. **Tarea 1** — Modificar los tres JSON de settings (cambios declarativos, sin lógica)
2. **Tarea 2** — Reemplazar el case multi-select en ConfigProjector
3. **Tarea 3** — Añadir `canonicalSchemaId` y actualizar el Select en RecursiveBlockComposer

## Verificación

Después de los cambios:
- [ ] El campo `switches` en collection blocks muestra chips removibles con los field keys del DNA activo
- [ ] El campo `visible_fields` en form blocks muestra lo mismo
- [ ] El selector DNA en un bloque con `schema_id = 'espacio_variantes'` muestra el nombre del schema, no el slug
- [ ] El selector DNA en un bloque con `schema_id = UUID` muestra el `data.name`, no el UUID
- [ ] Al seleccionar en el DNA selector, el valor guardado es siempre UUID
- [ ] `npx tsc --noEmit` pasa sin errores
