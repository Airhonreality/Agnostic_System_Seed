/**
 * agno — Agnostic CLI REPL
 * Navegación por capas con belt de contexto. Sin MCP protocol overhead.
 *
 * Uso:
 *   npx tsx scripts/agno.ts <cmd> [args]      ← one-shot
 *   echo -e "ls\nschema cotizaciones" | npx tsx scripts/agno.ts  ← pipe
 *   npx tsx scripts/agno.ts                   ← REPL interactivo
 *
 * Capas:
 *   ESTRUCTURA  → ls, schema <name>, route <path>, scripts
 *   DATOS       → records <schema> [limit=N] [key=val]
 *   UI          → ui <route>
 *   CAMBIO      → set ..., commit, drop
 */

import { getStrategy } from '../src/server/getStrategy';
import readline from 'readline';
import crypto from 'crypto';
import fs from 'fs/promises';

const adapter = getStrategy();

// ── ESTADO ───────────────────────────────────────────────────────────────────

type Layer = 'ESTRUCTURA' | 'DATOS' | 'UI' | 'SCRIPTS' | 'CAMBIO';

const pending: Array<{ desc: string; run: () => Promise<void> }> = [];

function belt(layer: Layer, focus?: string) {
  return focus ? `[${layer} · ${focus}]` : `[${layer}]`;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

async function getSchemas() {
  return (await adapter.read('schema_definitions')) as any[];
}
async function getRoutes() {
  return (await adapter.read('page_routes')) as any[];
}
async function findSchema(name: string) {
  const all = await getSchemas();
  return all.find((s: any) => s.data?.name === name || s.id === name);
}
async function findRoute(path: string) {
  const all = await getRoutes();
  return all.find((r: any) => r.data?.path === path || r.id === path);
}

// ── COMANDOS ─────────────────────────────────────────────────────────────────

async function cmdLs() {
  const [schemas, routes, scripts] = await Promise.all([
    getSchemas(),
    getRoutes(),
    adapter.read('scripts') as Promise<any[]>
  ]);

  const sf = schemas.map((s: any) => `${s.data.name}(${s.data.fields?.length ?? 0}f)`).join(' ');
  const rt = routes.map((r: any) => `${r.data.path}(${r.data.blocks?.length ?? 0}b)`).join(' ');
  const sc = (scripts as any[]).length
    ? (scripts as any[]).map((s: any) => s.data.name).join(' ')
    : 'none';

  console.log(`${belt('ESTRUCTURA')} schemas: ${sf}`);
  console.log(`${belt('ESTRUCTURA')} routes:  ${rt}`);
  console.log(`${belt('SCRIPTS')}   scripts: ${sc}`);
}

async function cmdSchema(name: string) {
  const s = await findSchema(name);
  if (!s) { console.log(`[ERROR] schema no encontrado: ${name}`); return; }

  const fields = (s.data.fields || []).map((f: any) => {
    const rel = f.config?.relation?.entity ? `→${f.config.relation.entity}` : (f.type === 'relation' ? '→?' : '');
    return `${f.key}(${f.type}${rel}${f.required ? '*' : ''})`;
  });

  console.log(`${belt('ESTRUCTURA', name)} ${fields.join('  ')}`);
}

async function cmdSchemaId(name: string) {
  const s = await findSchema(name);
  if (!s) { console.log(`[ERROR] schema no encontrado: ${name}`); return; }
  console.log(`${belt('ESTRUCTURA', name)} id: ${s.id}`);
}

async function cmdRoute(path: string) {
  const r = await findRoute(path);
  if (!r) { console.log(`[ERROR] ruta no encontrada: ${path}`); return; }

  const blocks = (r.data.blocks || []).map((b: any) =>
    `${b.type}${b.context ? `→${b.context}` : ''}`
  );
  console.log(`${belt('UI', path)} ${blocks.join('  ')}`);
}

async function cmdUi(path: string) {
  const r = await findRoute(path);
  if (!r) { console.log(`[ERROR] ruta no encontrada: ${path}`); return; }

  console.log(`${belt('UI', path)} blocks(${r.data.blocks?.length ?? 0}):`);
  for (const b of r.data.blocks || []) {
    const extras: string[] = [];
    if (b.intent) extras.push(`intent:${b.intent}`);
    if (b.segmentation_key) extras.push(`seg:${b.segmentation_key}`);
    if (b.hideSubmit) extras.push('hideSubmit');
    if (b.zap) extras.push(`zap:${b.zap}`);
    console.log(`  ${b.id.slice(0,8)}  ${b.type}→${b.context || '-'}  ${extras.join(' ')}`);
  }
}

async function cmdRecords(args: string[]) {
  const schema = args[0];
  if (!schema) { console.log('[ERROR] uso: records <schema> [limit=N] [key=val]'); return; }

  let limit = 5;
  const filters: Record<string, string> = {};
  for (const a of args.slice(1)) {
    if (a.startsWith('limit=')) limit = parseInt(a.slice(6));
    else if (a.includes('=')) { const [k, v] = a.split('='); filters[k] = v; }
  }

  const raw = (await adapter.read(schema)) as any[];
  const filtered = Object.keys(filters).length
    ? raw.filter((r: any) => Object.entries(filters).every(([k, v]) => String(r.data?.[k]) === v))
    : raw;

  const slice = filtered.slice(0, limit);
  console.log(`${belt('DATOS', schema)} total:${filtered.length} mostrando:${slice.length}`);
  for (const r of slice) {
    const preview = Object.entries(r.data || {}).slice(0, 4).map(([k, v]) => `${k}:${String(v).slice(0, 30)}`).join('  ');
    console.log(`  ${r.id.slice(0, 8)}  ${preview}`);
  }
}

async function cmdScript(name: string) {
  const scripts = (await adapter.read('scripts')) as any[];
  const s = scripts.find((x: any) => x.data.name === name);
  if (!s) { console.log(`[ERROR] script no encontrado: ${name}`); return; }
  console.log(`${belt('SCRIPTS', name)}`);
  console.log(s.data.code);
}

async function cmdScriptExport(args: string[]) {
  const name = args[0];
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
  if (!name || !filePath) { console.log('[ERROR] uso: script export <name> --file <ruta.js>'); return; }
  const scripts = (await adapter.read('scripts')) as any[];
  const s = scripts.find((x: any) => x.data?.name === name);
  if (!s) { console.log(`[ERROR] script no encontrado: ${name}`); return; }
  await fs.writeFile(filePath, s.data.code, 'utf-8');
  console.log(`${belt('SCRIPTS', name)} exportado → ${filePath} (${s.data.code.length} chars)`);
}

async function cmdScriptWrite(args: string[]) {
  const name = args[0];
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
  if (!name || !filePath) { console.log('[ERROR] uso: script write <name> --file <ruta.js>'); return; }
  const code = await fs.readFile(filePath, 'utf-8');
  const scripts = (await adapter.read('scripts')) as any[];
  const existing = scripts.find((x: any) => x.data?.name === name);
  const record = { id: existing?.id ?? crypto.randomUUID(), data: { name, code } };
  await adapter.write('scripts', record);
  console.log(`${belt('SCRIPTS', name)} guardado (${code.length} chars desde ${filePath})`);
}

// ── MUTACIONES (con cola de revisión) ────────────────────────────────────────

async function cmdSet(args: string[]) {
  // set schema.<field>.entity <value>
  // set schema.<field>.required true|false
  const [path, value] = args;
  if (!path || !value) { console.log('[ERROR] uso: set <schema>.<field>.<prop> <valor>'); return; }

  const parts = path.split('.');
  if (parts.length !== 3) { console.log('[ERROR] formato: schema.field.prop'); return; }
  const [schemaName, fieldKey, prop] = parts;

  const desc = `schema:${schemaName} field:${fieldKey} ${prop} → ${value}`;
  pending.push({
    desc,
    run: async () => {
      const s = await findSchema(schemaName);
      if (!s) throw new Error(`schema ${schemaName} no encontrado`);
      const field = s.data.fields?.find((f: any) => f.key === fieldKey);
      if (!field) throw new Error(`field ${fieldKey} no encontrado`);

      if (prop === 'entity') field.config = { relation: { entity: value, parentKey: 'id' } };
      else if (prop === 'required') field.required = value === 'true';
      else if (prop === 'label') field.label = value;
      else if (prop === 'type') field.type = value;
      else throw new Error(`prop desconocida: ${prop}`);

      s.updated_at = new Date().toISOString();
      await adapter.write('schema_definitions', s);
    }
  });

  console.log(`${belt('CAMBIO')} pendiente(${pending.length}): ${desc}`);
}

async function cmdCommit(force = false) {
  if (!pending.length) { console.log(`${belt('CAMBIO')} sin cambios pendientes`); return; }

  console.log(`${belt('CAMBIO')} ${pending.length} cambio(s) pendiente(s):`);
  pending.forEach((p, i) => console.log(`  ${i + 1}. ${p.desc}`));

  if (!force) {
    console.log('  → ejecutar? escribe: commit --force');
    return;
  }

  for (const p of pending) {
    try {
      await p.run();
      console.log(`  ✓ ${p.desc}`);
    } catch (e: any) {
      console.log(`  ✗ ${p.desc}  error: ${e.message}`);
    }
  }
  pending.length = 0;
}

function cmdDrop() {
  const n = pending.length;
  pending.length = 0;
  console.log(`${belt('CAMBIO')} descartados ${n} cambio(s)`);
}

async function cmdStatus() {
  console.log(`${belt('ESTRUCTURA')} pending:${pending.length}`);
  if (pending.length) pending.forEach((p, i) => console.log(`  ${i + 1}. ${p.desc}`));
}

// ── DISPATCHER ───────────────────────────────────────────────────────────────

async function dispatch(line: string) {
  const [cmd, ...args] = line.trim().split(/\s+/);
  if (!cmd) return;

  switch (cmd) {
    case 'ls':       return cmdLs();
    case 'schema':
      if (args[0] === 'id') return cmdSchemaId(args[1]);
      return cmdSchema(args[0]);
    case 'route':    return cmdRoute(args[0]);
    case 'ui':       return cmdUi(args[0]);
    case 'records':  return cmdRecords(args);
    case 'script':
      if (args[0] === 'write')  return cmdScriptWrite(args.slice(1));
      if (args[0] === 'export') return cmdScriptExport(args.slice(1));
      return cmdScript(args[0]);
    case 'set':      return cmdSet(args);
    case 'commit':   return cmdCommit(args[0] === '--force');
    case 'drop':     return cmdDrop();
    case 'status':   return cmdStatus();
    default:
      console.log(`[ERROR] comando desconocido: ${cmd}  (ls|schema|route|ui|records|script|set|commit|drop|status)`);
  }
}

// ── ENTRYPOINT ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length > 0) {
  // one-shot: agno <cmd> [args]
  dispatch(args.join(' ')).catch(e => console.error('[FATAL]', e.message));
} else {
  // stdin pipe o REPL
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const isTTY = process.stdin.isTTY;

  if (isTTY) process.stdout.write('agno> ');

  let queue = Promise.resolve();
  rl.on('line', (line) => {
    queue = queue.then(async () => {
      if (line.trim()) await dispatch(line).catch(e => console.error('[FATAL]', e.message));
      if (isTTY) process.stdout.write('agno> ');
    });
  });

  rl.on('close', () => {
    if (pending.length) console.log(`\n${belt('CAMBIO')} ${pending.length} cambio(s) NO ejecutados. Usa commit --force.`);
  });
}
