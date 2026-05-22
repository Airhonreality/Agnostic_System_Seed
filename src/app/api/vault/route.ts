/**
 * 🏛️ ARTEFACTO: route.ts (Vault API Gateway)
 * ────────────
 * CAPA: Server (Vault Controller Endpoint)
 * VERSIÓN: 10.0
 * COMMIT: P3-M2.1-VAULT-GATEWAY-AXIOMATIC
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Expose exactly one HTTP gateway with strict REST CRUD verbs (GET/POST).
 * - Standardize all payload dispatch operations on the 3 fundamental operations (read, write, remove).
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Implement standard CRUD actions only (read, write, remove).
 * - NEVER: Rely on dynamic DNA Compiler middleware, register/introspect capabilities, or evolve/wipe RPCs.
 * - ALWAYS: Provide backward compatible fallbacks for old UI calls to ensure graceful transitions.
 * 
 * 📜 ADR: [2026-05-16] VAULT_GATEWAY_REDUNDANCY_REMOVAL
 * - DECISIÓN: Clean up the 9 complex Zod schema actions, dynamic purification compilers, and registry imports, leaving only clean GET/POST handlers.
 * - MOTIVO: Adherence to Suh's Axiom of Independence, removing dynamic middleware couplings and complex verb hierarchies.
 * - IMPACTO: 100+ lines of server orchestration bloat deleted, simplified code, and robust fallbacks.
 * 
 * 🔗 RELATIONSHIPS:
 * - UPSTREAM: [getStrategy.ts]
 * - DOWNSTREAM: [AppContext.tsx]
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStrategy } from '@/server/getStrategy';
import { SYSTEM_NS } from '@/lib/agnostic/constants';

// ─── ACTION SCHEMAS ─────────────────────────────────────────────────────────

const writeSchema = z.object({
  action: z.literal('WRITE'),
  namespace: z.string().min(1),
  record: z.object({
    id: z.string().optional(),
    data: z.record(z.string(), z.unknown())
  })
});

const removeSchema = z.object({
  action: z.literal('REMOVE'),
  namespace: z.string().min(1),
  id: z.string()
});

const dispatchSchema = z.discriminatedUnion('action', [
  writeSchema,
  removeSchema
]);

// ─── HTTP CONTROLLER HANDLERS ───────────────────────────────────────────────

/**
 * Handles read operations. Supports single context and 'all' context store hydration.
 * GET /api/vault?namespace=xxx or GET /api/vault?context=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const namespace = url.searchParams.get('namespace') || url.searchParams.get('context') || '';

    if (!namespace) {
      return NextResponse.json({ error: 'namespace param required' }, { status: 400 });
    }

    const tenantKey = req.headers.get('x-tenant') ?? undefined;
    const strategy: any = getStrategy(tenantKey);

    // Supports context store hydration in a single atomic request
    if (namespace === 'all') {
      const fullData: Record<string, any[]> = {};
      const coreContexts = [SYSTEM_NS.ROUTES, SYSTEM_NS.SCHEMAS, SYSTEM_NS.CONFIG, SYSTEM_NS.USERS, SYSTEM_NS.USER_LISTS];
      const activeContexts: string[] = [...coreContexts];

      try {
        const schemas = await strategy.read(SYSTEM_NS.SCHEMAS);
        if (Array.isArray(schemas)) {
          for (const s of schemas) {
            const contextName = s.data?.slug || s.slug || s.data?.name || s.name;
            if (contextName && typeof contextName === 'string' && !activeContexts.includes(contextName)) {
              activeContexts.push(contextName);
            }
          }
        }
      } catch (err) {
        console.warn('[VaultAPI GET] Agnostic schema-driven discovery error:', err);
      }

      for (const core of activeContexts) {
        fullData[core] = await strategy.read(core);
      }
      return NextResponse.json({ success: true, data: fullData });
    }

    const records = await strategy.read(namespace);
    return NextResponse.json({ 
      success: true, 
      namespace, 
      records
    });
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Read failed' 
    }, { status: 500 });
  }
}

/**
 * Handles write and remove operations.
 * POST /api/vault
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantKey = req.headers.get('x-tenant') ?? undefined;
    const strategy: any = getStrategy(tenantKey);

    // Normalize: support both new (namespace+record) and legacy (context+payload) shapes
    const action = body.action as string;
    const namespace: string = body.namespace || body.context || '';

    if (!namespace) {
      return NextResponse.json({ success: false, error: 'namespace required' }, { status: 400 });
    }

    if (action === 'WRITE') {
      const raw = body.record;
      if (!raw) return NextResponse.json({ success: false, error: 'record required' }, { status: 400 });
      const recordPayload = { id: raw.id, data: raw.data };
      writeSchema.parse({ action: 'WRITE', namespace, record: { id: raw.id, data: recordPayload.data } });
      const savedRecord = await strategy.write(namespace, recordPayload);
      return NextResponse.json({ success: true, record: savedRecord });
    }

    if (action === 'REMOVE') {
      const id: string = body.id;
      if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      removeSchema.parse({ action: 'REMOVE', namespace, id });
      // Guard: records marked is_permanent cannot be deleted
      const existing = await strategy.read(namespace);
      const target = Array.isArray(existing) ? existing.find((r: any) => r.id === id) : null;
      if (target?.data?.is_permanent === true) {
        return NextResponse.json(
          { success: false, error: 'Este registro es permanente y no puede eliminarse.' },
          { status: 403 }
        );
      }
      await strategy.remove(namespace, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[VaultAPI] POST Dispatch failed:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof z.ZodError
        ? `Validation failed: ${JSON.stringify(err.format())}`
        : err.message
    }, { status: 500 });
  }
}
