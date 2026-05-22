/**
 * 🎨 EL REGISTRO VISUAL: Agnostic Iconography
 * ────────────────────────────────────────
 * AXIOMATIC_CONTRACT:
 * - MUST: Proveer un mapeo inmutable de MODULE_TYPE -> ICON.
 * - MUST: Ser la única fuente de verdad para la identidad visual de los bloques.
 * - NEVER: Hardcodear iconos dentro de los renderers de bloque.
 * 
 * ADR: Se centraliza la iconografía para facilitar el 're-branding' visual 
 * del sistema completo desde un solo punto de entrada.
 */

import { 
  Edit3, 
  Table, 
  Library, 
  Layers, 
  Pocket, 
  Zap, 
  Layout,
  LucideIcon 
} from 'lucide-react';

export const AGNOSTIC_ICONS: Record<string, LucideIcon> = {
  'form': Edit3,
  'table': Table,
  'collection': Library,
  'sheet': Layers,
  'belt': Pocket,
  'custom': Layout,
  'action': Zap,
  'default': Layout
};

/**
 * 🧬 HELPER: Get Module Icon
 * Resuelve el icono canónico para un tipo de bloque, con fallback seguro.
 */
export const getModuleIcon = (type: string): LucideIcon => {
  return AGNOSTIC_ICONS[type] || AGNOSTIC_ICONS['default'];
};

export const SYSTEM_NS = {
  ROUTES:     'page_routes',
  SCHEMAS:    'schema_definitions',
  CONFIG:     'system_config',
  TOKENS:     'design_tokens',
  USERS:      'users',
  USER_LISTS: 'user_lists',
} as const;

export const FIELD_META_SCHEMA = {
  name: 'field_config',
  fields: [
    {
      key: 'width',
      label: 'Ancho Visual',
      type: 'select',
      width: 'half',
      options: [
        { label: 'Completo (100%)', value: 'full' },
        { label: 'Mitad (50%)', value: 'half' },
        { label: 'Un Tercio (33%)', value: 'third' }
      ]
    },
    {
      key: 'placeholder',
      label: 'Placeholder / Indicación',
      type: 'text',
      width: 'half',
      placeholder: 'Ej. Escriba sin guiones...'
    },
    {
      key: 'isPrimary',
      label: '¿Es Identificador Primario? (Muestra en listas/búsquedas)',
      type: 'boolean',
      width: 'full'
    },
    {
      key: 'readOnly',
      label: '¿Es de Solo Lectura? (Calculado/Fijo)',
      type: 'boolean',
      width: 'full'
    }
  ]
};

