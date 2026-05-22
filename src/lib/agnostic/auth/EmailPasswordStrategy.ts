import { AuthStrategy, AuthUser } from './AuthStrategy';

export class EmailPasswordStrategy implements AuthStrategy {
  constructor(private readonly getUsers: () => any[]) {}

  async authenticate(credentials: Record<string, unknown>): Promise<AuthUser | null> {
    const { email, password } = credentials as { email: string; password: string };
    const users = this.getUsers();
    const found = users.find(
      (u: any) => u.data?.email === email && u.data?.password === password
    );
    if (!found) return null;

    const type: string[] = (found.data?.type as string[]) ?? [];
    const role = type.includes('admin') ? 'admin' : (type[0] ?? 'viewer');

    return {
      id: found.id,
      email: found.data.email as string,
      name: (found.data.name as string) ?? email,
      role,
      metadata: { type },
    };
  }
}
