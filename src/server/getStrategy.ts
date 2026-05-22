/**
 * 🏛️ ARTEFACTO: getStrategy.ts
 * ────────────
 * CAPA: Server (Adapter Resolution Gateway)
 * VERSIÓN: 5.0
 * COMMIT: P3-M1.4-RESOLVER-PRUNING
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Load the master passport dynamically and instantiate the correct data persistence adapter.
 * - Resolve between LocalStrategy and SupabaseStrategy based on active passport configuration.
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Instantiate strategies synchronously on-demand.
 * - NEVER: Rely on StrategyRegistry dynamic discovery or cached instances with TTL.
 * - ALWAYS: Keep the mapping direct, concrete, and strictly mapped to standard types.
 * 
 * 📜 ADR: [2026-05-16] ADAPTER_RESOLUTION_SIMPLIFICATION
 * - DECISIÓN: Replace the complex dynamic StrategyRegistry mechanism and in-memory TTL caching with a 20-line direct conditional factory.
 * - MOTIVO: Adherence to Suh's Independence Axiom, stripping out redundant dynamic discovery layers that bloated the core logic.
 * - IMPACTO: Elimination of 100+ lines of registry configuration and a completely predictable strategy factory.
 * 
 * 🔗 RELATIONSHIPS:
 * - UPSTREAM: [LocalStrategy.ts, SupabaseStrategy.ts]
 * - DOWNSTREAM: [vault/route.ts, vault.ts]
 */

if (typeof window !== 'undefined') {
  throw new Error('getStrategy can only be used on the server.');
}

if (process.env.NEXT_RUNTIME) {
  // Enforce server-only semantics in Next runtimes without breaking CLI usage.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('server-only');
}
import { AgnosticBridge } from '@agnostic/core';
import { LocalStrategy } from './strategies/LocalStrategy';
import { SupabaseStrategy } from './strategies/SupabaseStrategy';
import { GitHubStrategy } from './strategies/GitHubStrategy';
import { readPassport, readPassportForTenant, getSiloPath } from './activeProject';

/**
 * Resolves and instantiates the correct persistence strategy.
 * Direct and synchronous factory mapping avoiding discovery overhead.
 */
export function getStrategy(tenantKey?: string): AgnosticBridge {
  const passport = tenantKey 
    ? readPassportForTenant(tenantKey) 
    : readPassport();

  if (passport.storage_strategy === 'SupabaseStrategy') {
    return new SupabaseStrategy(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  if (passport.storage_strategy === 'GitHubStrategy') {
    const [owner, repo] = (passport.github_repo ?? passport.project_identity).split('/');
    
    // Resolve optional custom token from TENANTS_MAP for isolated tenant rates
    let customToken: string | undefined = undefined;
    const tenantsMapRaw = process.env.TENANTS_MAP;
    if (tenantsMapRaw && tenantKey) {
      try {
        const map = JSON.parse(tenantsMapRaw) as Record<string, string | { repo: string; token?: string }>;
        const entry = map[tenantKey];
        if (entry && typeof entry !== 'string') {
          customToken = entry.token;
        }
      } catch {}
    }

    return new GitHubStrategy(owner, repo, customToken, passport.github_branch);
  }

  // Warning when Vercel runs local filesystem persistence (Vector 2 Mitigation)
  if (process.env.VERCEL && (passport.storage_strategy === 'LocalStrategy' || passport.storage_strategy === 'local')) {
    console.warn('[getStrategy] WARNING: LocalStrategy running on Vercel ephemeral filesystem. Set GITHUB_REPO.');
  }

  // 'LocalStrategy' or legacy 'local' - both default to LocalStrategy
  return new LocalStrategy(getSiloPath(passport.project_identity));
}
