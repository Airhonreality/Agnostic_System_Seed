/**
 * Block Config Migration
 * Flattens all block namespaces (visual, behavior, logic, data_architecture)
 * into a single block.config object. Preserves backward compat by keeping
 * id, type, context, schema_id, blocks[] at top level.
 *
 * Run: npx ts-node --project tsconfig.json scripts/migrate-blocks.ts
 */

import fs from 'fs';
import path from 'path';

const STORAGE_ROOT = path.join(__dirname, '..', 'storage');

// Top-level fields that stay at the block root (structural, not parametric)
const STRUCTURAL_KEYS = new Set(['id', 'type', 'context', 'schema_id', 'blocks', 'config']);

function migrateBlock(block: any): any {
  const { id, type, context, schema_id, blocks, config: existingConfig, ...rest } = block;

  // Pull out old namespace objects
  const { visual, behavior, logic, data_architecture, title, ...flatRest } = rest;

  // Merge order (later entries win):
  // 1. flatRest — top-level parametric fields (intent, parent_key, singular, etc.)
  // 2. behavior — isCollapsible, defaultExpanded, intent
  // 3. visual   — label, variant, theme, icon, title, etc.
  // 4. data_architecture — parent_key, segmentation_key, etc.
  // 5. logic    — zap, save_forms_first
  // 6. existingConfig — already-migrated config wins over all
  const newConfig: Record<string, any> = {
    ...flatRest,
    ...(behavior || {}),
    ...(visual || {}),
    ...(data_architecture || {}),
    ...(logic || {}),
    ...(existingConfig || {}),
  };

  // Promote block.title → config.label only if label not already set from visual/config
  if (title && !newConfig.label) {
    newConfig.label = title;
  }

  const migrated: Record<string, any> = { id, type };
  if (context !== undefined) migrated.context = context;
  if (schema_id !== undefined) migrated.schema_id = schema_id;
  migrated.config = newConfig;
  if (blocks?.length) migrated.blocks = blocks.map(migrateBlock);

  return migrated;
}

function migrateRouteFile(filePath: string): void {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '');
  const routes: any[] = JSON.parse(raw);

  const migrated = routes.map((route: any) => {
    if (!route.data?.blocks) return route;
    return {
      ...route,
      data: {
        ...route.data,
        blocks: route.data.blocks.map(migrateBlock),
      },
    };
  });

  fs.writeFileSync(filePath, JSON.stringify(migrated, null, 2), 'utf-8');
  console.log(`✓ migrated: ${filePath}`);
}

function run(): void {
  if (!fs.existsSync(STORAGE_ROOT)) {
    console.error('storage/ directory not found at:', STORAGE_ROOT);
    process.exit(1);
  }

  const tenants = fs.readdirSync(STORAGE_ROOT).filter(d =>
    fs.statSync(path.join(STORAGE_ROOT, d)).isDirectory()
  );

  for (const tenant of tenants) {
    const dbDir = path.join(STORAGE_ROOT, tenant, 'db');
    if (!fs.existsSync(dbDir)) continue;

    const routeFile = path.join(dbDir, 'page_routes.json');
    if (fs.existsSync(routeFile)) migrateRouteFile(routeFile);
  }

  console.log('\nMigration complete. All blocks now use block.config as single namespace.');
}

run();
