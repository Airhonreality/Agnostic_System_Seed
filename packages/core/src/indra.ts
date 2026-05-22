/**
 * 🛠️ CORE_INDRA: DEFINITIONS & TYPES (v6.0 — STRICT CONTRACT)
 * =============================================================
 * Single source of truth for every type in the Agnostic System.
 * All `any` has been eliminated at the public API boundary.
 */

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

export interface DataItem {
  id: string;
  context: string;
  data: Record<string, unknown>;
  /** Populated by cloud strategies (Supabase). Ignored by local strategies. */
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Industrial flexibility for convenience properties
}

// ─── DATA STRATEGY (REMOVED) ────────────────────────────────────────────────
// The legacy DataStrategy has been replaced by the Universal Management Protocol (AgnosticBridge).
// See storage.ts for the new canonical contract.

// ─── OVERLAY ─────────────────────────────────────────────────────────────────

export interface OverlayConfig {
  type: 'SHEET' | 'DIALOG' | 'CONFIRM';
  title: string;
  description?: string;
  component?: string;
  props?: Record<string, unknown>;
  onConfirm?: () => void;
}

// ─── UNIFIED QUERY — DISCRIMINATED UNION ────────────────────────────────────

export type UnifiedQuery =
  | { action: 'READ';     context: string;    filters?: Record<string, unknown> }
  | { action: 'UPSERT';   context: string;    payload: Record<string, unknown> }
  | { action: 'DELETE';   context: string;    payload: { id: string } }
  | { action: 'NAVIGATE'; context?: undefined; payload: { path: string } }
  | { action: 'INTENT';   context: string;    payload?: Record<string, unknown> };

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface AgnosticUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  [key: string]: unknown;
}

// ─── APP STATE ───────────────────────────────────────────────────────────────

export interface AppState {
  data: Record<string, DataItem[]>;
  user: any | null;
  ui: {
    overlay: OverlayConfig | null;
  };
  system: {
    isLoading: boolean;
    error: any;
    status: 'booting' | 'ready' | 'error';
    config: any;
    schemas: any[];
    routes: any[];
    currentPath: string;
    activeContext?: string;
    activeRecord?: { id: string; context: string } | null;
  };
}

export type Action =
  | { type: 'SET_DATA';         payload: { context: string; items: DataItem[] } }
  | { type: 'SET_SYSTEM_STATE'; payload: Partial<AppState['system']> }
  | { type: 'SET_AUTH';         payload: any };

// ─── UI BRIDGE ───────────────────────────────────────────────────────────────

export interface AgnosticUI {
  openSheet:  (title: string, moduleName: string, props?: Record<string, unknown>) => void;
  openDialog: (title: string, moduleName: string, props?: Record<string, unknown>) => void;
  confirm:    (title: string, description: string, onConfirm: () => void) => void;
  close:      () => void;
  renderAction: (type: 'CREATE' | 'SAVE' | 'DELETE' | 'CANCEL', props: { label?: string, onClick: () => void, className?: string }) => string;
  renderBelt?: (config: any) => any;
}

// ─── PUBLIC API CONTRACT ─────────────────────────────────────────────────────

export interface AgnosticAPI {
  /** Send an intent to the host. Always returns a resolved Promise (fire-and-hope pattern kept intentional). */
  dispatch:        (query: UnifiedQuery) => Promise<void>;
  /** Subscribe to context changes. Returns an unsubscribe function. */
  onUpdate:        (context: string, callback: (data: Record<string, DataItem[]>) => void) => () => void;
  getGlobalData:   (context: string) => DataItem[];
  getActiveRecord: () => DataItem | null;
  getContext:      () => string;
  getSchema:       (context?: string) => Record<string, unknown> | null;
  getBlockConfig:  () => Record<string, unknown>;
  getConfig:       (key: string) => any;
  renderIcon:      (name: string) => string;
  notify: {
    success: (msg: string) => void;
    error:   (msg: string) => void;
    loading: (msg: string) => void;
  };
  ui:        AgnosticUI;
  state:     AppState;
  user:      AgnosticUser | null;
  container?: HTMLElement;
}

// ─── SYSTEM CONFIG & PASSPORT ───────────────────────────────────────────────

export interface SystemPassport {
  project_identity: string;
  storage_strategy: 'LocalStrategy' | 'SupabaseStrategy' | 'GitHubStrategy';
  dna_strategy: 'local' | 'remote';
  home_slug?: string;
  app_name?: string;
  github_repo?: string;    // 'owner/repo' - NO es un secreto
  github_branch?: string;  // 'main' - NO es un secreto
}

// ─── DNA SCHEMAS ─────────────────────────────────────────────────────────────

export interface SchemaFieldConfig {
  relation?: {
    entity: string;
    parent_key: string;
    display_field?: string;
  };
  options?: Array<{ label: string; value: string }>;
  isPrimary?: boolean;
}

export interface SchemaField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'textarea' | 'relation' | 'object' | 'array_of_objects';
  width?: 'full' | 'half' | 'third';
  section?: string;
  required?: boolean;
  readOnly?: boolean;
  isPrimary?: boolean;
  placeholder?: string;
  config?: SchemaFieldConfig;
  fields?: SchemaField[];  // recursivo para type 'object' o 'array_of_objects'
}

