/**
 * 🏛️ ARTEFACTO: purify-materia.ts
 * ────────────
 * CAPA: Scripts / CLI (Database Purification Oracle)
 * VERSIÓN: 1.0
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Proporcionar un script automatizado para la migración, limpieza y purificación de base de datos local (Materia JSON).
 * - Sanitizar esquemas de datos: validar IDs, corregir tipados de campos, forzar nomenclatura snake_case.
 * - Desacoplar propiedades de presentación (layout/visual) que terminen mezcladas en el ADN (esquemas).
 * 
 * ⚙️ USAGE:
 * npx tsx scripts/purify-materia.ts [--dry-run] [--strip-visuals]
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';

const DRY_RUN = process.argv.includes('--dry-run');
const STRIP_VISUALS = process.argv.includes('--strip-visuals');

interface Field {
  id?: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  section?: string;
  width?: string;
  placeholder?: string;
  [key: string]: any;
}

interface SchemaData {
  name: string;
  fields: Field[];
  [key: string]: any;
}

interface DataItem {
  id: string;
  context: string;
  data: SchemaData | Record<string, any>;
  updated_at?: string;
}

// Convert a string to snake_case
function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function purifyTenant(tenantDir: string) {
  const tenantName = path.basename(tenantDir);
  console.log(`\n🔍 Auditando Tenant: [${tenantName}]`);
  
  const dbPath = path.join(tenantDir, 'db');
  if (!fsSync.existsSync(dbPath)) {
    console.log(`ℹ️ No se encontró directorio db/ en ${tenantName}`);
    return;
  }

  const files = await fs.readdir(dbPath);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  for (const file of jsonFiles) {
    const filePath = path.join(dbPath, file);
    const namespace = file.replace('.json', '');
    
    try {
      const contentRaw = await fs.readFile(filePath, 'utf-8');
      const items: DataItem[] = JSON.parse(contentRaw);

      if (!Array.isArray(items)) {
        console.warn(`⚠️ Archivo ${file} no contiene un arreglo de DataItem. Ignorando.`);
        continue;
      }

      let mutated = false;
      const purifiedItems = items.map((item) => {
        // Clonar para evitar mutaciones directas indeseadas
        const purified = JSON.parse(JSON.stringify(item)) as DataItem;

        // 1. Garantizar UUID
        if (!purified.id) {
          purified.id = crypto.randomUUID();
          console.log(`  ✨ Generado UUID para registro en ${namespace}: ${purified.id}`);
          mutated = true;
        }

        // 2. Si es definición de esquema, purificar sus campos
        if (namespace === 'schema_definitions' && purified.data && Array.isArray(purified.data.fields)) {
          const fields = purified.data.fields as Field[];
          const purifiedFields = fields.map((field) => {
            const f = { ...field };

            // Garantizar ID de campo
            if (!f.id) {
              f.id = crypto.randomUUID();
              console.log(`  ✨ Campo [${f.key}] no tenía ID. UUID generado: ${f.id}`);
              mutated = true;
            }

            // Sanitizar clave a snake_case
            const correctKey = toSnakeCase(f.key);
            if (f.key !== correctKey) {
              console.log(`  ✏️ Renombrando clave de campo: ${f.key} -> ${correctKey}`);
              f.key = correctKey;
              mutated = true;
            }

            // Purificación del ADN (Desacoplar presentación)
            if (STRIP_VISUALS) {
              if (f.width) {
                console.log(`  🗑️ Purificando ancho visual (${f.width}) del campo [${f.key}]`);
                delete f.width;
                mutated = true;
              }
              if (f.placeholder) {
                console.log(`  🗑️ Purificando placeholder ("${f.placeholder}") del campo [${f.key}]`);
                delete f.placeholder;
                mutated = true;
              }
            }

            return f;
          });

          purified.data.fields = purifiedFields;
        }

        return purified;
      });

      if (mutated) {
        if (DRY_RUN) {
          console.log(`  🧪 [DRY RUN] Se habrían guardado los cambios en ${file}`);
        } else {
          await fs.writeFile(filePath, JSON.stringify(purifiedItems, null, 2), 'utf-8');
          console.log(`  💾 Base de datos purificada guardada: ${file}`);
        }
      } else {
        console.log(`  ✅ ${file} está limpio y en cumplimiento.`);
      }

    } catch (err) {
      console.error(`  ❌ Error al procesar archivo ${file}:`, err);
    }
  }
}

async function run() {
  console.log('==================================================');
  console.log('🏛️ AGNOSTIC SYSTEM : ORÁCULO DE PURIFICACIÓN JSON');
  console.log('==================================================');
  if (DRY_RUN) console.log('🧪 Modo DRY RUN activo. No se realizarán escrituras.');
  if (STRIP_VISUALS) console.log('✂️  Modo STRIP_VISUALS activo. Se eliminarán los atributos de layout en los esquemas.');
  console.log('--------------------------------------------------');

  const storageRoot = path.join(process.cwd(), 'storage');
  if (!fsSync.existsSync(storageRoot)) {
    console.error('❌ Error: El directorio storage/ no existe.');
    process.exit(1);
  }

  const items = await fs.readdir(storageRoot);
  for (const item of items) {
    const itemPath = path.join(storageRoot, item);
    const stat = await fs.stat(itemPath);
    
    // Ignorar archivos sueltos como system_config.json
    if (stat.isDirectory()) {
      await purifyTenant(itemPath);
    }
  }

  console.log('\n✨ Proceso de purificación finalizado.');
}

run().catch(console.error);
