/**
 * 🏛️ ARTEFACTO: sovereignty.ts
 * ────────────
 * CAPA: Types (Shared Contracts)
 * VERSIÓN: 2.0
 * COMMIT: P3-M1.1-TS-SOVEREIGNTY-CONTRACT
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Definición de tipos canónicos para el Sistema de Soberanía.
 * - Contratos de configuración para Estrategias de Datos y ADN.
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Reflejar exactamente las capacidades del motor de orquestación.
 * - NEVER: Usar tipos genéricos (any) para la configuración maestra del sistema.
 */

export type { SchemaField, SchemaFieldConfig } from '@agnostic/core';

export type StrategyType = 'LocalStrategy' | 'GitHubStrategy' | 'SupabaseStrategy';

export interface UITokens {
  primary?: string;       // HSL: "222 47% 11%"
  radius?: string;        // "0.5rem"
  font_sans?: string;     // "Inter, sans-serif"
}

export interface LayoutDefaults {
  container_width?: 'full' | 'container' | 'narrow';
  density?: 'compact' | 'normal' | 'spacious';
}

export interface MasterPassport {
  // Identity (existing)
  project_identity: string;
  storage_strategy: StrategyType;
  dna_strategy: StrategyType;
  
  // Cloud (existing, optional)
  github_owner?: string;
  github_repo?: string;
  sovereign_mode?: 'PURE' | 'HYBRID';
  
  // Design system (new)
  ui_tokens?: UITokens;
  layout_defaults?: LayoutDefaults;
  
  // Designer session persistence (new)
  designer_state?: {
    last_route_id?: string;
    last_schema_id?: string;
  };
}

export interface ScriptRecord {
  id: string;          // UUID
  context: 'scripts';
  data: {
    name: string;                          // slug único: "notify-warehouse"
    description?: string;
    trigger: 'onSave' | 'onDelete' | 'onOpen' | 'onLoad';
    schema_context?: string;               // opcional: limita a un schema
    code: string;                          // JS puro: function run(record, api) {...}
  };
}



