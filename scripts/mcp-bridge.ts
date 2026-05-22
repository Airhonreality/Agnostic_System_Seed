/**
 * 🏛️ ARTEFACTO: mcp-bridge.ts
 * ────────────
 * CAPA: CLI / MCP (Sovereign Stdio Oracle Bridge)
 * VERSIÓN: 6.0
 * COMMIT: P3-M4.2-MCP-BRIDGE-SEMANTIC-V2
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Act as the Agnostic MCP v2 Server between external agent CLIs (Claude Code) and the Agnostic System.
 * - Expose intent-driven semantic tools following the Independence Axiom.
 * 
 * 🛡️ AXIOMATIC_CONTRACT:
 * - MUST: Instantiate the synchronous getStrategy() to resolve local/cloud persistence.
 * - NEVER: Bypass the storage adapter with raw filesystem operations or hardcode tenant identities.
 * - ALWAYS: Execute stdio JSON-RPC loop adhering strictly to standard MCP specification.
 * - ALWAYS: Generate UUIDs server-side with crypto library instead of client-side.
 * - ALWAYS: Limit list_records output with pagination parameters (limit and offset) and project summary fields.
 */

import { getStrategy } from '../src/server/getStrategy';
import crypto from 'crypto';
import vm from 'vm';

// Configure environment variables in case they are needed for SupabaseStrategy
process.env.SUPABASE_URL = process.env.SUPABASE_URL || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const adapter = getStrategy();
const MCP_PROTOCOL_VERSION = '2024-11-05';
const MCP_SERVER_NAME = 'agnostic-system-seed';
const MCP_SERVER_VERSION = '2.0.0';

