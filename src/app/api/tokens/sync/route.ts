import { NextRequest, NextResponse } from 'next/server';
import { getStrategy } from '@/server/getStrategy';
import { getSiloPath } from '@/server/activeProject';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/tokens/sync
 * Reads all design_tokens records and regenerates tokens.css for the active tenant.
 * Called by TokensEditor after every token save or delete.
 */
export async function POST(_req: NextRequest) {
  try {
    const strategy = await getStrategy();
    const tokens = await strategy.read('design_tokens');

    const lines = tokens
      .filter((t: any) => t.data?.name && t.data?.value)
      .map((t: any) => `  --${t.data.name}: ${t.data.value};`);

    const css = [
      '/* Agnostic Design Tokens — generated file, do not edit manually */',
      ':root {',
      ...lines,
      '}',
      '',
    ].join('\n');

    const siloPath = getSiloPath();
    const stylesDir = path.join(siloPath, 'styles');
    await fs.mkdir(stylesDir, { recursive: true });
    await fs.writeFile(path.join(stylesDir, 'tokens.css'), css, 'utf-8');

    return NextResponse.json({ ok: true, count: lines.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
