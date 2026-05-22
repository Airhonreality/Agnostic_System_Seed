/**
 * Converts a token reference or static number to a CSS value string.
 * Accepts: number (→ rem), string var() reference (→ as-is), or undefined.
 */
export function resolveValue(
  value: string | number | undefined,
  suffix = 'rem'
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;   // 'var(--gap-forms)' → as-is
  if (value === 0) return '0';
  return `${value}${suffix}`;
}

/**
 * Converts a color token reference or static color to a CSS color value.
 * var() references are wrapped in hsl() because color tokens store HSL components.
 * Static values (hex, hsl(), rgb()) pass through unchanged.
 */
export function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('var('))  return `hsl(${value})`;           // token → hsl(var(--x))
  if (value.startsWith('#'))     return value;                      // hex → as-is
  if (value.startsWith('rgb'))   return value;                      // rgb/rgba → as-is
  if (value.startsWith('hsl'))   return value;                      // hsl() ya completo → as-is
  return `hsl(${value})`;                                           // "220 90% 56%" → hsl(220 90% 56%)
}

/**
 * Converts a padding array where each entry can be a number or var() reference.
 * Returns a CSS shorthand padding string.
 */
export function resolvePadding(
  padding: Array<string | number> | undefined
): string | undefined {
  if (!padding || padding.length < 4) return undefined;
  return padding.map(v => resolveValue(v) ?? '0').join(' ');
}
