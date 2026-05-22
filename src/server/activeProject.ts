if (typeof window !== 'undefined') {
  throw new Error('activeProject can only be used on the server.');
}

if (process.env.NEXT_RUNTIME) {
  // Enforce server-only semantics in Next runtimes without breaking CLI usage.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('server-only');
}
import fs from 'fs';
import path from 'path';
import type { SystemPassport } from '@agnostic/core';

const STORAGE_ROOT = path.join(process.cwd(), 'storage');

/**
 * Reads and returns the active master passport from system_config.json.
 * Throws an explicit error if the file or the identity is missing.
 */
export function readPassport(): SystemPassport {
  // Prioridad env vars (Vercel serverless — filesystem efímero)
  if (process.env.GITHUB_REPO) {
    return {
      project_identity: process.env.GITHUB_REPO,
      storage_strategy: 'GitHubStrategy',
      github_repo: process.env.GITHUB_REPO,
      github_branch: process.env.GITHUB_BRANCH ?? 'main',
      dna_strategy: 'local',
    };
  }

  const configPath = path.join(STORAGE_ROOT, 'system_config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('[activeProject] system_config.json not found.');
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const item = Array.isArray(raw) ? raw.find((i: any) => i.id === 'master_passport') : null;
  const passport = item?.data ?? raw;
  if (!passport.project_identity) {
    throw new Error('[activeProject] master_passport missing project_identity.');
  }
  return passport as SystemPassport;
}

/**
 * Dynamically resolves the master passport for a given tenant key utilizing TENANTS_MAP.
 */
export function readPassportForTenant(tenantKey: string): SystemPassport {
  const tenantsMapRaw = process.env.TENANTS_MAP;
  if (tenantsMapRaw && tenantKey) {
    try {
      const map = JSON.parse(tenantsMapRaw) as Record<string, string | { repo: string; token?: string }>;
      const entry = map[tenantKey];
      if (entry) {
        const repo = typeof entry === 'string' ? entry : entry.repo;
        return {
          project_identity: repo,
          storage_strategy: 'GitHubStrategy',
          github_repo: repo,
          github_branch: process.env.GITHUB_BRANCH ?? 'main',
          dna_strategy: 'local',
        };
      }
    } catch (e) {
      throw new Error(`[readPassportForTenant] TENANTS_MAP is not valid JSON: ${e}`);
    }
  }
  return readPassport();
}

/**
 * Returns the active tenant/project identity, or 'default' as a safe fallback
 * for file-serving routes that should return empty/204 when no tenant is loaded.
 */
export function getActiveProjectIdentity(): string {
  try {
    return readPassport().project_identity;
  } catch {
    return 'default';
  }
}

/**
 * Resolves the physical absolute folder path for the active project/silo,
 * or a specific override project identity if supplied.
 */
export function getSiloPath(projectIdentity?: string): string {
  return path.join(STORAGE_ROOT, projectIdentity ?? getActiveProjectIdentity());
}

/**
 * Returns the root storage folder path.
 */
export function getStorageRoot(): string {
  return STORAGE_ROOT;
}