const tools = [
  // LAYER 0 — DISCOVERY
  {
    name: "list_namespaces",
    description: "Lists all standard and custom data namespaces available in the system.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "list_schemas",
    description: "Lists summaries of all registered schema definitions (returns id, name, fieldCount, updatedAt).",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "list_routes",
    description: "Lists summaries of all registered page routes (returns id, path, title, blockCount).",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "list_records",
    description: "Lists paginated records under a specific namespace/context, projecting only key preview fields.",
    inputSchema: {
      type: "object",
      properties: {
        context: { type: "string", description: "The namespace or schema name to list records from" },
        limit: { type: "integer", description: "Maximum number of records to return (default: 20)" },
        offset: { type: "integer", description: "Number of records to skip (default: 0)" }
      },
      required: ["context"]
    }
  },

  // LAYER 1 — INSPECTION
  {
    name: "get_schema",
    description: "Retrieves the full details of a specific schema (fields, sections, types) by ID or name.",
    inputSchema: {
      type: "object",
      properties: {
        id_or_name: { type: "string", description: "The UUID or the unique name of the schema" }
      },
      required: ["id_or_name"]
    }
  },
  {
    name: "get_route",
    description: "Retrieves the full layout and block details of a route by ID or path.",
    inputSchema: {
      type: "object",
      properties: {
        id_or_path: { type: "string", description: "The UUID or the web path of the route" }
      },
      required: ["id_or_path"]
    }
  },

  // LAYER 2 — SCHEMA CRUD
  {
    name: "create_schema",
    description: "Creates a new schema definition with semantic fields, auto-assigning UUIDs.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Unique snake_case system-wide name for the schema" },
        fields: {
          type: "array",
          description: "List of fields to configure in the schema",
          items: {
            type: "object",
            properties: {
              key: { type: "string", description: "Unique field key (snake_case)" },
              label: { type: "string", description: "Display label for the field" },
              type: { 
                type: "string", 
                enum: ["text", "number", "select", "relation", "boolean", "date"],
                description: "Semantic data type of the field"
              },
              required: { type: "boolean", description: "Whether this field is mandatory" },
              section: { type: "string", description: "UI section category grouping (default: 'General')" }
            },
            required: ["key", "label", "type"]
          }
        }
      },
      required: ["name", "fields"]
    }
  },
  {
    name: "add_field",
    description: "Appends a new semantic field to an existing schema definition.",
    inputSchema: {
      type: "object",
      properties: {
        schema_id_or_name: { type: "string", description: "The target schema's UUID or name" },
        field: {
          type: "object",
          properties: {
            key: { type: "string", description: "Unique field key (snake_case)" },
            label: { type: "string", description: "Display label for the field" },
            type: { 
              type: "string", 
              enum: ["text", "number", "select", "relation", "boolean", "date"] 
            },
            required: { type: "boolean", description: "Whether this field is mandatory" },
            section: { type: "string", description: "UI section grouping (default: 'General')" }
          },
          required: ["key", "label", "type"]
        }
      },
      required: ["schema_id_or_name", "field"]
    }
  },
  {
    name: "remove_field",
    description: "Deletes a specific field key from a schema definition.",
    inputSchema: {
      type: "object",
      properties: {
        schema_id_or_name: { type: "string", description: "The schema's UUID or name" },
        fieldKey: { type: "string", description: "The key of the field to remove" }
      },
      required: ["schema_id_or_name", "fieldKey"]
    }
  },
  {
    name: "delete_schema",
    description: "Deletes an entire schema definition by ID or name.",
    inputSchema: {
      type: "object",
      properties: {
        schema_id_or_name: { type: "string", description: "The schema's UUID or name to delete" }
      },
      required: ["schema_id_or_name"]
    }
  },

  // LAYER 3 — ROUTE/BLOCK CRUD
  {
    name: "create_route",
    description: "Registers a new web route path in the layout system.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Web path (e.g. /pedidos)" },
        title: { type: "string", description: "Human-readable page title" }
      },
      required: ["path", "title"]
    }
  },
  {
    name: "add_block",
    description: "Appends a new UI block (collection, form, table, etc.) to a route, optionally mapping to a schema name/ID.",
    inputSchema: {
      type: "object",
      properties: {
        route_id_or_path: { type: "string", description: "Route UUID or path" },
        type: { type: "string", description: "UI layout type (e.g. collection, form, table, details)" },
        schema_id_or_name: { type: "string", description: "Optional target schema's name or UUID to bind this block to" }
      },
      required: ["route_id_or_path", "type"]
    }
  },
  {
    name: "update_block",
    description: "Updates specific properties of an existing block in a route. Only the provided fields are merged; others are preserved.",
    inputSchema: {
      type: "object",
      properties: {
        route_id_or_path: { type: "string", description: "Route UUID or path" },
        blockId: { type: "string", description: "The UUID or id of the block to update" },
        patch: { type: "object", description: "Partial block properties to merge into the existing block. Common keys: hideSubmit (bool) — enables silent auto-save on the form; segmentation_rename (bool) — enables inline tab renaming on collections; segmentation_key (string) — field used to group tabs; segmentation_strategy ('tabs'|'none'); intent ('edit'|'view'|'create'); visible_fields (string[]). All keys are merged shallowly; unlisted keys are preserved." }
      },
      required: ["route_id_or_path", "blockId", "patch"]
    }
  },
  {
    name: "remove_block",
    description: "Removes a specific UI block from a route by its block ID.",
    inputSchema: {
      type: "object",
      properties: {
        route_id_or_path: { type: "string", description: "Route UUID or path" },
        blockId: { type: "string", description: "The UUID of the block to remove" }
      },
      required: ["route_id_or_path", "blockId"]
    }
  },
  {
    name: "delete_route",
    description: "Removes a route path and all its associated UI blocks.",
    inputSchema: {
      type: "object",
      properties: {
        route_id_or_path: { type: "string", description: "Route UUID or path to delete" }
      },
      required: ["route_id_or_path"]
    }
  },

  // LAYER 4 — RECORDS
  {
    name: "create_record",
    description: "Creates a new record under a schema/context namespace with semantic parameters.",
    inputSchema: {
      type: "object",
      properties: {
        context: { type: "string", description: "The target schema name or context namespace" },
        data: { type: "object", description: "The data payload conforming to the schema fields" }
      },
      required: ["context", "data"]
    }
  },
  {
    name: "update_record",
    description: "Partially updates an existing record by merging data fields.",
    inputSchema: {
      type: "object",
      properties: {
        context: { type: "string", description: "The schema name or context namespace" },
        id: { type: "string", description: "The record's unique ID" },
        data_patch: { type: "object", description: "Partial data fields to merge" }
      },
      required: ["context", "id", "data_patch"]
    }
  },
  {
    name: "delete_record",
    description: "Deletes a record from a specific schema/context namespace by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        context: { type: "string", description: "The schema name or context namespace" },
        id: { type: "string", description: "The record ID to delete" }
      },
      required: ["context", "id"]
    }
  },

  // LAYER 5 — SCRIPTS (ZAP LOGIC)
  {
    name: "list_scripts",
    description: "Lists all registered Zap scripts with their name and a preview of the first line of code.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_script",
    description: "Returns the full source code of a Zap script by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The exact snake_case name of the Zap script" }
      },
      required: ["name"]
    }
  },
  {
    name: "write_script",
    description: "Creates or fully replaces a Zap script by name. The script runs server-side in a Node.js vm sandbox. Available globals: api.notify.success/error(msg), api.query(context) → DataItem[].data[], api.saveItem(context, {id?, data}) → saved item, api.dispatchEvent(action, payload) — use 'print_pdf' action with {html} to trigger browser print.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Unique snake_case name for the script (matches the 'zap' field in the action block)" },
        code: { type: "string", description: "Full JavaScript source code for the script body" }
      },
      required: ["name", "code"]
    }
  },
  {
    name: "delete_script",
    description: "Permanently deletes a Zap script by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The exact snake_case name of the Zap script to delete" }
      },
      required: ["name"]
    }
  },
  {
    name: "test_script",
    description: "Dry-runs a Zap script in an isolated sandbox using real data from the adapter. api.saveItem is mocked (no persistence). Auto-infers context and payload.record from the action block that uses this zap, or accepts an override. Returns events[], the test record used, and any execution error.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The exact snake_case name of the Zap script to test" },
        record_id: { type: "string", description: "Optional: specific record ID to use as payload.record. If omitted, uses the first record found in the inferred context." },
        context_override: { type: "string", description: "Optional: override the inferred context namespace for the test record." }
      },
      required: ["name"]
    }
  }
];

