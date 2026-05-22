import { useState, useEffect } from 'react';

/**
 * 🛠️ HOOK: useDebounce.ts
 * ────────────
 * CAPA: Hooks (Shared Utilities)
 * VERSIÓN: 1.0
 * 
 * 🎯 FUNCTIONAL_SCOPE:
 * - Retrasar la actualización de un valor hasta que haya transcurrido un tiempo de espera.
 * - Ideal para operaciones de autoguardado y búsqueda en tiempo real.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
