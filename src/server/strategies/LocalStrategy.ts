/**
 * 🏛️ ARTEFACTO: LocalStrategy.ts
 * ────────────
 * CAPA: Server (Local File Persistence Strategy)
 * VERSIÓN: 5.0
 * COMMIT: P3-M1.2-LOCAL-STRATEGY-AXIOMATIC
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Implement standard data persistence utilizing local JSON files.
 * - Restrict operations strictly to read, write, and remove.
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Implement standard CRUD operation definitions cleanly.
 * - NEVER: Contain DDL schema evolution logic or registry auto-registration.
 * - ALWAYS: Keep operations atomic when writing to the filesystem.
 * 
 * 📜 ADR: [2026-05-16] LOCAL_STRATEGY_PRUNING
 * - DECISIÓN: Clean up StrategyRegistry references, dynamic schema building, and unused verbs (patch, evolve, wipe, inspect).
 * - MOTIVO: Adherence to Suh's Axiom of Independence, separating physical schema definition from storage logic.
 * - IMPACTO: Reduction of technical debt, simpler data flow, and fully predictable operations.
 * 
 * 🔗 RELATIONSHIPS:
 * - UPSTREAM: [storage.ts]
 * - DOWNSTREAM: [getStrategy.ts]
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import type { 
  DataItem, 
  AgnosticBridge, 
  AgnosticCapabilities, 
  AgnosticQuery 
} from '@agnostic/core';

export class LocalStrategy implements AgnosticBridge {
  private readonly dbDir: string;

  /**
   * Describes the local file system storage capabilities.
   */
  readonly capabilities: AgnosticCapabilities = {
    storageType: 'FILE',
    isRelational: false
  };

  constructor(siloPath: string) {
    this.dbDir = path.isAbsolute(siloPath) 
      ? path.join(siloPath, 'db') 
      : path.join(process.cwd(), siloPath, 'db');
  }

  /**
   * Resolves the JSON file path for a given namespace.
   */
  private getFilePath(namespace: string): string {
    return path.join(this.dbDir, `${namespace}.json`);
  }

  /**
   * Standardizes the parsed JSON data format into a flat array of DataItem.
   */
  private sanitizeData(namespace: string, data: any): DataItem[] {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (data[namespace] && Array.isArray(data[namespace])) {
        return data[namespace];
      }
    }
    return Array.isArray(data) ? data : [];
  }

  // ─── CRUD OPERATIONS ───────────────────────────────────────────────────────

  /**
   * Reads all items in a namespace and applies optional filters.
   */
  async read(namespace: string, query?: AgnosticQuery): Promise<DataItem[]> {
    try {
      await fs.mkdir(this.dbDir, { recursive: true });

      // Handle system config stored at the neutral storage root
      if (namespace === 'system_config') {
        const rootPath = path.join(process.cwd(), 'storage', 'system_config.json');
        try {
          const raw = await fs.readFile(rootPath, 'utf-8');
          return this.sanitizeData(namespace, JSON.parse(raw));
        } catch { 
          return []; 
        }
      }

      const filePath = this.getFilePath(namespace);
      try {
        const raw = (await fs.readFile(filePath, 'utf-8')).replace(/^﻿/, '');
        const items = this.sanitizeData(namespace, JSON.parse(raw));
        
        if (query?.where) {
          return items.filter(item => {
            return Object.entries(query.where!).every(([k, v]) => {
              return (k === 'id' && item.id === v) || item.data?.[k] === v || item[k] === v;
            });
          });
        }

        return items;
      } catch { 
        return []; 
      }
    } catch (err) {
      return [];
    }
  }

  /**
   * Writes a record atomically to the filesystem. Merges existing data if already present.
   */
  async write(namespace: string, record: Partial<DataItem> & { data: Record<string, unknown> }): Promise<DataItem> {
    const existing = await this.read(namespace);
    const id = record.id || globalThis.crypto.randomUUID();
    const saved: DataItem = { 
      id, 
      context: namespace, 
      data: record.data, 
      updated_at: new Date().toISOString() 
    };
    
    const map = new Map(existing.map(i => [i.id, i]));
    map.set(id, saved);
    
    let filePath = this.getFilePath(namespace);
    if (namespace === 'system_config') {
      filePath = path.join(process.cwd(), 'storage', 'system_config.json');
    }
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Atomic Write Operation: write to a temporary file, then rename it
    const content = JSON.stringify(Array.from(map.values()), null, 2);
    const tmp = filePath + '.tmp';
    await fs.writeFile(tmp, content, 'utf-8');
    try {
      await fs.rename(tmp, filePath);
    } catch {
      // Windows: el file watcher puede tener el destino bloqueado.
      // Fallback: overwrite directo (no atómico pero seguro en entorno local).
      await fs.writeFile(filePath, content, 'utf-8');
      try { await fs.unlink(tmp); } catch { /* limpieza best-effort */ }
    }
    
    return saved;
  }

  /**
   * Removes a record by ID from a specific namespace.
   */
  async remove(namespace: string, id: string): Promise<void> {
    const existing = await this.read(namespace);
    const filtered = existing.filter(i => i.id !== id);
    
    let filePath = this.getFilePath(namespace);
    if (namespace === 'system_config') {
      filePath = path.join(process.cwd(), 'storage', 'system_config.json');
    }
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  }
}
