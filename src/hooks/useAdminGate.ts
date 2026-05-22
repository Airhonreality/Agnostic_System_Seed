import { useSystemStore } from '@/lib/agnostic/store';

export function useAdminGate(): boolean {
  return useSystemStore((s) => s.user?.role === 'admin');
}
