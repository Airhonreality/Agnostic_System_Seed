export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  metadata?: Record<string, unknown>;
}

export interface AuthStrategy {
  authenticate(credentials: Record<string, unknown>): Promise<AuthUser | null>;
}
