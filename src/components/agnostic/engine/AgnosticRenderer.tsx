/**
 * 🏛️ ARTEFACTO: AgnosticRenderer.tsx
 * ────────────
 * CAPA: Projection (Universal Engine)
 * VERSIÓN: 8.1
 * COMMIT: P3-M3.2-STANDARDIZED-RELATIONSHIP
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Resolución y proyección de bloques atómicos y satélites.
 * - Orquestación del ciclo de vida de la renderización dinámica.
 * - Soporte para Inferencia Relacional y Segmentación (Pivot).
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Utilizar nomenclatura snake_case para claves de configuración de datos.
 * - MUST: Propagar el 'parent_id' y 'parent_key' para mantener la integridad relacional.
 * - NEVER: Contener lógica de persistencia o reglas de negocio.
 * 
 * 📜 ADR: [2026-05-11] STANDARDIZED_DATA_ARCHITECTURE
 * - DECISIÓN: Migrar de camelCase (parentKey) a snake_case (parent_key) en la arquitectura de bloques.
 * - MOTIVO: Alinear la nomenclatura de la UI con los estándares de bases de datos relacionales (SQL).
 * - IMPACTO: Mayor coherencia entre el diseñador de rutas y el motor de ejecución.
 */
'use client';

import React, { useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createAgnosticAPI } from '@agnostic/core';
import { registry } from '@/lib/agnostic/Registry';
import { cn } from '@/lib/utils';
import { useDNAStore, useMateriaStore, useActiveRecord } from '@/lib/agnostic/store';
import { useAppDispatch } from '@/context/AppContext';
import { useParams } from 'next/navigation';

export function AgnosticRenderer({
  block, 
  parentId: propParentId, 
  parentKey: propParentKey,
  context: propContext,
  intent: propIntent,
  record: propRecord,
  onSuccess
}: { 
  block: any, 
  parentId?: string, 
  parentKey?: string,
  context?: string,
  intent?: 'create' | 'edit' | 'list' | 'view',
  record?: any,
  onSuccess?: (record: any) => void
}) {
  const { data: materia } = useMateriaStore();
  const { schemas } = useDNAStore();
  const activeRecordFromStore = useActiveRecord();
  const { saveItem, deleteItem, openOverlay, closeOverlay } = useAppDispatch();
  const router = useRouter();

  const stateRef = useRef({ data: materia });
  stateRef.current = { data: materia };

  const agnosticApi = useMemo(() => createAgnosticAPI({
    router, saveItem, deleteItem, openOverlay, closeOverlay, stateRef: stateRef as any, block, toast, user: null
  }), [router, saveItem, deleteItem, openOverlay, closeOverlay, block]); // REMOVED materia dependency

  // ─── HOOKS: siempre al top-level, ANTES de cualquier return condicional ───────
  const config = block.config || {};
  const type = block.type;
  
  // 🪐 AXIOMATIC GRAVITY RESOLUTION
  const currentContext = block.context || config.context || block.data?.context || propContext;
  // 🏛️ ISOMORPHIC RESOLVER: Soporte para nomenclatura DEV (snake_case) y Legacy (camelCase)
  const schemaId = block.schema_id || config.schema_id || block.data?.schema_id;

  const schema = useMemo(() => {
    if (block.schema) return block.schema;
    if (!schemaId) return null;
    const schemaItem = schemas.find((s) => s.id === schemaId || s.data?.slug === schemaId || s.data?.name === schemaId);
    return schemaItem?.data;
  }, [schemaId, schemas, block.schema]);

  const activeRecord = propRecord || activeRecordFromStore;
  const intent = propIntent || block.intent || config.intent || block.data?.intent || block.behavior?.intent || 'list';

  const records = useMemo(() => {
    if (!currentContext || currentContext === 'system') return [];
    return materia[currentContext] || [];
  }, [currentContext, materia[currentContext]]);

  // ─── GUARDS: solo después de que todos los hooks hayan corrido ────────────────
  if (!type) return null;
  const BlockComponent = registry.get(type);

  if (!BlockComponent) {
    console.warn(`[AgnosticRenderer] Unknown block type: ${type}`);
    return null;
  }

  // ─── LEAF BLOCK: proyecta contenido ───────────────────────────────────────────
  try {
    // Merge order: old namespaces (backward compat) → block.config (canonical, wins)
    const effectiveConfig = {
      ...(block.behavior || {}),
      ...(block.visual || {}),
      ...(block.data_architecture || {}),
      ...(block.logic || {}),
      ...config,
      ...(block.config || {}),
    };

    const sizing = effectiveConfig.sizing || block.sizing;

    return (
      <div className={sizing === 'hug' ? 'w-auto' : 'w-full'}>
        <BlockComponent
          {...block}
          {...(block.data || {})}
          {...effectiveConfig}
          schema={schema}
          schema_id={schemaId}
          context={currentContext}
          activeRecord={activeRecord}
          records={records}
          intent={intent}
          parentId={propParentId || effectiveConfig.parent_id || config.parent_id || activeRecord?.id}
          parentKey={propParentKey || effectiveConfig.parent_key || config.parent_key}
          onSuccess={onSuccess}
          api={agnosticApi}
        />
      </div>
    );
  } catch (err) {
    console.error('[AgnosticRenderer] Projection Failure:', err);
    return null;
  }
}