// Helper to resolve schemas securely
async function resolveSchema(idOrName: string): Promise<any> {
  const raw = await adapter.read('schema_definitions');
  const schema = raw.find(r => r.id === idOrName || r.data?.name === idOrName);
  if (!schema) throw new Error(`Schema not found: ${idOrName}`);
  return schema;
}

// Helper to resolve routes securely
async function resolveRoute(idOrPath: string): Promise<any> {
  const raw = await adapter.read('page_routes');
  const route = raw.find(r => r.id === idOrPath || r.data?.path === idOrPath);
  if (!route) throw new Error(`Route not found: ${idOrPath}`);
  return route;
}

// Uniform JSON-RPC Response Wrappers
function respond(id: any, result: any) {
  return { 
    jsonrpc: "2.0", 
    id, 
    result: { 
      content: [{ 
        type: "text", 
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) 
      }] 
    } 
  };
}

function respondSuccess(id: any, result: any) {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

function respondError(id: any, message: string) {
  return { 
    jsonrpc: "2.0", 
    id, 
    error: { 
      code: -32603, 
      message 
    } 
  };
}

function writeMcpMessage(message: any) {
  const payload = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`);
}

async function handleRequest(request: any) {
  const { method, params, id } = request;

  if (method === 'initialize') {
    return respondSuccess(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION
      }
    });
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'ping') {
    return respondSuccess(id, {});
  }

  if (method === "tools/list") {
    return respondSuccess(id, { tools });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    
    try {
      switch (name) {
        // ─── LAYER 0: DISCOVERY ──────────────────────────────────────────────
        case "list_namespaces": {
          const schemas: any[] = await adapter.read('schema_definitions');
          const custom = schemas.map(r => r.data?.name).filter(Boolean);
          const namespaces = Array.from(new Set(['schema_definitions', 'page_routes', 'system_config', ...custom]));
          return respond(id, { namespaces });
        }

        case "list_schemas": {
          const raw: any[] = await adapter.read('schema_definitions');
          const schemas = raw.map(r => ({
            id: r.id,
            name: r.data?.name || '',
            fieldCount: r.data?.fields?.length ?? 0,
            updatedAt: r.updated_at
          }));
          return respond(id, { schemas });
        }

        case "list_routes": {
          const raw: any[] = await adapter.read('page_routes');
          const routes = raw.map(r => ({
            id: r.id,
            path: r.data?.path || '',
            title: r.data?.title || '',
            blockCount: r.data?.blocks?.length ?? 0
          }));
          return respond(id, { routes });
        }

        case "list_records": {
          const { context, limit, offset } = args;
          const lim = limit ?? 20;
          const off = offset ?? 0;
          
          const raw: any[] = await adapter.read(context);
          const slice = raw.slice(off, off + lim);
          
          const records = slice.map(r => {
            const data = r.data || {};
            const entries = Object.entries(data).filter(([k]) => k !== 'id' && k !== '_slug');
            const preview = Object.fromEntries(entries.slice(0, 3));
            return {
              id: r.id,
              _slug: data._slug,
              ...preview
            };
          });

          return respond(id, {
            records,
            total: raw.length,
            offset: off
          });
        }

        // ─── LAYER 1: INSPECTION ─────────────────────────────────────────────
        case "get_schema": {
          const schema = await resolveSchema(args.id_or_name);
          return respond(id, {
            id: schema.id,
            name: schema.data.name,
            fields: schema.data.fields || []
          });
        }

        case "get_route": {
          const route = await resolveRoute(args.id_or_path);
          return respond(id, {
            id: route.id,
            path: route.data.path,
            title: route.data.title,
            blocks: route.data.blocks || []
          });
        }

        // ─── LAYER 2: SCHEMA CRUD ────────────────────────────────────────────
        case "create_schema": {
          const { name, fields } = args;
          
          // Prevent duplicates by name
          const raw = await adapter.read('schema_definitions');
          if (raw.some(r => r.data?.name === name)) {
            throw new Error(`Schema with name '${name}' already exists.`);
          }

          const schemaId = crypto.randomUUID();
          const record = {
            id: schemaId,
            context: 'schema_definitions',
            data: {
              name,
              fields: fields.map((f: any) => ({
                id: crypto.randomUUID(),
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.required ?? false,
                section: f.section ?? 'General',
                width: 'full',
                config: {
                  relation: {
                    entity: '',
                    parentKey: 'id'
                  }
                }
              }))
            },
            updated_at: new Date().toISOString()
          };

          await adapter.write('schema_definitions', record);
          return respond(id, { id: schemaId, name, fieldCount: fields.length });
        }

        case "add_field": {
          const { schema_id_or_name, field } = args;
          const schema = await resolveSchema(schema_id_or_name);
          
          const fields = schema.data.fields || [];
          if (fields.some((f: any) => f.key === field.key)) {
            throw new Error(`Field with key '${field.key}' already exists in schema '${schema.data.name}'.`);
          }

          const newField = {
            id: crypto.randomUUID(),
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required ?? false,
            section: field.section ?? 'General',
            width: 'full',
            config: {
              relation: {
                entity: '',
                parentKey: 'id'
              }
            }
          };

          schema.data.fields = [...fields, newField];
          schema.updated_at = new Date().toISOString();
          await adapter.write('schema_definitions', schema);
          return respond(id, { schemaId: schema.id, fieldKey: field.key, totalFields: schema.data.fields.length });
        }

        case "remove_field": {
          const { schema_id_or_name, fieldKey } = args;
          const schema = await resolveSchema(schema_id_or_name);
          
          const fields = schema.data.fields || [];
          const updatedFields = fields.filter((f: any) => f.key !== fieldKey);
          if (fields.length === updatedFields.length) {
            throw new Error(`Field with key '${fieldKey}' not found in schema '${schema.data.name}'.`);
          }

          schema.data.fields = updatedFields;
          schema.updated_at = new Date().toISOString();
          await adapter.write('schema_definitions', schema);
          return respond(id, { schemaId: schema.id, removed: fieldKey, totalFields: updatedFields.length });
        }

        case "delete_schema": {
          const { schema_id_or_name } = args;
          const schema = await resolveSchema(schema_id_or_name);
          await adapter.remove('schema_definitions', schema.id);
          return respond(id, { deleted: schema.id });
        }

        // ─── LAYER 3: ROUTE/BLOCK CRUD ───────────────────────────────────────
        case "create_route": {
          const { path, title } = args;
          
          // Prevent duplicates by path
          const raw: any[] = await adapter.read('page_routes');
          if (raw.some(r => r.data?.path === path)) {
            throw new Error(`Route with path '${path}' already exists.`);
          }

          const routeId = crypto.randomUUID();
          await adapter.write('page_routes', {
            id: routeId,
            context: 'page_routes',
            data: {
              path,
              title,
              isPrivate: false,
              layout_mode: 'container',
              blocks: []
            },
            updated_at: new Date().toISOString()
          });
          return respond(id, { id: routeId, path, title });
        }

        case "add_block": {
          const { route_id_or_path, type, schema_id_or_name } = args;
          const route = await resolveRoute(route_id_or_path);
          
          let resolvedSchemaId: string | null = null;
          let resolvedContext: string | null = null;

          if (schema_id_or_name) {
            const schema = await resolveSchema(schema_id_or_name);
            resolvedSchemaId = schema.id;
            resolvedContext = schema.data.name;
          }

          const blockId = crypto.randomUUID();
          const newBlock = {
            id: blockId,
            type,
            schema_id: resolvedSchemaId,
            config: {},
            title: resolvedContext || type,
            context: resolvedContext
          };

          route.data.blocks = [...(route.data.blocks || []), newBlock];
          route.updated_at = new Date().toISOString();
          await adapter.write('page_routes', route);
          return respond(id, { routeId: route.id, blockId, type, schema_id: resolvedSchemaId });
        }

        case "update_block": {
          const { route_id_or_path, blockId, patch } = args;
          const route = await resolveRoute(route_id_or_path);
          const blocks = route.data.blocks || [];
          const idx = blocks.findIndex((b: any) => b.id === blockId || b.blockId === blockId);
          if (idx === -1) throw new Error(`Block '${blockId}' not found in route '${route.data.path}'.`);
          blocks[idx] = { ...blocks[idx], ...patch };
          route.data.blocks = blocks;
          route.updated_at = new Date().toISOString();
          await adapter.write('page_routes', route);
          return respond(id, { routeId: route.id, blockId, patched: Object.keys(patch) });
        }

        case "remove_block": {
          const { route_id_or_path, blockId } = args;
          const route = await resolveRoute(route_id_or_path);
          
          const blocks = route.data.blocks || [];
          const updatedBlocks = blocks.filter((b: any) => b.id !== blockId && b.blockId !== blockId);
          if (blocks.length === updatedBlocks.length) {
            throw new Error(`Block with ID '${blockId}' not found in route '${route.data.path}'.`);
          }

          route.data.blocks = updatedBlocks;
          route.updated_at = new Date().toISOString();
          await adapter.write('page_routes', route);
          return respond(id, { routeId: route.id, removed: blockId });
        }

        case "delete_route": {
          const { route_id_or_path } = args;
          const route = await resolveRoute(route_id_or_path);
          await adapter.remove('page_routes', route.id);
          return respond(id, { deleted: route.id });
        }

        // ─── LAYER 4: RECORDS ────────────────────────────────────────────────
        case "create_record": {
          const { context, data } = args;
          const recordId = crypto.randomUUID();
          const saved = await adapter.write(context, {
            id: recordId,
            data
          });
          return respond(id, { id: saved.id, context, data: saved.data });
        }

        case "update_record": {
          const { context, id: recordId, data_patch } = args;
          const raw: any[] = await adapter.read(context);
          const record = raw.find(r => r.id === recordId);
          if (!record) {
            throw new Error(`Record with ID '${recordId}' not found in context '${context}'.`);
          }

          const updatedData = {
            ...record.data,
            ...data_patch
          };

          const saved = await adapter.write(context, {
            id: recordId,
            data: updatedData
          });
          return respond(id, { id: saved.id, context, data: saved.data });
        }

        case "delete_record": {
          const { context, id: recordId } = args;
          const raw: any[] = await adapter.read(context);
          const record = raw.find(r => r.id === recordId);
          if (!record) {
            throw new Error(`Record with ID '${recordId}' not found in context '${context}'.`);
          }

          await adapter.remove(context, recordId);
          return respond(id, { deleted: recordId });
        }

        // ─── LAYER 5: SCRIPTS ────────────────────────────────────────────────
        case "list_scripts": {
          const raw: any[] = await adapter.read('scripts');
          const scripts = raw.map(r => ({
            id: r.id,
            name: r.data?.name || '',
            preview: (r.data?.code || '').split('\n').find((l: string) => l.trim()) || '(empty)',
            lineCount: (r.data?.code || '').split('\n').length
          }));
          return respond(id, { scripts });
        }

        case "get_script": {
          const { name: scriptName } = args;
          const raw: any[] = await adapter.read('scripts');
          const record = raw.find(r => r.data?.name === scriptName);
          if (!record) throw new Error(`Script not found: ${scriptName}`);
          return respond(id, { name: record.data.name, code: record.data.code });
        }

        case "write_script": {
          const { name: scriptName, code } = args;
          const raw: any[] = await adapter.read('scripts');
          const existing = raw.find(r => r.data?.name === scriptName);
          const recordId = existing?.id || crypto.randomUUID();
          await adapter.write('scripts', {
            id: recordId,
            data: { name: scriptName, code }
          });
          return respond(id, { name: scriptName, lineCount: code.split('\n').length });
        }

        case "delete_script": {
          const { name: scriptName } = args;
          const raw: any[] = await adapter.read('scripts');
          const record = raw.find(r => r.data?.name === scriptName);
          if (!record) throw new Error(`Script not found: ${scriptName}`);
          await adapter.remove('scripts', record.id);
          return respond(id, { deleted: scriptName });
        }

        // ─── LAYER 5b: SCRIPT TESTING ────────────────────────────────────────
        case "test_script": {
          const { name: scriptName, record_id, context_override } = args;

          // 1. Find script
          const allScripts: any[] = await adapter.read('scripts');
          const scriptRecord = allScripts.find(r => r.data?.name === scriptName);
          if (!scriptRecord) throw new Error(`Script not found: ${scriptName}`);
          const scriptCode = scriptRecord.data?.code || '';

          // 2. Infer context by scanning action blocks in all routes
          let inferredContext: string | undefined = context_override;
          if (!inferredContext) {
            const routes: any[] = await adapter.read('page_routes');
            outer: for (const route of routes) {
              const blocks: any[] = route.data?.blocks || [];
              const stack = [...blocks];
              while (stack.length) {
                const block = stack.shift();
                if (block?.zap === scriptName || block?.data?.zap === scriptName) {
                  inferredContext = block.context || block.data?.context;
                  break outer;
                }
                if (block?.blocks) stack.push(...block.blocks);
              }
            }
          }

          // 3. Resolve test record
          let testRecord: any = null;
          if (inferredContext) {
            const records: any[] = await adapter.read(inferredContext);
            const found = record_id
              ? records.find(r => r.id === record_id)
              : records[0];
            if (found) testRecord = found;
          }

          // 4. Build dry-run sandbox API (saveItem mocked, query uses real data)
          const events: any[] = [];
          const sandboxApi = {
            notify: {
              success: (msg: string) => events.push({ action: 'notify', type: 'success', message: msg }),
              error:   (msg: string) => events.push({ action: 'notify', type: 'error',   message: msg }),
            },
            query: async (ctx: string) => {
              const recs = await adapter.read(ctx);
              return recs.map((r: any) => ({ id: r.id, ...(r.data ?? r) }));
            },
            saveItem: async (ctx: string, payload: any) => {
              const dryItem = { id: payload.id ?? `dry-${crypto.randomUUID()}`, context: ctx, data: payload.data ?? payload };
              events.push({ action: 'DRY_RUN_saveItem', context: ctx, would_save: dryItem });
              return dryItem;
            },
            dispatchEvent: (action: string, payload: any) => {
              const preview = action === 'print_pdf'
                ? { action, html_length: payload?.html?.length ?? 0, preview: '(HTML omitted)' }
                : { action, payload };
              events.push(preview);
            },
          };

          // 5. Execute in isolated sandbox
          let execError: string | null = null;
          const sandbox: any = {
            api: sandboxApi,
            payload: { record: testRecord, context: inferredContext },
            state: {},
            promise: null,
            console: { log: console.log, error: console.error },
            errorCallback: (msg: string) => { execError = msg; },
          };

          const wrapper = `
            promise = (async () => {
              try { ${scriptCode} }
              catch (err) { errorCallback(err.message); }
            })()
          `;

          vm.createContext(sandbox);
          vm.runInNewContext(wrapper, sandbox, { timeout: 5000 });
          if (sandbox.promise) await sandbox.promise;

          return respond(id, {
            script: scriptName,
            dry_run: true,
            inferred_context: inferredContext ?? null,
            test_record_id: testRecord?.id ?? null,
            exec_error: execError,
            events,
          });
        }

        default:
          return respondError(id, `Tool not implemented: ${name}`);
      }
    } catch (error: any) {
      return respondError(id, error.message);
    }
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } };
}

// ─── STDIO LOOP ──────────────────────────────────────────────────────────────
let stdinBuffer = Buffer.alloc(0);

function parseMessages(buffer: Buffer) {
  const messages: any[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const headerEnd = buffer.indexOf('\r\n\r\n', offset, 'utf8');
    if (headerEnd === -1) break;

    const headerText = buffer.slice(offset, headerEnd).toString('utf8');
    const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      offset = headerEnd + 4;
      continue;
    }

    const contentLength = Number(contentLengthMatch[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + contentLength;
    if (buffer.length < bodyEnd) break;

    const body = buffer.slice(bodyStart, bodyEnd).toString('utf8');
    messages.push(JSON.parse(body));
    offset = bodyEnd;

    while (offset < buffer.length && (buffer[offset] === 0x0d || buffer[offset] === 0x0a || buffer[offset] === 0x20)) {
      offset++;
    }
  }

  return { messages, remainder: buffer.slice(offset) };
}

process.stdin.on('data', async (data) => {
  stdinBuffer = Buffer.concat([stdinBuffer, data]);
  const { messages, remainder } = parseMessages(stdinBuffer);
  stdinBuffer = remainder;

  for (const request of messages) {
    try {
      const response = await handleRequest(request);
      if (response) writeMcpMessage(response);
    } catch (error: any) {
      if (request?.id !== undefined) {
        writeMcpMessage({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: error?.message || 'Internal error'
          }
        });
      }
    }
  }
});
